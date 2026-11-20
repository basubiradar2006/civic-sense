import { useCallback, useRef, useState } from "react";

// Small toast queue used by the dashboards
export function useToasts() {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (message, tone = "info") => {
            counter.current += 1;
            const id = counter.current;
            setToasts((list) => [...list.slice(-3), { id, message, tone }]);
            setTimeout(() => dismiss(id), 5000);
        },
        [dismiss]
    );

    return { toasts, push, dismiss };
}
