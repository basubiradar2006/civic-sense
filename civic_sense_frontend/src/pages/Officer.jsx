import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HazardEvidenceFields from "../components/HazardEvidenceFields";
import {
    ActivityBell,
    AppHeader,
    EmptyState,
    Icon,
    MediaModal,
    MediaThumb,
    ReportCount,
    SeverityBadge,
    SeverityBreakdown,
    SkeletonList,
    Spinner,
    StatCard,
    StatusBadge,
    ToastStack,
} from "../components/ui";
import { AuthError, api, clearSession, getStoredUser, upsertById } from "../lib/api";
import { describeEvent } from "../lib/events";
import {
    CATEGORIES,
    SEVERITY_ORDER,
    bySeverity,
    complaintCode,
    isOpen,
    mapsUrl,
    personName,
    reportCount,
    severityOf,
    severityScore,
    shortAddress,
    slaInfo,
    timeAgo,
} from "../lib/format";
import { useRealtime } from "../lib/useRealtime";
import { useToasts } from "../lib/useToasts";
import "../styles/Dashboard.css";

// Work queues shown as tabs
const QUEUES = {
    ACTION: { label: "Needs action", match: (c) => ["PENDING", "VERIFIED", "COMPLETED"].includes(c.status) },
    FIELD: { label: "In the field", match: (c) => ["ASSIGNED", "IN_PROGRESS"].includes(c.status) },
    RESOLVED: { label: "Resolved", match: (c) => c.status === "RESOLVED" },
    ALL: { label: "All", match: () => true },
};

const SORTS = {
    severity: (a, b) => bySeverity(a, b) || b.id - a.id,
    reports: (a, b) => reportCount(b) - reportCount(a) || (severityScore(b) ?? 0) - (severityScore(a) ?? 0),
    newest: (a, b) => b.id - a.id,
    sla: (a, b) => new Date(a.dueAt || 8.64e15) - new Date(b.dueAt || 8.64e15),
};

function isOverdue(c) {
    return isOpen(c) && (c.escalated || (c.dueAt && new Date(c.dueAt) < new Date()));
}

function Officer() {
    const navigate = useNavigate();
    const user = useMemo(() => getStoredUser(), []);

    const [complaints, setComplaints] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [queue, setQueue] = useState("ACTION");
    const [quick, setQuick] = useState(null); // stat-card filter
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("ALL");
    const [severity, setSeverity] = useState("ALL");
    const [sort, setSort] = useState("severity");

    const [selectedId, setSelectedId] = useState(null);
    const [media, setMedia] = useState(null);
    const [flashIds, setFlashIds] = useState([]);
    const [activity, setActivity] = useState([]);
    const [busy, setBusy] = useState("");
    const { toasts, push, dismiss } = useToasts();

    // =====================================================
    // LOAD
    // =====================================================

    const load = useCallback(async () => {
        try {
            const [list, people] = await Promise.all([
                api("/api/complaints"),
                api("/api/users/contractors"),
            ]);
            setComplaints(Array.isArray(list) ? list : []);
            setContractors(Array.isArray(people) ? people : []);
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
        if (!c || c.mergedIntoId) return; // officers work on master complaints only

        setComplaints((list) => upsertById(list, c));

        if (event.type === "MERGED") {
            // A manual merge can also hide another complaint: refresh quietly
            load();
        }

        if (event.type !== "SEVERITY") {
            flash(c.id);
        }

        const described = describeEvent(event);
        if (described) {
            setActivity((items) =>
                [{ ...described, key: `${event.at}-${c.id}-${event.type}`, at: new Date().toISOString(), id: c.id }, ...items].slice(0, 40)
            );
            if (event.type === "CREATED" || event.type === "MERGED" || event.type === "ESCALATED") {
                push(described.text, described.tone);
            }
        }
    }, load);

    useEffect(() => {
        if (live === "live") return undefined;
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
    }, [live, load]);

    // =====================================================
    // DERIVED
    // =====================================================

    const open = useMemo(() => complaints.filter(isOpen), [complaints]);

    const stats = useMemo(() => ({
        open: open.length,
        critical: open.filter((c) => severityOf(c) === "CRITICAL").length,
        pending: complaints.filter((c) => c.status === "PENDING").length,
        unassigned: complaints.filter((c) => c.status === "VERIFIED").length,
        signoff: complaints.filter((c) => c.status === "COMPLETED").length,
        overdue: open.filter(isOverdue).length,
        citizens: open.reduce((sum, c) => sum + reportCount(c), 0),
        merged: complaints.reduce((sum, c) => sum + reportCount(c) - 1, 0),
    }), [complaints, open]);

    const distribution = useMemo(() => {
        const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
        open.forEach((c) => {
            counts[severityOf(c)] = (counts[severityOf(c)] || 0) + 1;
        });
        return counts;
    }, [open]);

    const byCategory = useMemo(() => {
        const counts = {};
        open.forEach((c) => {
            const key = c.category || "Other";
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    }, [open]);

    const hotspots = useMemo(
        () => [...open].filter((c) => reportCount(c) > 1).sort(SORTS.reports).slice(0, 5),
        [open]
    );

    const QUICK = {
        critical: (c) => isOpen(c) && severityOf(c) === "CRITICAL",
        pending: (c) => c.status === "PENDING",
        unassigned: (c) => c.status === "VERIFIED",
        signoff: (c) => c.status === "COMPLETED",
        overdue: isOverdue,
        open: isOpen,
    };

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return complaints
            .filter(quick ? QUICK[quick] : QUEUES[queue].match)
            .filter((c) => category === "ALL" || c.category === category)
            .filter((c) => severity === "ALL" || severityOf(c) === severity)
            .filter((c) =>
                !q ||
                [complaintCode(c), c.category, c.address, c.description, personName(c.user)]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(q))
            )
            .sort(SORTS[sort]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complaints, queue, quick, category, severity, search, sort]);

    const selected = complaints.find((c) => c.id === selectedId) || visible[0] || null;

    const queueCount = (key) => complaints.filter(QUEUES[key].match).length;

    // =====================================================
    // ACTIONS
    // =====================================================

    const run = async (key, fn, success) => {
        setBusy(key);
        try {
            const updated = await fn();
            if (updated && updated.id) {
                setComplaints((list) => upsertById(list, updated));
            }
            if (success) push(success, "success");
            return true;
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

    const verify = (c) =>
        run(`verify-${c.id}`, () => api(`/api/complaints/${c.id}/verify`, { method: "PUT" }), `${complaintCode(c)} verified`);

    const assign = (c, contractorId) =>
        run(
            `assign-${c.id}`,
            () => api(`/api/complaints/${c.id}/assign/${contractorId}`, { method: "PUT" }),
            `${complaintCode(c)} assigned`
        );

    const resolve = (c) =>
        run(`resolve-${c.id}`, () => api(`/api/complaints/${c.id}/resolve`, { method: "PUT" }), `${complaintCode(c)} resolved`);

    const reopen = (c) =>
        run(`reopen-${c.id}`, () => api(`/api/complaints/${c.id}/reopen`, { method: "PUT" }), `${complaintCode(c)} sent back to contractor`);

    const merge = async (c, masterId) => {
        await run(
            `merge-${c.id}`,
            () => api(`/api/complaints/${c.id}/merge/${masterId}`, { method: "PUT" }),
            `${complaintCode(c)} merged into CP-${String(masterId).padStart(4, "0")}`
        );
        setSelectedId(Number(masterId));
        load();
    };

    const reanalyse = (c) =>
        run(
            `analyse-${c.id}`,
            () => api(`/api/complaints/${c.id}/severity/refresh`, { method: "POST" }),
            "Reassessment started"
        );

    const review = (c, correction) =>
        run(`review-${c.id}`, () => api(`/api/complaints/${c.id}/severity/review`, {
            method: "PUT", body: correction,
        }), "Severity review saved");

    const recomputeAll = () =>
        run("recompute", () => api("/api/complaints/severity/recompute", { method: "POST" }), "Severity re-scored for all open issues");

    const logout = () => {
        clearSession();
        navigate("/");
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="cp-app">
            <AppHeader role="Officer" user={user} live={live} onLogout={logout}>
                <ActivityBell items={activity} onSelect={(item) => setSelectedId(item.id)} />
            </AppHeader>

            <main className="cp-main cp-main-wide">
                <section className="cp-hero">
                    <div>
                        <div className="cp-eyebrow">Operations control</div>
                        <h1>Priority queue</h1>
                        <p>
                            Issues are ranked by operational priority and severity score. Review the reported hazard,
                            affected road, public impact, and urgency before assigning work.
                        </p>
                    </div>
                    <div className="cp-hero-actions">
                        <button className="cp-btn cp-btn-ghost" onClick={recomputeAll} disabled={busy === "recompute"}>
                            {busy === "recompute" ? <Spinner /> : <Icon name="refresh" size={16} />} Re-score all
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="cp-error">
                        <Icon name="alert" /> {error}
                        <button className="cp-btn cp-btn-sm cp-btn-ghost" onClick={load}>Retry</button>
                    </div>
                )}

                <section className="cp-stats">
                    {[
                        ["open", "Open issues", stats.open, `${stats.citizens} citizen reports`, "primary", "layers"],
                        ["critical", "Critical", stats.critical, "Highest severity", "critical", "alert"],
                        ["pending", "To verify", stats.pending, "New, unchecked", "medium", "eye"],
                        ["unassigned", "To assign", stats.unassigned, "Verified, no contractor", "info", "wrench"],
                        ["signoff", "To sign off", stats.signoff, "Work completed", "low", "check"],
                        ["overdue", "SLA breached", stats.overdue, "Past deadline", "high", "clock"],
                    ].map(([key, label, value, hint, tone, icon]) => (
                        <StatCard
                            key={key}
                            label={label}
                            value={value}
                            hint={hint}
                            tone={tone}
                            icon={icon}
                            active={quick === key}
                            onClick={() => setQuick(quick === key ? null : key)}
                        />
                    ))}
                </section>

                <section className="cp-insights">
                    <div className="cp-panel cp-panel-body">
                        <div className="cp-insight-head">
                            <strong>Open issues by severity</strong>
                            <span className="cp-muted">{stats.merged} duplicate reports merged</span>
                        </div>
                        <div className="cp-distribution">
                            {SEVERITY_ORDER.map((level) =>
                                distribution[level] ? (
                                    <span
                                        key={level}
                                        className={`cp-dist-${level.toLowerCase()}`}
                                        style={{ flexGrow: distribution[level] }}
                                        title={`${level}: ${distribution[level]}`}
                                    />
                                ) : null
                            )}
                            {open.length === 0 && <span className="cp-dist-empty" />}
                        </div>
                        <div className="cp-dist-legend">
                            {SEVERITY_ORDER.map((level) => (
                                <button
                                    key={level}
                                    className={severity === level ? "is-active" : ""}
                                    onClick={() => setSeverity(severity === level ? "ALL" : level)}
                                >
                                    <i className={`cp-dist-${level.toLowerCase()}`} />
                                    {level} <b>{distribution[level]}</b>
                                </button>
                            ))}
                        </div>

                        {byCategory.length > 0 && (
                            <div className="cp-cat-bars">
                                {byCategory.map(([name, value]) => (
                                    <button
                                        key={name}
                                        className={category === name ? "is-active" : ""}
                                        onClick={() => setCategory(category === name ? "ALL" : name)}
                                    >
                                        <span>{name}</span>
                                        <span className="cp-bar">
                                            <span style={{ width: `${(value / byCategory[0][1]) * 100}%` }} />
                                        </span>
                                        <b>{value}</b>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="cp-panel cp-panel-body">
                        <div className="cp-insight-head">
                            <strong>Most reported right now</strong>
                            <span className="cp-muted">Same issue, many citizens</span>
                        </div>
                        {hotspots.length === 0 ? (
                            <p className="cp-muted cp-hot-empty">No issue has more than one report yet.</p>
                        ) : (
                            <ol className="cp-hotspots">
                                {hotspots.map((c) => (
                                    <li key={c.id}>
                                        <button onClick={() => { setQuick(null); setQueue("ALL"); setSelectedId(c.id); }}>
                                            <ReportCount complaint={c} compact />
                                            <span className="cp-hot-text">
                                                <b>{c.category}</b> · {shortAddress(c)}
                                            </span>
                                            <SeverityBadge complaint={c} showScore={false} />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </section>

                <section className="cp-panel">
                    <div className="cp-panel-head">
                        <div className="cp-tabs">
                            {Object.entries(QUEUES).map(([key, q]) => (
                                <button
                                    key={key}
                                    className={`cp-tab ${!quick && queue === key ? "is-active" : ""}`}
                                    onClick={() => { setQueue(key); setQuick(null); }}
                                >
                                    {q.label} <b>{queueCount(key)}</b>
                                </button>
                            ))}
                        </div>

                        <div className="cp-filters">
                            <label className="cp-search">
                                <Icon name="search" size={15} />
                                <input
                                    className="cp-input"
                                    placeholder="Search code, place, reporter…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </label>
                            <select className="cp-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="ALL">All categories</option>
                                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                            <select className="cp-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                                <option value="ALL">All severities</option>
                                {SEVERITY_ORDER.map((s) => <option key={s}>{s}</option>)}
                            </select>
                            <select className="cp-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                                <option value="severity">Sort: severity</option>
                                <option value="reports">Sort: most reported</option>
                                <option value="sla">Sort: SLA deadline</option>
                                <option value="newest">Sort: newest</option>
                            </select>
                        </div>
                    </div>

                    {quick && (
                        <div className="cp-quick-note">
                            Showing: <b>{quick}</b>
                            <button onClick={() => setQuick(null)}>Clear <Icon name="x" size={12} /></button>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonList rows={5} />
                    ) : visible.length === 0 ? (
                        <EmptyState icon="check" title="Queue is clear">
                            No complaints match these filters. New reports appear here instantly.
                        </EmptyState>
                    ) : (
                        <div className="cp-split">
                            <ul className="cp-queue">
                                {visible.map((c, index) => {
                                    const sla = slaInfo(c);
                                    return (
                                        <li key={c.id}>
                                            <button
                                                className={`cp-row ${selected?.id === c.id ? "is-selected" : ""} ${flashIds.includes(c.id) ? "cp-flash" : ""}`}
                                                onClick={() => setSelectedId(c.id)}
                                            >
                                                <span className="cp-row-rank">{index + 1}</span>
                                                <span className={`cp-row-score cp-sev-${severityOf(c).toLowerCase()}`}>
                                                    {severityScore(c) != null ? Math.round(severityScore(c)) : "–"}
                                                </span>
                                                <span className="cp-row-main">
                                                    <span className="cp-row-title">
                                                        <b>{c.category}</b>
                                                        <span className="cp-muted">{complaintCode(c)}</span>
                                                    </span>
                                                    <span className="cp-row-sub">
                                                        <Icon name="pin" size={12} /> {shortAddress(c)}
                                                    </span>
                                                    <span className="cp-row-tags">
                                                        <StatusBadge status={c.status} />
                                                        <ReportCount complaint={c} />
                                                        <span className={`cp-chip cp-chip-${sla.tone}`}>
                                                            <Icon name="clock" size={11} /> {sla.label}
                                                        </span>
                                                    </span>
                                                </span>
                                                <span className="cp-row-time cp-muted">{timeAgo(c.lastReportedAt || c.createdAt)}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            {selected && (
                                <OfficerDetail
                                    key={selected.id}
                                    complaint={selected}
                                    contractors={contractors}
                                    busy={busy}
                                    onMedia={setMedia}
                                    onVerify={verify}
                                    onAssign={assign}
                                    onResolve={resolve}
                                    onReopen={reopen}
                                    onMerge={merge}
                                    onReanalyse={reanalyse}
                                    onReview={review}
                                    onOpenReport={(id) => navigate(`/report/${id}`)}
                                />
                            )}
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
// DETAIL PANE
// =====================================================

function OfficerDetail({
    complaint: c,
    contractors,
    busy,
    onMedia,
    onVerify,
    onAssign,
    onResolve,
    onReopen,
    onMerge,
    onReanalyse,
    onReview,
    onOpenReport,
}) {
    const [contractorId, setContractorId] = useState(c.contractor?.id ? String(c.contractor.id) : "");
    const [reports, setReports] = useState(null);
    const [mergeTarget, setMergeTarget] = useState("");
    const [severityReview, setSeverityReview] = useState(null);
    const [reviewError, setReviewError] = useState("");
    const count = reportCount(c);
    const sla = slaInfo(c);
    const map = mapsUrl(c);

    // Load everyone who reported this issue (re-load when the count changes live)
    useEffect(() => {
        let cancelled = false;
        api(`/api/complaints/${c.id}/reports`)
            .then((data) => !cancelled && setReports(Array.isArray(data) ? data : []))
            .catch(() => !cancelled && setReports([]));
        return () => {
            cancelled = true;
        };
    }, [c.id, count]);

    return (
        <aside className="cp-detail">
            <div className="cp-detail-head">
                <div>
                    <div className="cp-eyebrow">{complaintCode(c)}</div>
                    <h2>{c.category}</h2>
                    <div className="cp-detail-tags">
                        <SeverityBadge complaint={c} />
                        <StatusBadge status={c.status} />
                        <span className={`cp-chip cp-chip-${sla.tone}`}><Icon name="clock" size={11} /> {sla.label}</span>
                    </div>
                </div>
                <button className="cp-icon-btn" title="Open full report" onClick={() => onOpenReport(c.id)}>
                    <Icon name="external" size={16} />
                </button>
            </div>

            {/* ---------- actions ---------- */}
            <div className="cp-actions">
                {c.status === "PENDING" && (
                    <button className="cp-btn cp-btn-primary" onClick={() => onVerify(c)} disabled={!!busy}>
                        {busy === `verify-${c.id}` ? <Spinner /> : <Icon name="shield" size={16} />} Verify complaint
                    </button>
                )}

                {(c.status === "VERIFIED" || c.status === "ASSIGNED") && (
                    <div className="cp-assign">
                        <select
                            className="cp-select"
                            value={contractorId}
                            onChange={(e) => setContractorId(e.target.value)}
                        >
                            <option value="">Choose contractor…</option>
                            {contractors.map((p) => (
                                <option key={p.id} value={p.id}>{p.name || p.email}</option>
                            ))}
                        </select>
                        <button
                            className="cp-btn cp-btn-primary"
                            disabled={!contractorId || !!busy || String(c.contractor?.id) === contractorId}
                            onClick={() => onAssign(c, contractorId)}
                        >
                            {busy === `assign-${c.id}` ? <Spinner /> : <Icon name="wrench" size={16} />}
                            {c.status === "ASSIGNED" ? "Reassign" : "Assign"}
                        </button>
                    </div>
                )}

                {c.status === "COMPLETED" && (
                    <>
                        <button className="cp-btn cp-btn-primary" onClick={() => onResolve(c)} disabled={!!busy}>
                            {busy === `resolve-${c.id}` ? <Spinner /> : <Icon name="check" size={16} />} Approve & resolve
                        </button>
                        <button className="cp-btn cp-btn-danger" onClick={() => onReopen(c)} disabled={!!busy}>
                            Send back
                        </button>
                    </>
                )}

                {(c.status === "IN_PROGRESS" || c.status === "ASSIGNED") && c.contractor && (
                    <div className="cp-muted cp-assigned-to">
                        <Icon name="wrench" size={14} /> {personName(c.contractor)} is on this job
                    </div>
                )}
            </div>

            <div className="cp-detail-grid">
                <MediaThumb complaint={c} onOpen={onMedia} className="cp-detail-media" />
                <div className="cp-detail-facts">
                    <div><span className="cp-muted">Location</span><b>{shortAddress(c)}</b></div>
                    <div><span className="cp-muted">First reported</span><b>{timeAgo(c.createdAt)} by {personName(c.user) || "citizen"}</b></div>
                    <div><span className="cp-muted">Last report</span><b>{timeAgo(c.lastReportedAt || c.createdAt)}</b></div>
                    {map && (
                        <a className="cp-link" href={map} target="_blank" rel="noreferrer">
                            <Icon name="pin" size={14} /> Open in Maps
                        </a>
                    )}
                </div>
            </div>

            {c.description && <p className="cp-detail-desc">{c.description}</p>}

            {/* ---------- severity ---------- */}
            <div className="cp-detail-section">
                <div className="cp-section-title">
                    <span>Severity analysis</span>
                    <button className="cp-link-btn" onClick={() => onReanalyse(c)} disabled={!!busy}>
                        <Icon name="refresh" size={13} /> Reassess severity
                    </button>
                </div>
                <SeverityBreakdown complaint={c} />
                {severityReview ? (
                    <form className="cp-review" onSubmit={async (event) => {
                        event.preventDefault();
                        const saved = await onReview(c, {
                            evidence: severityReview.evidence,
                            roadId: severityReview.roadId,
                            priority: severityReview.priority,
                            reason: severityReview.reason,
                        });
                        if (saved) setSeverityReview(null);
                    }}>
                        <HazardEvidenceFields category={c.category} value={severityReview.evidence} officer
                            onChange={(evidence) => setSeverityReview({ ...severityReview, evidence })} />
                        <label className="form-group">
                            Affected road
                            <select value={severityReview.roadId}
                                onChange={(event) => setSeverityReview({ ...severityReview, roadId: event.target.value })}>
                                <option value="">Use automatic road match</option>
                                <option value="UNMATCHED">No reliable road match</option>
                                {severityReview.candidates.map(({ road, distanceMeters }) => (
                                    <option key={road.id} value={road.id}>
                                        {road.name || road.roadClass} · {Math.round(distanceMeters)} m · {road.id}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="form-group">
                            Operational priority
                            <select value={severityReview.priority}
                                onChange={(event) => setSeverityReview({ ...severityReview, priority: event.target.value })}>
                                <option value="">Use calculated priority</option>
                                {SEVERITY_ORDER.map((level) => <option key={level}>{level}</option>)}
                            </select>
                        </label>
                        <label className="form-group">
                            Reason for review
                            <textarea required maxLength={500} value={severityReview.reason}
                                onChange={(event) => setSeverityReview({ ...severityReview, reason: event.target.value })} />
                        </label>
                        <button className="cp-link-btn" type="submit" disabled={!!busy}>Save severity review</button>
                        <button className="cp-link-btn" type="button" onClick={() => setSeverityReview(null)}>Close</button>
                    </form>
                ) : (
                    <button className="cp-link-btn" disabled={!!busy} onClick={async () => {
                        setReviewError("");
                        try {
                            const options = await api(`/api/complaints/${c.id}/severity/roads`);
                            setSeverityReview({ evidence: c.hazardEvidence ?? {}, candidates: options.candidates,
                                roadId: options.roadId ?? "", priority: options.priority ?? "", reason: "" });
                        } catch (error) {
                            setReviewError(error.message);
                        }
                    }}>Review evidence or correct the road</button>
                )}
                {reviewError && <p role="alert">{reviewError}</p>}
            </div>

            {/* ---------- merged reports ---------- */}
            <div className="cp-detail-section">
                <div className="cp-section-title">
                    <span>Citizen reports <ReportCount complaint={c} compact /></span>
                </div>

                {reports === null ? (
                    <div className="cp-muted"><Spinner label="Loading reports…" /></div>
                ) : (
                    <ul className="cp-reporters">
                        {reports.map((r, i) => (
                            <li key={r.id}>
                                <span className="cp-avatar cp-avatar-sm">
                                    {(personName(r.user) || "?").charAt(0).toUpperCase()}
                                </span>
                                <div>
                                    <b>{personName(r.user) || "Citizen"}</b>
                                    <span className="cp-muted">
                                        {i === 0 ? "Original report" : "Merged duplicate"} · {timeAgo(r.createdAt)}
                                    </span>
                                    {i > 0 && r.description && <p>{r.description}</p>}
                                </div>
                                {r.mediaUrl && (
                                    <button className="cp-link-btn" onClick={() => onMedia(r)}>
                                        <Icon name="camera" size={13} /> Evidence
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {c.status !== "RESOLVED" && (
                    <form
                        className="cp-merge"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const id = parseInt(mergeTarget.replace(/\D/g, ""), 10);
                            if (id) onMerge(c, id);
                        }}
                    >
                        <span className="cp-muted">Duplicate of another issue?</span>
                        <input
                            className="cp-input"
                            placeholder="CP-0012"
                            value={mergeTarget}
                            onChange={(e) => setMergeTarget(e.target.value)}
                        />
                        <button className="cp-btn cp-btn-sm cp-btn-ghost" disabled={!mergeTarget || !!busy}>
                            Merge
                        </button>
                    </form>
                )}
            </div>
        </aside>
    );
}

export default Officer;
