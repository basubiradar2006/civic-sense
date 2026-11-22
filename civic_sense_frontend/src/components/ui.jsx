import { useEffect, useRef, useState } from "react";
import {
    STATUS_FLOW,
    assessmentStatus,
    complaintCode,
    isVideo,
    reportCount,
    severityOf,
    severityScore,
    statusKey,
    statusLabel,
    timeAgo,
} from "../lib/format";

// =====================================================
// ICONS (inline, no dependency)
// =====================================================

const ICONS = {
    logo: (
        <>
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
            <path d="M8.5 10h2l1-2.5 2 5 1-2.5h1" />
        </>
    ),
    pin: (
        <>
            <path d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21Z" />
            <circle cx="12" cy="10.5" r="2.2" />
        </>
    ),
    users: (
        <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
            <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 19a5 5 0 0 0-2.4-4.3" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
        </>
    ),
    alert: (
        <>
            <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
            <path d="M12 10v4M12 17h.01" />
        </>
    ),
    check: <path d="m5 12.5 4.2 4.2L19 7" />,
    refresh: (
        <>
            <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" />
            <path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" />
            <path d="M20 20v-4h-4" />
        </>
    ),
    logout: (
        <>
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 16l-4-4 4-4M6 12h10" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    camera: (
        <>
            <path d="M4 8h3l2-2.5h6L17 8h3v11H4V8Z" />
            <circle cx="12" cy="13" r="3.3" />
        </>
    ),
    play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
    road: (
        <>
            <path d="M8 3 4 21M16 3l4 18" />
            <path d="M12 4v2.5M12 10.5v3M12 17.5V20" />
        </>
    ),
    shield: (
        <>
            <path d="M12 3 5 6v5c0 4.5 2.8 8.4 7 10 4.2-1.6 7-5.5 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
        </>
    ),
    wrench: (
        <path d="M14.5 6.5a4 4 0 0 0 5 5l-8.8 8.8a2.1 2.1 0 0 1-3-3l8.8-8.8a4 4 0 0 1-2-2Zm0 0L17 4" />
    ),
    eye: (
        <>
            <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.6" />
        </>
    ),
    external: (
        <>
            <path d="M14 4h6v6M20 4l-9 9" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </>
    ),
    bell: (
        <>
            <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
            <path d="M10 20.5a2 2 0 0 0 4 0" />
        </>
    ),
    layers: (
        <>
            <path d="m12 3 9 5-9 5-9-5 9-5Z" />
            <path d="m3 13 9 5 9-5" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
        </>
    ),
    upload: (
        <>
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </>
    ),
};

export function Icon({ name, size = 18, className = "" }) {
    return (
        <svg
            className={`cp-icon ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {ICONS[name] || null}
        </svg>
    );
}

// =====================================================
// HEADER
// =====================================================

export function AppHeader({ role, user, live, onLogout, children }) {
    return (
        <header className="cp-header">
            <div className="cp-header-inner">
                <div className="cp-brand">
                    <span className="cp-brand-mark">
                        <Icon name="logo" size={20} />
                    </span>
                    <span className="cp-brand-name">
                        Civic<span>Pulse</span>
                    </span>
                    <span className="cp-role-tag">{role}</span>
                </div>

                <div className="cp-header-actions">
                    <LiveBadge status={live} />
                    {children}
                    <div className="cp-user">
                        <span className="cp-avatar">
                            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="cp-user-name">{user?.name || user?.email}</span>
                    </div>
                    <button className="cp-icon-btn" onClick={onLogout} title="Sign out">
                        <Icon name="logout" />
                    </button>
                </div>
            </div>
        </header>
    );
}

export function LiveBadge({ status }) {
    const label =
        status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Offline";
    return (
        <span
            className={`cp-live cp-live-${status}`}
            title={
                status === "live"
                    ? "Receiving real-time updates"
                    : "Real-time updates unavailable; data refreshes periodically"
            }
        >
            <span className="cp-live-dot" />
            {label}
        </span>
    );
}

// =====================================================
// STATS
// =====================================================

export function StatCard({ label, value, hint, tone = "default", icon, active, onClick }) {
    const Tag = onClick ? "button" : "div";
    return (
        <Tag
            className={`cp-stat cp-tone-${tone} ${active ? "is-active" : ""}`}
            onClick={onClick}
            type={onClick ? "button" : undefined}
        >
            <div className="cp-stat-top">
                <span className="cp-stat-label">{label}</span>
                {icon && (
                    <span className="cp-stat-icon">
                        <Icon name={icon} size={16} />
                    </span>
                )}
            </div>
            <div className="cp-stat-value">{value}</div>
            {hint && <div className="cp-stat-hint">{hint}</div>}
        </Tag>
    );
}

// =====================================================
// BADGES
// =====================================================

export function StatusBadge({ status }) {
    return (
        <span className={`cp-status cp-status-${statusKey(status)}`}>
            {statusLabel(status)}
        </span>
    );
}

export function SeverityBadge({ complaint, showScore = true }) {
    const level = severityOf(complaint);
    const score = severityScore(complaint);
    return (
        <span className={`cp-sev cp-sev-${level.toLowerCase()}`}>
            <span className="cp-sev-dot" />
            {level === "UNASSESSED" ? "Assessment pending" : level}
            {showScore && score != null && <b>{Math.round(score)}</b>}
        </span>
    );
}

export function ReportCount({ complaint, compact = false }) {
    const count = reportCount(complaint);
    return (
        <span
            className={`cp-reports ${count > 1 ? "is-multi" : ""}`}
            title={`${count} citizen${count === 1 ? "" : "s"} reported this issue`}
        >
            <Icon name="users" size={14} />
            {count}
            {!compact && ` report${count === 1 ? "" : "s"}`}
        </span>
    );
}

// =====================================================
// SEVERITY BREAKDOWN (explains the score)
// =====================================================

const FACTORS = [
    ["hazard", "Physical hazard"],
    ["roadImportance", "Road importance"],
    ["publicImpact", "Public impact"],
    ["urgency", "Urgency"],
];

export function SeverityBreakdown({ complaint }) {
    const score = severityScore(complaint);
    const level = severityOf(complaint);
    const assessment = complaint.severityAssessment;
    const roadMatch = assessment?.roadMatchStatus?.toLowerCase().replaceAll("_", " ");

    return (
        <div className="cp-breakdown">
            <div className="cp-breakdown-head">
                <div className={`cp-gauge cp-sev-${level.toLowerCase()}`}>
                    <svg viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" className="cp-gauge-bg" />
                        <circle
                            cx="18"
                            cy="18"
                            r="15.9"
                            className="cp-gauge-fg"
                            strokeDasharray={`${score ?? 0} 100`}
                        />
                    </svg>
                    <span>{score != null ? Math.round(score) : "–"}</span>
                </div>
                <div>
                    <div className="cp-breakdown-title">{level === "UNASSESSED" ? "Severity pending" : `${level} priority`}</div>
                    <div className="cp-muted">
                        {assessmentStatus(assessment)}
                        {assessment && ` · ${assessment.evidenceCompleteness}% evidence completeness`}
                    </div>
                </div>
            </div>

            <div className="cp-factors">
                {FACTORS.map(([key, label]) => {
                    const value = assessment?.[key];
                    return (
                        <div className="cp-factor" key={key}>
                            <div className="cp-factor-label">
                                <span>{label}</span>
                                <span className="cp-muted">
                                    {value == null ? "Unknown" : `${value} / 100`}
                                </span>
                            </div>
                            <div className="cp-bar">
                                <span style={{ width: `${value ?? 0}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {assessment?.emergencyRule && <p className="cp-context" role="status"><strong>Emergency override</strong></p>}
            {assessment?.explanation && <p className="cp-context">{assessment.explanation}</p>}
            {assessment?.roadId ? (
                <p className="cp-context">
                    {assessment.roadName || "Unnamed road"} · {assessment.roadClass} · {assessment.roadId}
                    {" · "}{assessment.roadConfidence?.toLowerCase()} road evidence
                    <br />Connectivity {assessment.connectivity ?? "unknown"} · Essential access {assessment.essentialAccess ?? "unknown"}
                    <br />Traffic exposure {assessment.trafficExposure == null ? "unknown"
                        : `${Math.round(assessment.trafficExposure)}/100 · ${assessment.trafficSource} · ${assessment.trafficConfidence?.toLowerCase()} confidence`}
                </p>
            ) : roadMatch && <p className="cp-context">
                {assessment.roadMatchStatus === "INDEX_UNAVAILABLE"
                    ? "This server has no road data for matching."
                    : `Road match · ${roadMatch}`}
            </p>}
            {complaint?.vehicleCountSummary && (
                <p className="cp-context">{complaint.vehicleCountSummary}</p>
            )}
        </div>
    );
}

// =====================================================
// STATUS TIMELINE
// =====================================================

export function StatusTimeline({ status }) {
    // A resolved complaint has every step done
    const current = status === "RESOLVED" ? STATUS_FLOW.length : STATUS_FLOW.indexOf(status);
    return (
        <ol className="cp-timeline" aria-label={`Status: ${statusLabel(status)}`}>
            {STATUS_FLOW.map((step, index) => (
                <li
                    key={step}
                    className={
                        index < current ? "is-done" : index === current ? "is-current" : ""
                    }
                >
                    <span className="cp-timeline-dot">
                        {index < current && <Icon name="check" size={10} />}
                    </span>
                    <span className="cp-timeline-label">{statusLabel(step)}</span>
                </li>
            ))}
        </ol>
    );
}

// =====================================================
// MEDIA
// =====================================================

export function MediaThumb({ complaint, onOpen, className = "" }) {
    if (!complaint?.mediaUrl) {
        return (
            <div className={`cp-thumb cp-thumb-empty ${className}`}>
                <Icon name="camera" size={22} />
            </div>
        );
    }

    const video = isVideo(complaint);

    return (
        <button
            type="button"
            className={`cp-thumb ${className}`}
            onClick={() => onOpen?.(complaint)}
            title="View evidence"
        >
            {video ? (
                <video src={complaint.mediaUrl} muted preload="metadata" />
            ) : (
                <img
                    src={complaint.mediaUrl}
                    alt={complaint.category || "Evidence"}
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                />
            )}
            {video && (
                <span className="cp-thumb-play">
                    <Icon name="play" size={14} />
                </span>
            )}
        </button>
    );
}

export function MediaModal({ complaint, onClose }) {
    useEffect(() => {
        if (!complaint) return undefined;
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [complaint, onClose]);

    if (!complaint) return null;

    return (
        <div className="cp-modal-backdrop" onClick={onClose}>
            <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cp-modal-head">
                    <div>
                        <div className="cp-eyebrow">{complaintCode(complaint)}</div>
                        <strong>{complaint.category || "Evidence"}</strong>
                    </div>
                    <button className="cp-icon-btn" onClick={onClose} aria-label="Close">
                        <Icon name="x" />
                    </button>
                </div>
                <div className="cp-modal-body">
                    {isVideo(complaint) ? (
                        <video src={complaint.mediaUrl} controls autoPlay playsInline />
                    ) : (
                        <img src={complaint.mediaUrl} alt={complaint.category || "Evidence"} />
                    )}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// TOASTS
// =====================================================

export function ToastStack({ toasts, onDismiss }) {
    return (
        <div className="cp-toasts" role="status" aria-live="polite">
            {toasts.map((t) => (
                <div key={t.id} className={`cp-toast cp-toast-${t.tone}`}>
                    <span>{t.message}</span>
                    <button onClick={() => onDismiss(t.id)} aria-label="Dismiss">
                        <Icon name="x" size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// =====================================================
// ACTIVITY BELL (real-time event log)
// =====================================================

export function ActivityBell({ items, onSelect }) {
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(0);
    const unread = Math.max(0, items.length - seen);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    return (
        <div className="cp-bell" ref={ref}>
            <button
                className="cp-icon-btn"
                onClick={() => {
                    setOpen(!open);
                    setSeen(items.length);
                }}
                title="Live activity"
            >
                <Icon name="bell" />
                {unread > 0 && <span className="cp-bell-count">{Math.min(unread, 9)}</span>}
            </button>

            {open && (
                <div className="cp-bell-panel">
                    <div className="cp-bell-head">Live activity</div>
                    {items.length === 0 ? (
                        <div className="cp-bell-empty">
                            Updates appear here as they happen.
                        </div>
                    ) : (
                        <ul>
                            {items.slice(0, 20).map((item) => (
                                <li key={item.key}>
                                    <button
                                        onClick={() => {
                                            onSelect?.(item);
                                            setOpen(false);
                                        }}
                                    >
                                        <span className={`cp-bell-dot cp-tone-${item.tone}`} />
                                        <span>
                                            <span className="cp-bell-text">{item.text}</span>
                                            <span className="cp-muted">{timeAgo(item.at)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

// =====================================================
// MISC
// =====================================================

export function EmptyState({ icon = "layers", title, children }) {
    return (
        <div className="cp-empty">
            <span className="cp-empty-icon">
                <Icon name={icon} size={26} />
            </span>
            <strong>{title}</strong>
            {children && <p>{children}</p>}
        </div>
    );
}

export function Spinner({ label }) {
    return (
        <span className="cp-spinner-wrap">
            <span className="cp-spinner" />
            {label}
        </span>
    );
}

export function SkeletonList({ rows = 4 }) {
    return (
        <div className="cp-skeletons">
            {Array.from({ length: rows }).map((_, i) => (
                <div className="cp-skeleton" key={i} />
            ))}
        </div>
    );
}
