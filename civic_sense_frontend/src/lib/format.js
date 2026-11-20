// =====================================================
// Display helpers shared by the dashboards
// =====================================================

export const STATUS_FLOW = [
    "PENDING",
    "VERIFIED",
    "ASSIGNED",
    "IN_PROGRESS",
    "COMPLETED",
    "RESOLVED",
];

export const STATUS_LABEL = {
    PENDING: "Pending review",
    VERIFIED: "Verified",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In progress",
    COMPLETED: "Work completed",
    RESOLVED: "Resolved",
};

export const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const CATEGORIES = [
    "Road Damage",
    "Garbage",
    "Street Light",
    "Water Leakage",
    "Drainage",
    "Illegal Dumping",
    "Public Property Damage",
    "Other",
];

export function statusLabel(status) {
    if (!status) return "Unknown";
    return STATUS_LABEL[status] || String(status).replace(/_/g, " ");
}

export function statusKey(status) {
    return String(status || "unknown").toLowerCase().replace(/[\s_]+/g, "-");
}

export function severityOf(complaint) {
    return String(
        complaint?.severityLevel || complaint?.priority || "LOW"
    ).toUpperCase();
}

export function severityScore(complaint) {
    const s = Number(complaint?.severityScore);
    return Number.isFinite(s) ? s : null;
}

export function isOpen(complaint) {
    return !["COMPLETED", "RESOLVED"].includes(complaint?.status);
}

export function reportCount(complaint) {
    return Math.max(1, Number(complaint?.reportCount) || 1);
}

export function complaintCode(complaint) {
    return `CP-${String(complaint?.id ?? 0).padStart(4, "0")}`;
}

export function timeAgo(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} d ago`;
    return date.toLocaleDateString();
}

// Remaining SLA time: { label, tone: ok | warn | breached | done }
export function slaInfo(complaint) {
    if (!isOpen(complaint)) {
        return { label: "Closed", tone: "done" };
    }
    if (!complaint?.dueAt) {
        return { label: "No SLA", tone: "ok" };
    }

    const due = new Date(complaint.dueAt).getTime();
    if (Number.isNaN(due)) return { label: "No SLA", tone: "ok" };

    const diff = due - Date.now();
    const abs = Math.abs(diff);
    const days = Math.floor(abs / 86400000);
    const hours = Math.floor((abs % 86400000) / 3600000);
    const text = days > 0 ? `${days}d ${hours}h` : `${hours}h ${Math.floor((abs % 3600000) / 60000)}m`;

    if (diff < 0) return { label: `Overdue ${text}`, tone: "breached" };
    if (diff < 24 * 3600000) return { label: `${text} left`, tone: "warn" };
    return { label: `${text} left`, tone: "ok" };
}

export function isVideo(complaint) {
    if (String(complaint?.mediaType || "").toUpperCase() === "VIDEO") return true;
    return /\.(webm|mp4|mov|m4v|ogg)(\?|$)/i.test(String(complaint?.mediaUrl || ""));
}

export function mapsUrl(complaint) {
    if (complaint?.latitude == null || complaint?.longitude == null) return null;
    return `https://www.google.com/maps/search/?api=1&query=${complaint.latitude},${complaint.longitude}`;
}

export function shortAddress(complaint) {
    if (complaint?.address) {
        return complaint.address.split(",").slice(0, 3).join(",").trim();
    }
    if (complaint?.latitude != null && complaint?.longitude != null) {
        return `${Number(complaint.latitude).toFixed(4)}, ${Number(complaint.longitude).toFixed(4)}`;
    }
    return "Location not available";
}

export function personName(user) {
    if (!user) return "";
    return user.name || user.email || "";
}
