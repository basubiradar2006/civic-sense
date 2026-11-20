// =====================================================
// Small fetch wrapper shared by every page.
// - adds the JWT
// - turns { message } error bodies into readable errors
// - sends the user back to the login page on 401 / 403
// =====================================================

export const API_URL = import.meta.env.VITE_API_URL || "";

export class AuthError extends Error {}

export function getToken() {
    return localStorage.getItem("token");
}

export function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    sessionStorage.clear();
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
    const headers = {};

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (auth) {
        const token = getToken();
        if (!token) {
            throw new AuthError("Please sign in");
        }
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (auth && (response.status === 401 || response.status === 403)) {
        clearSession();
        throw new AuthError("Your session has expired. Please sign in again.");
    }

    if (!response.ok) {
        const message =
            (data && typeof data === "object" && data.message) ||
            (typeof data === "string" && data) ||
            `Request failed (${response.status})`;
        throw new Error(message);
    }

    return data;
}

// Replace or insert a complaint in a list, keeping order stable
export function upsertById(list, item, { prepend = true } = {}) {
    const index = list.findIndex((c) => c.id === item.id);

    if (index === -1) {
        return prepend ? [item, ...list] : [...list, item];
    }

    const copy = [...list];
    // Keep per-user like information the stream doesn't know about
    copy[index] = {
        ...copy[index],
        ...item,
        liked: copy[index].liked,
        likeCount: item.likeCount || copy[index].likeCount,
    };
    return copy;
}
