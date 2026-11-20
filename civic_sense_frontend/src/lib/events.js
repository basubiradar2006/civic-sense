import { complaintCode, statusLabel } from "./format";

// Turns a realtime payload into a short activity line.
// Returns null for events that shouldn't be announced.
export function describeEvent(event) {
    const c = event?.complaint;
    if (!c) return null;

    const code = complaintCode(c);
    const where = c.address ? ` near ${c.address.split(",")[0]}` : "";

    switch (event.type) {
        case "CREATED":
            if (c.mergedIntoId) return null;
            return { text: `New ${c.category || "issue"} reported${where}`, tone: "info" };
        case "MERGED":
            return {
                text: `${code} reported again — now ${c.reportCount || 1} reports`,
                tone: "warn",
            };
        case "UPDATED":
            if (c.mergedIntoId) return null;
            return { text: `${code} is now ${statusLabel(c.status)}`, tone: "success" };
        case "ESCALATED":
            if (c.mergedIntoId) return null;
            return { text: `${code} passed its SLA deadline`, tone: "danger" };
        default:
            return null;
    }
}
