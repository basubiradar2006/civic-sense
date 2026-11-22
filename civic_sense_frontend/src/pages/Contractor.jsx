import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
    ActivityBell,
    AppHeader,
    EmptyState,
    Icon,
    MediaModal,
    MediaThumb,
    ReportCount,
    SeverityBadge,
    SkeletonList,
    Spinner,
    StatCard,
    StatusBadge,
    StatusTimeline,
    ToastStack,
} from "../components/ui";
import { AuthError, api, clearSession, getStoredUser, upsertById } from "../lib/api";
import {
    bySeverity,
    complaintCode,
    isOpen,
    mapsUrl,
    reportCount,
    severityOf,
    shortAddress,
    slaInfo,
    statusLabel,
    timeAgo,
} from "../lib/format";
import { useRealtime } from "../lib/useRealtime";
import { useToasts } from "../lib/useToasts";
import "../styles/Dashboard.css";

const TABS = {
    QUEUE: { label: "Work queue", match: (c) => ["ASSIGNED", "IN_PROGRESS"].includes(c.status) },
    SIGNOFF: { label: "Awaiting sign-off", match: (c) => c.status === "COMPLETED" },
    DONE: { label: "Resolved", match: (c) => c.status === "RESOLVED" },
};

// In-progress first, then by severity, then by deadline
const byUrgency = (a, b) =>
    (b.status === "IN_PROGRESS") - (a.status === "IN_PROGRESS") ||
    bySeverity(a, b) ||
    new Date(a.dueAt || 8.64e15) - new Date(b.dueAt || 8.64e15);

function Contractor() {
    const navigate = useNavigate();
    const user = useMemo(() => getStoredUser(), []);
    const myId = user?.userId ?? user?.id;

    const [jobs, setJobs] = useState([]);
    const [area, setArea] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("QUEUE");
    const [busy, setBusy] = useState("");
    const [media, setMedia] = useState(null);
    const [flashIds, setFlashIds] = useState([]);
    const [activity, setActivity] = useState([]);
    const { toasts, push, dismiss } = useToasts();

    // =====================================================
    // LOAD
    // =====================================================

    const load = useCallback(async () => {
        try {
            const [assigned, all] = await Promise.all([
                api("/api/complaints/assigned"),
                api("/api/complaints"),
            ]);
            setJobs(Array.isArray(assigned) ? assigned : []);
            setArea(Array.isArray(all) ? all.filter(isOpen) : []);
            setError("");
        } catch (err) {
            if (err instanceof AuthError) {
                navigate("/");
                return;
            }
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!user) {
            navigate("/");
            return;
        }
        // Initial data fetch; state is only set after the request resolves
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, navigate, user]);

    // =====================================================
    // REAL-TIME
    // =====================================================

    const flash = (id) => {
        setFlashIds((ids) => [...ids, id]);
        setTimeout(() => setFlashIds((ids) => ids.filter((x) => x !== id)), 2500);
    };

    const live = useRealtime((event) => {
        const c = event.complaint;
        if (!c || c.mergedIntoId) return;

        const assignedToMe = c.contractor?.id === myId;
        const known = jobs.some((j) => j.id === c.id);

        if (assignedToMe) {
            setJobs((list) => upsertById(list, c));
            if (!known && c.status === "ASSIGNED") {
                push(`New job assigned: ${complaintCode(c)} · ${c.category}`, "warn");
                setActivity((items) => [
                    { key: `${event.at}-${c.id}`, at: new Date().toISOString(), id: c.id, tone: "warn", text: `New job ${complaintCode(c)} — ${c.category}` },
                    ...items,
                ].slice(0, 30));
                flash(c.id);
            } else if (known && event.type === "UPDATED") {
                const before = jobs.find((j) => j.id === c.id);
                if (before?.status !== c.status) {
                    push(`${complaintCode(c)} is now ${statusLabel(c.status)}`, "success");
                    setActivity((items) => [
                        { key: `${event.at}-${c.id}`, at: new Date().toISOString(), id: c.id, tone: "success", text: `${complaintCode(c)} — ${statusLabel(c.status)}` },
                        ...items,
                    ].slice(0, 30));
                    flash(c.id);
                }
            } else if (known && event.type === "MERGED") {
                push(`${complaintCode(c)} now has ${reportCount(c)} citizen reports`, "info");
            }
        } else if (known) {
            // Reassigned to someone else
            setJobs((list) => list.filter((j) => j.id !== c.id));
            push(`${complaintCode(c)} was reassigned`, "info");
        }

        setArea((list) => (isOpen(c) ? upsertById(list, c) : list.filter((x) => x.id !== c.id)));
    }, load);

    useEffect(() => {
        if (live === "live") return undefined;
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
    }, [live, load]);

    // =====================================================
    // ACTIONS
    // =====================================================

    const transition = async (job, action, message) => {
        setBusy(`${action}-${job.id}`);
        try {
            const updated = await api(`/api/complaints/${job.id}/${action}`, { method: "PUT" });
            setJobs((list) => upsertById(list, updated));
            push(message, "success");
        } catch (err) {
            if (err instanceof AuthError) {
                navigate("/");
                return;
            }
            push(err.message, "danger");
        } finally {
            setBusy("");
        }
    };

    const logout = () => {
        clearSession();
        navigate("/");
    };

    // =====================================================
    // DERIVED
    // =====================================================

    const stats = useMemo(() => {
        const open = jobs.filter((j) => ["ASSIGNED", "IN_PROGRESS"].includes(j.status));
        return {
            toStart: jobs.filter((j) => j.status === "ASSIGNED").length,
            active: jobs.filter((j) => j.status === "IN_PROGRESS").length,
            signoff: jobs.filter((j) => j.status === "COMPLETED").length,
            done: jobs.filter((j) => j.status === "RESOLVED").length,
            overdue: open.filter((j) => slaInfo(j).tone === "breached").length,
            people: open.reduce((s, j) => s + reportCount(j), 0),
        };
    }, [jobs]);

    const visible = tab === "AREA"
        ? [...area].sort(bySeverity)
        : jobs.filter(TABS[tab].match).sort(byUrgency);

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="cp-app">
            <AppHeader role="Contractor" user={user} live={live} onLogout={logout}>
                <ActivityBell items={activity} onSelect={() => setTab("QUEUE")} />
            </AppHeader>

            <main className="cp-main">
                <section className="cp-hero">
                    <div>
                        <div className="cp-eyebrow">Field operations</div>
                        <h1>My work orders</h1>
                        <p>
                            Jobs are ordered by urgency. Start work on site, upload
                            photo proof, then mark the job complete for the officer to sign off.
                        </p>
                    </div>
                </section>

                {error && (
                    <div className="cp-error">
                        <Icon name="alert" /> {error}
                        <button className="cp-btn cp-btn-sm cp-btn-ghost" onClick={load}>Retry</button>
                    </div>
                )}

                <section className="cp-stats">
                    <StatCard label="To start" value={stats.toStart} hint="Newly assigned" tone="info" icon="bolt" />
                    <StatCard label="In progress" value={stats.active} hint="Work on site" tone="high" icon="wrench" />
                    <StatCard label="Awaiting sign-off" value={stats.signoff} hint="Officer review" tone="primary" icon="eye" />
                    <StatCard label="Resolved" value={stats.done} hint="Signed off" tone="low" icon="check" />
                    <StatCard label="Overdue" value={stats.overdue} hint="Past SLA deadline" tone="critical" icon="clock" />
                    <StatCard label="Citizens waiting" value={stats.people} hint="Reports on open jobs" tone="medium" icon="users" />
                </section>

                <section className="cp-panel">
                    <div className="cp-panel-head">
                        <div className="cp-tabs">
                            {Object.entries(TABS).map(([key, t]) => (
                                <button
                                    key={key}
                                    className={`cp-tab ${tab === key ? "is-active" : ""}`}
                                    onClick={() => setTab(key)}
                                >
                                    {t.label} <b>{jobs.filter(t.match).length}</b>
                                </button>
                            ))}
                            <button
                                className={`cp-tab ${tab === "AREA" ? "is-active" : ""}`}
                                onClick={() => setTab("AREA")}
                            >
                                City overview <b>{area.length}</b>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonList rows={3} />
                    ) : visible.length === 0 ? (
                        <EmptyState icon={tab === "QUEUE" ? "wrench" : "layers"} title={tab === "QUEUE" ? "No active jobs" : "Nothing here"}>
                            {tab === "QUEUE"
                                ? "When an officer assigns you a job it appears here instantly, no refresh needed."
                                : "Jobs move here as they progress."}
                        </EmptyState>
                    ) : tab === "AREA" ? (
                        <div className="cp-card-grid">
                            {visible.map((c) => (
                                <AreaCard key={c.id} complaint={c} mine={c.contractor?.id === myId} onMedia={setMedia} />
                            ))}
                        </div>
                    ) : (
                        <div className="cp-jobs">
                            {visible.map((job) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    busy={busy}
                                    flash={flashIds.includes(job.id)}
                                    onMedia={setMedia}
                                    onStart={() => transition(job, "start", `Work started on ${complaintCode(job)}`)}
                                    onComplete={() => transition(job, "complete", `${complaintCode(job)} sent for sign-off`)}
                                    onToast={push}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <MediaModal complaint={media} onClose={() => setMedia(null)} />
            <ToastStack toasts={toasts} onDismiss={dismiss} />
        </div>
    );
}

// =====================================================
// JOB CARD
// =====================================================

function JobCard({ job, busy, flash, onMedia, onStart, onComplete, onToast }) {
    const sla = slaInfo(job);
    const map = mapsUrl(job);
    const count = reportCount(job);

    const [photos, setPhotos] = useState([]);
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const showProof = ["IN_PROGRESS", "COMPLETED", "RESOLVED"].includes(job.status);

    useEffect(() => {
        if (!showProof) return undefined;
        let cancelled = false;
        api(`/api/complaints/${job.id}/work-photos`)
            .then((data) => !cancelled && setPhotos(Array.isArray(data) ? data : []))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [job.id, showProof]);

    const upload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        try {
            const urls = [];
            for (const { file } of files) {
                const ext = file.name?.split(".").pop() || "jpg";
                const path = `work-photos/${job.id}/work-${job.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

                const { error } = await supabase.storage
                    .from("evidence")
                    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
                if (error) throw new Error("Photo upload failed. Please try again.");

                const { data } = supabase.storage.from("evidence").getPublicUrl(path);
                if (!data?.publicUrl) throw new Error("Could not get the uploaded photo URL.");
                urls.push(data.publicUrl);
            }

            const saved = await api(`/api/complaints/${job.id}/work-photos`, {
                method: "POST",
                body: { photoUrls: urls },
            });
            setPhotos(Array.isArray(saved) ? saved : photos);
            files.forEach((f) => URL.revokeObjectURL(f.url));
            setFiles([]);
            onToast(`${urls.length} proof photo${urls.length === 1 ? "" : "s"} uploaded`, "success");
        } catch (err) {
            onToast(err.message, "danger");
        } finally {
            setUploading(false);
        }
    };

    return (
        <article className={`cp-job ${flash ? "cp-flash" : ""} cp-job-${severityOf(job).toLowerCase()}`}>
            <div className="cp-job-media">
                <MediaThumb complaint={job} onOpen={onMedia} />
            </div>

            <div className="cp-job-body">
                <div className="cp-card-meta">
                    <span>{complaintCode(job)}</span>
                    <span>·</span>
                    <span>reported {timeAgo(job.createdAt)}</span>
                </div>

                <div className="cp-card-title">
                    <h3>{job.category}</h3>
                    <SeverityBadge complaint={job} />
                    <StatusBadge status={job.status} />
                </div>

                <div className="cp-job-facts">
                    <span><Icon name="pin" size={14} /> {shortAddress(job)}</span>
                    <span className={`cp-chip cp-chip-${sla.tone}`}><Icon name="clock" size={11} /> {sla.label}</span>
                    <span>
                        <ReportCount complaint={job} compact /> {count === 1 ? "1 citizen affected" : `${count} citizens reported this`}
                    </span>
                </div>

                {job.description && <p className="cp-card-desc">{job.description}</p>}

                <StatusTimeline status={job.status} />

                {showProof && (
                    <div className="cp-proof">
                        <div className="cp-section-title">
                            <span>Proof of work</span>
                            <span className="cp-muted">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className="cp-proof-strip">
                            {photos.map((p) => (
                                <button key={p.id} className="cp-proof-photo" onClick={() => onMedia({ ...job, mediaUrl: p.photoUrl, mediaType: "IMAGE" })}>
                                    <img src={p.photoUrl} alt="Work proof" loading="lazy" />
                                </button>
                            ))}
                            {files.map((f, i) => (
                                <span key={f.url} className="cp-proof-photo cp-proof-pending">
                                    <img src={f.url} alt={f.file.name} />
                                    <button
                                        onClick={() => {
                                            URL.revokeObjectURL(f.url);
                                            setFiles(files.filter((_, x) => x !== i));
                                        }}
                                        aria-label="Remove"
                                    >
                                        <Icon name="x" size={12} />
                                    </button>
                                </span>
                            ))}
                            {job.status === "IN_PROGRESS" && (
                                <button className="cp-proof-add" onClick={() => inputRef.current?.click()}>
                                    <Icon name="camera" size={18} />
                                    Add
                                </button>
                            )}
                        </div>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            hidden
                            onChange={(e) => {
                                const picked = Array.from(e.target.files || [])
                                    .filter((f) => f.type.startsWith("image/"))
                                    .map((file) => ({ file, url: URL.createObjectURL(file) }));
                                setFiles((prev) => [...prev, ...picked]);
                                e.target.value = "";
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="cp-job-actions">
                {map && (
                    <a className="cp-btn cp-btn-ghost" href={map} target="_blank" rel="noreferrer">
                        <Icon name="pin" size={16} /> Navigate
                    </a>
                )}

                {job.status === "ASSIGNED" && (
                    <button className="cp-btn cp-btn-dark" onClick={onStart} disabled={!!busy}>
                        {busy === `start-${job.id}` ? <Spinner /> : <Icon name="play" size={15} />} Start work
                    </button>
                )}

                {job.status === "IN_PROGRESS" && (
                    <>
                        {files.length > 0 && (
                            <button className="cp-btn cp-btn-ghost" onClick={upload} disabled={uploading}>
                                {uploading ? <Spinner /> : <Icon name="upload" size={16} />} Upload {files.length}
                            </button>
                        )}
                        <button
                            className="cp-btn cp-btn-primary"
                            onClick={onComplete}
                            disabled={!!busy || uploading || photos.length === 0}
                            title={photos.length === 0 ? "Upload at least one proof photo first" : ""}
                        >
                            {busy === `complete-${job.id}` ? <Spinner /> : <Icon name="check" size={16} />} Mark complete
                        </button>
                    </>
                )}

                {job.status === "COMPLETED" && (
                    <span className="cp-muted cp-wait">
                        <Icon name="eye" size={14} /> Waiting for officer sign-off
                    </span>
                )}
            </div>
        </article>
    );
}

function AreaCard({ complaint: c, mine, onMedia }) {
    return (
        <article className="cp-card cp-card-compact">
            <div className="cp-card-media">
                <MediaThumb complaint={c} onOpen={onMedia} />
                <div className="cp-card-media-tags">
                    <SeverityBadge complaint={c} />
                </div>
            </div>
            <div className="cp-card-body">
                <div className="cp-card-meta">
                    <span>{complaintCode(c)}</span>
                    {mine && <span className="cp-chip cp-chip-ok">Your job</span>}
                </div>
                <div className="cp-card-title">
                    <h3>{c.category}</h3>
                    <StatusBadge status={c.status} />
                </div>
                <div className="cp-card-loc">
                    <Icon name="pin" size={14} />
                    <span>{shortAddress(c)}</span>
                </div>
                <div className="cp-co-report">
                    <ReportCount complaint={c} />
                </div>
            </div>
        </article>
    );
}

export default Contractor;
