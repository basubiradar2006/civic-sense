import { useState } from "react";
import "./NotificationBell.css";

function NotificationBell() {
    const [open, setOpen] = useState(false);

    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: "SLA_WARNING",
            title: "SLA Deadline Approaching",
            message:
                "Complaint CS-0001 has only 2d 23h remaining before the SLA deadline.",
            time: "2 minutes ago",
            read: false,
        },
        {
            id: 2,
            type: "SLA_BREACHED",
            title: "SLA Breached",
            message:
                "Complaint CS-0002 has exceeded its SLA and requires immediate attention.",
            time: "15 minutes ago",
            read: false,
        },
        {
            id: 3,
            type: "ASSIGNMENT",
            title: "Contractor Assigned",
            message:
                "Contractor Basavaraj has been assigned to complaint CS-0001.",
            time: "30 minutes ago",
            read: true,
        },
        {
            id: 4,
            type: "ESCALATION",
            title: "Complaint Escalated",
            message:
                "Complaint CS-0003 has been escalated because it was not handled within the SLA.",
            time: "1 hour ago",
            read: true,
        },
    ]);

    const unreadCount =
        notifications.filter(
            (notification) => !notification.read
        ).length;

    const markAsRead = (id) => {
        setNotifications((previous) =>
            previous.map((notification) =>
                notification.id === id
                    ? {
                          ...notification,
                          read: true,
                      }
                    : notification
            )
        );
    };

    const markAllAsRead = () => {
        setNotifications((previous) =>
            previous.map((notification) => ({
                ...notification,
                read: true,
            }))
        );
    };

    const getIcon = (type) => {
        switch (type) {
            case "SLA_WARNING":
                return "⏳";

            case "SLA_BREACHED":
                return "🚨";

            case "ASSIGNMENT":
                return "📋";

            case "ESCALATION":
                return "⚠️";

            default:
                return "🔔";
        }
    };

    return (
        <div className="notification-wrapper">

            <button
                type="button"
                className="notification-button"
                onClick={() =>
                    setOpen((previous) => !previous)
                }
                aria-label="Officer notifications"
            >
                <span className="notification-bell">
                    🔔
                </span>

                {unreadCount > 0 && (
                    <span className="notification-count">
                        {unreadCount}
                    </span>
                )}
            </button>


            {open && (
                <div className="notification-dropdown">

                    <div className="notification-header">

                        <div>
                            <h3>
                                Officer Notifications
                            </h3>

                            <span>
                                {unreadCount} unread
                            </span>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="mark-all-button"
                                onClick={markAllAsRead}
                            >
                                Mark all read
                            </button>
                        )}

                    </div>


                    <div className="notification-list">

                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <div>🔔</div>
                                <p>
                                    No notifications
                                </p>
                            </div>
                        ) : (
                            notifications.map(
                                (notification) => (
                                    <div
                                        key={
                                            notification.id
                                        }
                                        className={`notification-item ${
                                            notification.read
                                                ? "read"
                                                : "unread"
                                        }`}
                                        onClick={() =>
                                            markAsRead(
                                                notification.id
                                            )
                                        }
                                    >

                                        <div
                                            className={`notification-icon ${notification.type.toLowerCase()}`}
                                        >
                                            {getIcon(
                                                notification.type
                                            )}
                                        </div>


                                        <div className="notification-content">

                                            <div className="notification-title-row">

                                                <strong>
                                                    {
                                                        notification.title
                                                    }
                                                </strong>

                                                {!notification.read && (
                                                    <span className="unread-dot" />
                                                )}

                                            </div>


                                            <p>
                                                {
                                                    notification.message
                                                }
                                            </p>


                                            <small>
                                                {
                                                    notification.time
                                                }
                                            </small>

                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </div>
            )}

        </div>
    );
}

export default NotificationBell;