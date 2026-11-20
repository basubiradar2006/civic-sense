import { useEffect, useRef, useState } from "react";
import { API_URL, getToken } from "./api";

// =====================================================
// Subscribes to GET /api/stream (Server-Sent Events).
//
// onEvent({ type, complaintId, masterId, complaint, at })
// type: CREATED | MERGED | UPDATED | SEVERITY | ESCALATED
//
// Returns the connection status: "connecting" | "live" | "offline".
// While offline, `onReconnect` lets the page re-fetch so nothing
// is missed; the browser retries the stream automatically.
// =====================================================

export function useRealtime(onEvent, onReconnect) {
    const [status, setStatus] = useState(() =>
        getToken() && typeof EventSource !== "undefined" ? "connecting" : "offline"
    );

    const handlerRef = useRef(onEvent);
    const reconnectRef = useRef(onReconnect);

    useEffect(() => {
        handlerRef.current = onEvent;
        reconnectRef.current = onReconnect;
    });

    useEffect(() => {
        const token = getToken();

        if (!token || typeof EventSource === "undefined") {
            return undefined;
        }

        let source = null;
        let retryTimer = null;
        let wasOffline = false;
        let closed = false;

        const connect = () => {
            source = new EventSource(
                `${API_URL}/api/stream?token=${encodeURIComponent(token)}`
            );

            source.addEventListener("hello", () => {
                setStatus("live");
                if (wasOffline && reconnectRef.current) {
                    reconnectRef.current();
                }
                wasOffline = false;
            });

            source.addEventListener("complaint", (message) => {
                try {
                    const payload = JSON.parse(message.data);
                    handlerRef.current?.(payload);
                } catch (error) {
                    console.error("Bad realtime message", error);
                }
            });

            source.onerror = () => {
                setStatus("offline");
                wasOffline = true;

                // EventSource retries by itself unless the server
                // refused the connection; then retry manually.
                if (source.readyState === EventSource.CLOSED && !closed) {
                    retryTimer = setTimeout(connect, 5000);
                }
            };
        };

        connect();

        return () => {
            closed = true;
            clearTimeout(retryTimer);
            source?.close();
        };
    }, []);

    return status;
}
