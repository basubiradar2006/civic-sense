import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ComplaintLike from "../components/ComplaintLike";
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
    StatCard,
    StatusBadge,
    StatusTimeline,
    ToastStack,
} from "../components/ui";
import { AuthError, api, clearSession, getStoredUser, upsertById } from "../lib/api";
import { describeEvent } from "../lib/events";
import {
    CATEGORIES,
    complaintCode,
    isOpen,
    reportCount,
    shortAddress,
    statusLabel,
    timeAgo,
} from "../lib/format";
import { useRealtime } from "../lib/useRealtime";
import { useToasts } from "../lib/useToasts";
import "../styles/Dashboard.css";

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

function Citizen() {
    const navigate = useNavigate();
    const user = useMemo(() => getStoredUser(), []);
    const myId = user?.userId ?? user?.id;

    const [mine, setMine] = useState([]);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [view, setView] = useState("MINE");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [category, setCategory] = useState("ALL");

    const [media, setMedia] = useState(null);
    const [flashIds, setFlashIds] = useState([]);
    const [activity, setActivity] = useState([]);
    const { toasts, push, dismiss } = useToasts();

    // =====================================================
    // LOAD
    // =====================================================

    const load = useCallback(async () => {
        try {
            const [my, recent] = await Promise.all([
                api("/api/complaints/my"),
                api("/api/complaints/recent"),
            ]);
            setMine(Array.isArray(my) ? my : []);
            setFeed(Array.isArray(recent) ? recent : []);
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
        if (!c) return;

        const isMine = c.user?.id === myId;

        // ---- my own complaints ----
        if (isMine) {
            setMine((list) => upsertById(list, c));
        }

        // A master changed: mirror it on my merged reports
        if (!c.mergedIntoId) {
            setMine((list) => {
                let touched = false;
                const next = list.map((item) => {
                    if (item.mergedIntoId !== c.id) return item;
                    touched = true;
                    return {
                        ...item,
                        status: c.status,
                        reportCount: c.reportCount,
                        severityScore: c.severityScore,
                        severityLevel: c.severityLevel,
                        priority: c.priority,
                        contractor: c.contractor,
                    };
                });
                return touched ? next : list;
            });
        }

        // ---- community feed (master complaints only) ----
        if (!c.mergedIntoId) {
            setFeed((list) => {
                const exists = list.some((x) => x.id === c.id);
                if (!exists && event.type !== "CREATED") return list;
                return upsertById(list, c).slice(0, 30);
            });
        }

        // ---- announce changes that concern me ----
        const affectsMe =
            isMine || mine.some((m) => m.mergedIntoId === c.id || m.id === c.id);

        if (affectsMe && (event.type === "UPDATED" || event.type === "ESCALATED")) {
            push(`${complaintCode(c)} — ${statusLabel(c.status)}`, "success");
            flash(c.id);
            mine.filter((m) => m.mergedIntoId === c.id).forEach((m) => flash(m.id));
        }

        if (affectsMe && event.type === "MERGED") {
            push(`${reportCount(c)} citizens have now reported ${complaintCode(c)}`, "warn");
        }

        const described = describeEvent(event);
        if (described && (affectsMe || event.type === "CREATED")) {
            setActivity((items) =>
                [{ ...described, key: `${event.at}-${c.id}-${event.type}`, at: new Date().toISOString(), id: c.id }, ...items].slice(0, 30)
            );
        }
    }, load);

    // Fallback refresh when the live stream is down
    useEffect(() => {
        if (live === "live") return undefined;
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
    }, [live, load]);

    // =====================================================
    // DERIVED
    // =====================================================

    const stats = useMemo(() => {
        const open = mine.filter(isOpen);
        return {
            total: mine.length,
            open: open.length,
            active: mine.filter((c) => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)).length,
            resolved: mine.filter((c) => !isOpen(c)).length,
            coReported: mine.filter((c) => reportCount(c) > 1).length,
        };
    }, [mine]);

    const list = view === "MINE" ? mine : feed;

    const visible = list.filter((c) => {
        if (category !== "ALL" && c.category !== category) return false;
        if (statusFilter === "OPEN" && !isOpen(c)) return false;
        if (statusFilter === "CLOSED" && isOpen(c)) return false;
        return true;
    });

    const logout = () => {
        clearSession();
        navigate("/");
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="cp-app">
            <AppHeader role="Citizen" user={user} live={live} onLogout={logout}>
                <ActivityBell
                    items={activity}
                    onSelect={(item) => navigate(`/report/${item.id}`)}
                />
            </AppHeader>

            <main className="cp-main">
                <section className="cp-hero">
                    <div>
                        <div className="cp-eyebrow">Citizen dashboard</div>
                        <h1>
                            {greeting()}, {(user?.name || "there").split(" ")[0]}
                        </h1>
                        <p>
                            Report problems in your area and follow every repair live.
                            If someone already reported the same issue, your report is
                            added to theirs, so it gets fixed faster.
                        </p>
                    </div>
                    <div className="cp-hero-actions">
                        <button
                            className="cp-btn cp-btn-ghost"
                            onClick={() => navigate("/nearby-complaints")}
                        >
                            <Icon name="pin" size={16} /> Issues near me
                        </button>
                        <button
                            className="cp-btn cp-btn-primary"
                            onClick={() => navigate("/complaint")}
                        >
                            <Icon name="plus" size={16} /> Report an issue
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="cp-error">
                        <Icon name="alert" /> {error}
                        <button className="cp-btn cp-btn-sm cp-btn-ghost" onClick={load}>
                            Retry
                        </button>
                    </div>
                )}

                <section className="cp-stats">
                    <StatCard label="My reports" value={stats.total} hint="All time" icon="layers" />
                    <StatCard label="Open" value={stats.open} hint="Waiting or being fixed" tone="medium" icon="clock" />
                    <StatCard label="Being repaired" value={stats.active} hint="Contractor on it" tone="high" icon="wrench" />
                    <StatCard label="Fixed" value={stats.resolved} hint="Completed or resolved" tone="low" icon="check" />
                    <StatCard label="Co-reported" value={stats.coReported} hint="Others reported it too" tone="info" icon="users" />
                </section>

                <section className="cp-panel">
                    <div className="cp-panel-head">
                        <div className="cp-tabs">
                            <button
                                className={`cp-tab ${view === "MINE" ? "is-active" : ""}`}
                                onClick={() => setView("MINE")}
                            >
                                My reports <b>{mine.length}</b>
                            </button>
                            <button
                                className={`cp-tab ${view === "FEED" ? "is-active" : ""}`}
                                onClick={() => setView("FEED")}
                            >
                                Community feed <b>{feed.length}</b>
                            </button>
                        </div>

                        <div className="cp-filters">
                            <select
                                className="cp-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All statuses</option>
                                <option value="OPEN">Open</option>
                                <option value="CLOSED">Fixed</option>
                            </select>
                            <select
                                className="cp-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="ALL">All categories</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonList rows={3} />
                    ) : visible.length === 0 ? (
                        <EmptyState
                            icon={view === "MINE" ? "camera" : "layers"}
                            title={view === "MINE" ? "No reports yet" : "Nothing in the feed yet"}
                        >
                            {view === "MINE"
                                ? "Spotted a pothole, broken light or overflowing drain? Report it with a photo and we'll track it for you."
                                : "New reports from your city will show up here in real time."}
                        </EmptyState>
                    ) : (
                        <div className="cp-card-grid">
                            {visible.map((c) => (
                                <CitizenCard
                                    key={c.id}
                                    complaint={c}
                                    mine={view === "MINE"}
                                    flash={flashIds.includes(c.id)}
                                    onMedia={setMedia}
                                    onOpen={() => navigate(`/report/${c.id}`, { state: { complaint: c } })}
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

function CitizenCard({ complaint: c, mine, flash, onMedia, onOpen }) {
    const count = reportCount(c);

    return (
        <article className={`cp-card ${flash ? "cp-flash" : ""}`}>
            <div className="cp-card-media">
                <MediaThumb complaint={c} onOpen={onMedia} />
                <div className="cp-card-media-tags">
                    <SeverityBadge complaint={c} />
                </div>
            </div>

            <div className="cp-card-body">
                <div className="cp-card-meta">
                    <span>{complaintCode(c)}</span>
                    <span>·</span>
                    <span>{timeAgo(c.createdAt) || c.capturedAt}</span>
                </div>

                <div className="cp-card-title">
                    <h3>{c.category || "Issue"}</h3>
                    <StatusBadge status={c.status} />
                </div>

                <div className="cp-card-loc">
                    <Icon name="pin" size={14} />
                    <span>{shortAddress(c)}</span>
                </div>

                {c.description && <p className="cp-card-desc">{c.description}</p>}

                {count > 1 && (
                    <div className="cp-co-report">
                        <ReportCount complaint={c} compact />
                        <span>
                            {mine
                                ? `You and ${count - 1} other${count - 1 === 1 ? "" : "s"} reported this`
                                : `${count} citizens reported this`}
                        </span>
                    </div>
                )}

                <StatusTimeline status={c.status} />
            </div>

            <div className="cp-card-foot">
                {!mine && !c.mergedIntoId ? (
                    <ComplaintLike
                        complaintId={c.id}
                        initialLikeCount={c.likeCount}
                        initialLiked={c.liked}
                    />
                ) : (
                    <span className="cp-muted">
                        {c.contractor?.name ? `Contractor: ${c.contractor.name}` : ""}
                    </span>
                )}
                <button className="cp-btn cp-btn-sm cp-btn-ghost" onClick={onOpen}>
                    Details <Icon name="chevron" size={14} />
                </button>
            </div>
        </article>
    );
}

export default Citizen;
