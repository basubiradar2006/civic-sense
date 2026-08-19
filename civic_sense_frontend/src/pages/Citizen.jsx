import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Citizen.css";

function Citizen() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const user = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    // ==========================================
    // FETCH MY COMPLAINTS
    // ==========================================

    useEffect(() => {
        const fetchReports = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                const response = await fetch(
                    `${API_URL}/api/complaints/my`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                // Token expired / unauthorized
                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");

                    navigate("/");
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        "Failed to fetch complaints"
                    );
                }

                const data = await response.json();

                console.log("Reports:", data);

                setReports(
                    Array.isArray(data) ? data : []
                );
            } catch (err) {
                console.error(
                    "Complaint fetch error:",
                    err
                );

                setError(
                    "Unable to load complaints."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [API_URL, navigate]);

    // ==========================================
    // LOGOUT
    // ==========================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
    };

    // ==========================================
    // STATISTICS
    // ==========================================

    const totalReports = reports.length;

    const pendingReports = reports.filter(
        (report) =>
            report.status === "PENDING"
    ).length;

    const inProgressReports = reports.filter(
        (report) =>
            report.status === "IN_PROGRESS" ||
            report.status === "IN PROGRESS"
    ).length;

    const resolvedReports = reports.filter(
        (report) =>
            report.status === "RESOLVED"
    ).length;

    // ==========================================
    // RECENT REPORTS
    // ==========================================

    const recentReports = [...reports]
        .sort((a, b) => {
            const dateA = a.capturedAt
                ? new Date(a.capturedAt).getTime()
                : 0;

            const dateB = b.capturedAt
                ? new Date(b.capturedAt).getTime()
                : 0;

            return dateB - dateA;
        })
        .slice(0, 3);

    // ==========================================
    // FORMAT LOCATION
    // ==========================================

    const formatCoordinate = (value) => {
        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            return value.toFixed(4);
        }

        return value || "N/A";
    };

    // ==========================================
    // IMAGE ERROR
    // ==========================================

    const handleImageError = (event) => {
        event.currentTarget.style.display = "none";

        const container =
            event.currentTarget.parentElement;

        if (container) {
            container.classList.add(
                "image-error"
            );
        }
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="citizen-page">

            {/* ================= HEADER ================= */}

            <header className="citizen-header">

                <div className="logo">
                    CivicProof
                </div>

                <div className="header-right">

                    <span className="citizen-user">
                        👤{" "}
                        {user?.name || "Citizen"}
                    </span>

                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>

            {/* ================= MAIN ================= */}

            <main className="citizen-main">

                {/* ================= WELCOME ================= */}

                <section className="welcome-section">

                    <div className="welcome-content">

                        <h1>
                            Welcome,{" "}
                            {user?.name || "Citizen"}
                        </h1>

                        <p>
                            Report civic issues and
                            track their progress.
                        </p>

                    </div>

                    <button
                        className="report-btn"
                        onClick={() =>
                            navigate("/complaint")
                        }
                    >
                        + Raise Complaint
                    </button>

                </section>

                {/* ================= STATISTICS ================= */}

                <section className="stats">

                    {/* TOTAL */}

                    <div className="stat-card">

                        <h2>
                            {totalReports}
                        </h2>

                        <p>
                            Total Reports
                        </p>

                    </div>

                    {/* PENDING */}

                    <div className="stat-card">

                        <h2>
                            {pendingReports}
                        </h2>

                        <p>
                            Pending
                        </p>

                    </div>

                    {/* IN PROGRESS */}

                    <div className="stat-card">

                        <h2>
                            {inProgressReports}
                        </h2>

                        <p>
                            In Progress
                        </p>

                    </div>

                    {/* RESOLVED */}

                    <div className="stat-card">

                        <h2>
                            {resolvedReports}
                        </h2>

                        <p>
                            Resolved
                        </p>

                    </div>

                </section>

                {/* ================= MY REPORTS ================= */}

                <section className="reports-section">

                    <div className="section-title">

                        <h2>
                            My Recent Reports
                        </h2>

                        <button
                            onClick={() =>
                                navigate("/reports")
                            }
                        >
                            View All
                        </button>

                    </div>

                    {/* ================= LOADING ================= */}

                    {loading && (
                        <div className="empty-message">

                            <p>
                                Loading complaints...
                            </p>

                        </div>
                    )}

                    {/* ================= ERROR ================= */}

                    {!loading && error && (
                        <div className="empty-message error-message">

                            <h3>
                                Unable to load reports
                            </h3>

                            <p>
                                {error}
                            </p>

                        </div>
                    )}

                    {/* ================= NO REPORTS ================= */}

                    {!loading &&
                        !error &&
                        reports.length === 0 && (

                            <div className="empty-message">

                                <h3>
                                    No complaints yet
                                </h3>

                                <p>
                                    Your complaints will
                                    appear here.
                                </p>

                                <button
                                    className="empty-report-btn"
                                    onClick={() =>
                                        navigate(
                                            "/complaint"
                                        )
                                    }
                                >
                                    Raise Your First Complaint
                                </button>

                            </div>
                        )}

                    {/* ================= REPORTS ================= */}

                    {!loading &&
                        !error &&
                        recentReports.length > 0 && (

                            <div className="reports-list">

                                {recentReports.map(
                                    (report) => (

                                        <div
                                            className="report-card"
                                            key={report.id}
                                        >

                                            {/* ================= IMAGE ================= */}

                                            <div className="report-image-container">
                                                {report.mediaUrl ? (
                                                    <img
                                                        src={report.mediaUrl}
                                                        alt={report.category || "Complaint evidence"}
                                                        className="report-image"
                                                        onClick={() =>
                                                            setSelectedImage(report.mediaUrl)
                                                        }
                                                        onError={handleImageError}
                                                    />
                                                ) : (
                                                    <div className="no-image">
                                                        <span>📷</span>
                                                        <p>No image</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ================= REPORT INFO ================= */}

                                            <div className="report-info">

                                                <div className="report-category-row">

                                                    <h3>
                                                        {report.category ||
                                                            "Civic Issue"}
                                                    </h3>

                                                    <span
                                                        className={`status ${
                                                            report.status
                                                                ?.toLowerCase()
                                                                .replace(
                                                                    /\s+/g,
                                                                    "-"
                                                                ) ||
                                                            "unknown"
                                                        }`}
                                                    >
                                                        {report.status ||
                                                            "UNKNOWN"}
                                                    </span>

                                                </div>

                                                <p className="report-description">
                                                    {report.description ||
                                                        "No description provided."}
                                                </p>

                                                <p className="report-location">
                                                    📍 {report.address || "Address not available"}
                                                </p>

                                                <p className="report-coordinates">
                                                    {formatCoordinate(report.latitude)},{" "}
                                                    {formatCoordinate(report.longitude)}
                                                </p>

                                                <p className="report-date">
                                                    Reported:{" "}
                                                    {report.capturedAt
                                                        ? new Date(
                                                            report.capturedAt
                                                        ).toLocaleString()
                                                        : "Unknown"}
                                                </p>

                                            </div>

                                            {/* ================= ACTIONS ================= */}

                                            <div className="report-actions">

                                                <button
                                                    onClick={() =>
                                                        navigate(
                                                            `/report/${report.id}`
                                                        )
                                                    }
                                                >
                                                    View Details →
                                                </button>

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                </section>

            </main>
            {selectedImage && (
                <div
                    className="image-modal"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="image-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="image-modal-close"
                            onClick={() =>
                                setSelectedImage(null)
                            }
                        >
                            ×
                        </button>

                        <img
                            src={selectedImage}
                            alt="Complaint evidence"
                            className="image-modal-image"
                        />
                    </div>
                </div>
            )}
            <button
                className="nearby-btn"
                onClick={() => navigate("/nearby-complaints")}
            >
                📍 See Nearby Complaints
            </button>
        </div>
    );
}

export default Citizen;