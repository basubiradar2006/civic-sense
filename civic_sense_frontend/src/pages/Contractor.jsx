import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Contractor.css";

function Contractor() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const user = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    // ==========================================
    // FETCH ASSIGNED PROJECTS
    // ==========================================

    useEffect(() => {
        const fetchProjects = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                const response = await fetch(
                    `${API_URL}/api/complaints/assigned`,
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
                        "Failed to fetch assigned projects"
                    );
                }

                const data = await response.json();

                console.log("Assigned Projects:", data);

                setProjects(
                    Array.isArray(data) ? data : []
                );
            } catch (err) {
                console.error(
                    "Contractor project fetch error:",
                    err
                );

                setError(
                    "Unable to load assigned projects."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
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
    // UPDATE PROJECT STATUS
    // ==========================================

    const updateStatus = async (projectId, newStatus) => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        try {
            setUpdatingId(projectId);

            const response = await fetch(
                `${API_URL}/api/complaints/${projectId}/status`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        status: newStatus,
                    }),
                }
            );

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
                    "Failed to update project status"
                );
            }

            // Update UI immediately
            setProjects((previousProjects) =>
                previousProjects.map((project) =>
                    project.id === projectId
                        ? {
                              ...project,
                              status: newStatus,
                          }
                        : project
                )
            );
        } catch (err) {
            console.error(
                "Status update error:",
                err
            );

            alert(
                "Unable to update project status."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // ==========================================
    // STATISTICS
    // ==========================================

    const totalProjects = projects.length;

    const pendingProjects = projects.filter(
        (project) =>
            project.status === "PENDING" ||
            project.status === "ASSIGNED"
    ).length;

    const inProgressProjects = projects.filter(
        (project) =>
            project.status === "IN_PROGRESS" ||
            project.status === "IN PROGRESS"
    ).length;

    const completedProjects = projects.filter(
        (project) =>
            project.status === "RESOLVED" ||
            project.status === "COMPLETED"
    ).length;

    // ==========================================
    // RECENT PROJECTS
    // ==========================================

    const recentProjects = [...projects]
        .sort((a, b) => {
            const dateA = a.capturedAt
                ? new Date(a.capturedAt).getTime()
                : 0;

            const dateB = b.capturedAt
                ? new Date(b.capturedAt).getTime()
                : 0;

            return dateB - dateA;
        })
        .slice(0, 6);

    // ==========================================
    // FORMAT COORDINATES
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
    // STATUS CLASS
    // ==========================================

    const getStatusClass = (status) => {
        if (!status) return "unknown";

        return status
            .toLowerCase()
            .replace(/\s+/g, "-");
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="contractor-page">

            {/* ================= HEADER ================= */}

            <header className="contractor-header">

                <div className="contractor-logo">
                    CivicProof
                </div>

                <div className="header-right">

                    <span className="contractor-user">
                        👷{" "}
                        {user?.name || "Contractor"}
                    </span>

                    <button
                        className="contractor-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>

            {/* ================= MAIN ================= */}

            <main className="contractor-main">

                {/* ================= WELCOME ================= */}

                <section className="contractor-welcome">

                    <div className="welcome-content">

                        <h1>
                            Welcome,{" "}
                            {user?.name || "Contractor"}
                        </h1>

                        <p>
                            Manage your assigned civic
                            projects and track their progress.
                        </p>

                    </div>

                </section>

                {/* ================= STATISTICS ================= */}

                <section className="contractor-stats">

                    <div className="contractor-stat-card">

                        <h2>
                            {totalProjects}
                        </h2>

                        <p>
                            Total Projects
                        </p>

                    </div>

                    <div className="contractor-stat-card">

                        <h2>
                            {pendingProjects}
                        </h2>

                        <p>
                            Assigned
                        </p>

                    </div>

                    <div className="contractor-stat-card">

                        <h2>
                            {inProgressProjects}
                        </h2>

                        <p>
                            In Progress
                        </p>

                    </div>

                    <div className="contractor-stat-card">

                        <h2>
                            {completedProjects}
                        </h2>

                        <p>
                            Completed
                        </p>

                    </div>

                </section>

                {/* ================= PROJECTS ================= */}

                <section className="contractor-projects">

                    <div className="contractor-section-title">

                        <div>
                            <h2>
                                Assigned Projects
                            </h2>

                            <p>
                                Complaints assigned to you
                            </p>
                        </div>

                    </div>

                    {/* ================= LOADING ================= */}

                    {loading && (
                        <div className="contractor-empty">

                            <h3>
                                Loading projects...
                            </h3>

                        </div>
                    )}

                    {/* ================= ERROR ================= */}

                    {!loading && error && (
                        <div className="contractor-empty contractor-error">

                            <h3>
                                Unable to load projects
                            </h3>

                            <p>
                                {error}
                            </p>

                        </div>
                    )}

                    {/* ================= NO PROJECTS ================= */}

                    {!loading &&
                        !error &&
                        projects.length === 0 && (

                            <div className="contractor-empty">

                                <div className="empty-icon">
                                    📋
                                </div>

                                <h3>
                                    No projects assigned
                                </h3>

                                <p>
                                    Projects assigned to you
                                    will appear here.
                                </p>

                            </div>
                        )}

                    {/* ================= PROJECT LIST ================= */}

                    {!loading &&
                        !error &&
                        recentProjects.length > 0 && (

                            <div className="contractor-project-list">

                                {recentProjects.map(
                                    (project) => (

                                        <div
                                            className="contractor-project-card"
                                            key={project.id}
                                        >

                                            {/* IMAGE */}

                                            <div className="contractor-project-image">

                                                {project.mediaUrl ? (

                                                    <img
                                                        src={
                                                            project.mediaUrl
                                                        }
                                                        alt={
                                                            project.category ||
                                                            "Civic issue"
                                                        }
                                                        onClick={() =>
                                                            setSelectedImage(
                                                                project.mediaUrl
                                                            )
                                                        }
                                                        onError={
                                                            handleImageError
                                                        }
                                                    />

                                                ) : (

                                                    <div className="contractor-no-image">

                                                        <span>
                                                            📷
                                                        </span>

                                                        <p>
                                                            No image
                                                        </p>

                                                    </div>

                                                )}

                                            </div>

                                            {/* PROJECT INFORMATION */}

                                            <div className="contractor-project-info">

                                                <div className="contractor-category-row">

                                                    <h3>
                                                        {project.category ||
                                                            "Civic Issue"}
                                                    </h3>

                                                    <span
                                                        className={`contractor-status ${getStatusClass(
                                                            project.status
                                                        )}`}
                                                    >
                                                        {project.status ||
                                                            "UNKNOWN"}
                                                    </span>

                                                </div>

                                                <p className="contractor-description">

                                                    {project.description ||
                                                        "No description provided."}

                                                </p>

                                                {/* LOCATION */}

                                                <p className="contractor-location">

                                                    📍{" "}

                                                    {project.address ? (
                                                        project.address
                                                    ) : (
                                                        <>
                                                            {formatCoordinate(
                                                                project.latitude
                                                            )}

                                                            {", "}

                                                            {formatCoordinate(
                                                                project.longitude
                                                            )}
                                                        </>
                                                    )}

                                                </p>

                                                {/* DATE */}

                                                <p className="contractor-date">

                                                    Reported:{" "}

                                                    {project.capturedAt
                                                        ? new Date(
                                                              project.capturedAt
                                                          ).toLocaleString()
                                                        : "Unknown"}

                                                </p>

                                                {/* CITIZEN */}

                                                {project.user && (
                                                    <p className="contractor-citizen">

                                                        👤 Citizen:{" "}

                                                        {project.user.name ||
                                                            project.user.userName ||
                                                            "Citizen"}

                                                    </p>
                                                )}

                                            </div>

                                            {/* ACTIONS */}

                                            <div className="contractor-project-actions">

                                                {project.status ===
                                                    "ASSIGNED" ||
                                                project.status ===
                                                    "PENDING" ? (

                                                    <button
                                                        className="action-start"
                                                        disabled={
                                                            updatingId ===
                                                            project.id
                                                        }
                                                        onClick={() =>
                                                            updateStatus(
                                                                project.id,
                                                                "IN_PROGRESS"
                                                            )
                                                        }
                                                    >
                                                        {updatingId ===
                                                        project.id
                                                            ? "Updating..."
                                                            : "Start Work"}
                                                    </button>

                                                ) : project.status ===
                                                      "IN_PROGRESS" ||
                                                  project.status ===
                                                      "IN PROGRESS" ? (

                                                    <button
                                                        className="action-complete"
                                                        disabled={
                                                            updatingId ===
                                                            project.id
                                                        }
                                                        onClick={() =>
                                                            updateStatus(
                                                                project.id,
                                                                "RESOLVED"
                                                            )
                                                        }
                                                    >
                                                        {updatingId ===
                                                        project.id
                                                            ? "Updating..."
                                                            : "Mark Completed"}
                                                    </button>

                                                ) : project.status ===
                                                      "RESOLVED" ||
                                                  project.status ===
                                                      "COMPLETED" ? (

                                                    <span className="completed-label">
                                                        ✓ Completed
                                                    </span>

                                                ) : (

                                                    <button
                                                        className="action-view"
                                                        onClick={() =>
                                                            navigate(
                                                                `/report/${project.id}`
                                                            )
                                                        }
                                                    >
                                                        View Details →
                                                    </button>

                                                )}

                                                <button
                                                    className="action-details"
                                                    onClick={() =>
                                                        navigate(
                                                            `/report/${project.id}`
                                                        )
                                                    }
                                                >
                                                    View Details
                                                </button>

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                </section>

            </main>

            {/* ================= IMAGE MODAL ================= */}

            {selectedImage && (

                <div
                    className="contractor-image-modal"
                    onClick={() =>
                        setSelectedImage(null)
                    }
                >

                    <div
                        className="contractor-image-modal-content"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <button
                            className="contractor-image-modal-close"
                            onClick={() =>
                                setSelectedImage(null)
                            }
                        >
                            ×
                        </button>

                        <img
                            src={selectedImage}
                            alt="Complaint evidence"
                            className="contractor-modal-image"
                        />

                    </div>

                </div>
            )}

        </div>
    );
}

export default Contractor;