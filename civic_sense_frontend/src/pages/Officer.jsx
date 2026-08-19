import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Officer.css";

function Officer() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const user = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const [complaints, setComplaints] = useState([]);
    const [contractors, setContractors] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedContractors, setSelectedContractors] =
        useState({});

    const [updatingId, setUpdatingId] = useState(null);

    const [selectedImage, setSelectedImage] =
        useState(null);

    // =====================================================
    // FETCH DATA
    // =====================================================

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                const [complaintsResponse, contractorsResponse] =
                    await Promise.all([
                        fetch(
                            `${API_URL}/api/complaints`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        ),

                        fetch(
                            `${API_URL}/api/users/contractors`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        ),
                    ]);

                if (
                    complaintsResponse.status === 401 ||
                    complaintsResponse.status === 403 ||
                    contractorsResponse.status === 401 ||
                    contractorsResponse.status === 403
                ) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");

                    navigate("/");
                    return;
                }

                if (!complaintsResponse.ok) {
                    throw new Error(
                        "Failed to fetch complaints"
                    );
                }

                if (!contractorsResponse.ok) {
                    throw new Error(
                        "Failed to fetch contractors"
                    );
                }

                const complaintsData =
                    await complaintsResponse.json();

                const contractorsData =
                    await contractorsResponse.json();

                setComplaints(
                    Array.isArray(complaintsData)
                        ? complaintsData
                        : []
                );

                setContractors(
                    Array.isArray(contractorsData)
                        ? contractorsData
                        : []
                );
            } catch (err) {
                console.error(
                    "Officer dashboard error:",
                    err
                );

                setError(
                    "Unable to load officer dashboard."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [API_URL, navigate]);

    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
    };

    // =====================================================
    // UPDATE STATUS LOCALLY
    // =====================================================

    const updateComplaintLocally = (
        complaintId,
        newStatus,
        contractor = undefined
    ) => {
        setComplaints((previous) =>
            previous.map((complaint) =>
                complaint.id === complaintId
                    ? {
                          ...complaint,
                          status: newStatus,
                          ...(contractor !== undefined
                              ? { contractor }
                              : {}),
                      }
                    : complaint
            )
        );
    };

    // =====================================================
    // VERIFY COMPLAINT
    // PENDING → VERIFIED
    // =====================================================

    const verifyComplaint = async (id) => {
        const token = localStorage.getItem("token");

        try {
            setUpdatingId(id);

            const response = await fetch(
                `${API_URL}/api/complaints/${id}/verify`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to verify complaint"
                );
            }

            const updatedComplaint =
                await response.json();

            updateComplaintLocally(
                id,
                updatedComplaint.status
            );
        } catch (err) {
            console.error(err);

            alert(
                "Unable to verify complaint."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // =====================================================
    // ASSIGN CONTRACTOR
    // VERIFIED → ASSIGNED
    // =====================================================

    const assignContractor = async (complaintId) => {
        const contractorId =
            selectedContractors[complaintId];

        if (!contractorId) {
            alert(
                "Please select a contractor first."
            );
            return;
        }

        const token = localStorage.getItem("token");

        try {
            setUpdatingId(complaintId);

            const response = await fetch(
                `${API_URL}/api/complaints/${complaintId}/assign/${contractorId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to assign contractor"
                );
            }

            const updatedComplaint =
                await response.json();

            const assignedContractor =
                contractors.find(
                    (contractor) =>
                        contractor.id ===
                        Number(contractorId)
                );

            updateComplaintLocally(
                complaintId,
                updatedComplaint.status,
                assignedContractor
            );
        } catch (err) {
            console.error(err);

            alert(
                "Unable to assign contractor."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // =====================================================
    // RESOLVE COMPLAINT
    // COMPLETED → RESOLVED
    // =====================================================

    const resolveComplaint = async (id) => {
        const token = localStorage.getItem("token");

        try {
            setUpdatingId(id);

            const response = await fetch(
                `${API_URL}/api/complaints/${id}/resolve`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to resolve complaint"
                );
            }

            const updatedComplaint =
                await response.json();

            updateComplaintLocally(
                id,
                updatedComplaint.status
            );
        } catch (err) {
            console.error(err);

            alert(
                "Unable to resolve complaint."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // =====================================================
    // SELECT CONTRACTOR
    // =====================================================

    const handleContractorChange = (
        complaintId,
        contractorId
    ) => {
        setSelectedContractors((previous) => ({
            ...previous,
            [complaintId]: contractorId,
        }));
    };

    // =====================================================
    // STATISTICS
    // =====================================================

    const totalComplaints =
        complaints.length;

    const pendingComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status === "PENDING"
        ).length;

    const verifiedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status === "VERIFIED"
        ).length;

    const assignedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status === "ASSIGNED"
        ).length;

    const inProgressComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status === "IN_PROGRESS"
        ).length;

    const completedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status === "COMPLETED"
        ).length;

    const resolvedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status === "RESOLVED"
        ).length;

    // =====================================================
    // FORMAT LOCATION
    // =====================================================

    const formatCoordinate = (value) => {
        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            return value.toFixed(4);
        }

        return value || "N/A";
    };

    // =====================================================
    // STATUS CLASS
    // =====================================================

    const getStatusClass = (status) => {
        if (!status) {
            return "unknown";
        }

        return status
            .toLowerCase()
            .replace(/\s+/g, "-");
    };

    // =====================================================
    // IMAGE ERROR
    // =====================================================

    const handleImageError = (event) => {
        event.currentTarget.style.display =
            "none";

        const container =
            event.currentTarget.parentElement;

        if (container) {
            container.classList.add(
                "image-error"
            );
        }
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="officer-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="officer-header">

                <div className="officer-logo">
                    CivicProof
                </div>

                <div className="officer-header-right">

                    <span className="officer-user">
                        🧑‍💼{" "}
                        {user?.name || "Officer"}
                    </span>

                    <button
                        className="officer-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="officer-main">

                {/* =================================================
                    WELCOME
                ================================================= */}

                <section className="officer-welcome">

                    <div>
                        <h1>
                            Officer Dashboard
                        </h1>

                        <p>
                            Verify complaints, assign
                            contractors and confirm
                            completed work.
                        </p>
                    </div>

                </section>

                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="officer-stats">

                    <div className="officer-stat-card">
                        <h2>
                            {totalComplaints}
                        </h2>
                        <p>Total</p>
                    </div>

                    <div className="officer-stat-card">
                        <h2>
                            {pendingComplaints}
                        </h2>
                        <p>Pending</p>
                    </div>

                    <div className="officer-stat-card">
                        <h2>
                            {verifiedComplaints}
                        </h2>
                        <p>Verified</p>
                    </div>

                    <div className="officer-stat-card">
                        <h2>
                            {assignedComplaints}
                        </h2>
                        <p>Assigned</p>
                    </div>

                    <div className="officer-stat-card">
                        <h2>
                            {inProgressComplaints}
                        </h2>
                        <p>In Progress</p>
                    </div>

                    <div className="officer-stat-card">
                        <h2>
                            {completedComplaints}
                        </h2>
                        <p>Completed</p>
                    </div>

                    <div className="officer-stat-card">
                        <h2>
                            {resolvedComplaints}
                        </h2>
                        <p>Resolved</p>
                    </div>

                </section>

                {/* =================================================
                    COMPLAINTS
                ================================================= */}

                <section className="officer-complaints">

                    <div className="officer-section-title">

                        <div>
                            <h2>
                                Complaint Management
                            </h2>

                            <p>
                                Review and manage civic
                                complaints.
                            </p>
                        </div>

                    </div>

                    {/* LOADING */}

                    {loading && (
                        <div className="officer-empty">
                            <h3>
                                Loading complaints...
                            </h3>
                        </div>
                    )}

                    {/* ERROR */}

                    {!loading && error && (
                        <div className="officer-empty officer-error">
                            <h3>
                                Unable to load dashboard
                            </h3>

                            <p>
                                {error}
                            </p>
                        </div>
                    )}

                    {/* NO COMPLAINTS */}

                    {!loading &&
                        !error &&
                        complaints.length === 0 && (
                            <div className="officer-empty">

                                <div className="empty-icon">
                                    📋
                                </div>

                                <h3>
                                    No complaints found
                                </h3>

                            </div>
                        )}

                    {/* COMPLAINTS */}

                    {!loading &&
                        !error &&
                        complaints.length > 0 && (

                            <div className="officer-complaint-list">

                                {complaints.map(
                                    (complaint) => (

                                        <div
                                            className="officer-complaint-card"
                                            key={
                                                complaint.id
                                            }
                                        >

                                            {/* IMAGE */}

                                            <div className="officer-image">

                                                {complaint.mediaUrl ? (
                                                    <img
                                                        src={
                                                            complaint.mediaUrl
                                                        }
                                                        alt={
                                                            complaint.category ||
                                                            "Complaint"
                                                        }
                                                        onClick={() =>
                                                            setSelectedImage(
                                                                complaint.mediaUrl
                                                            )
                                                        }
                                                        onError={
                                                            handleImageError
                                                        }
                                                    />
                                                ) : (
                                                    <div className="no-image">
                                                        📷
                                                        <span>
                                                            No image
                                                        </span>
                                                    </div>
                                                )}

                                            </div>

                                            {/* INFORMATION */}

                                            <div className="officer-info">

                                                <div className="officer-category-row">

                                                    <h3>
                                                        {complaint.category ||
                                                            "Civic Issue"}
                                                    </h3>

                                                    <span
                                                        className={`officer-status ${getStatusClass(
                                                            complaint.status
                                                        )}`}
                                                    >
                                                        {complaint.status ||
                                                            "UNKNOWN"}
                                                    </span>

                                                </div>

                                                <p className="officer-description">

                                                    {complaint.description ||
                                                        "No description provided."}

                                                </p>

                                                <p className="officer-location">

                                                    📍{" "}

                                                    {complaint.address ? (
                                                        complaint.address
                                                    ) : (
                                                        <>
                                                            {formatCoordinate(
                                                                complaint.latitude
                                                            )}

                                                            {", "}

                                                            {formatCoordinate(
                                                                complaint.longitude
                                                            )}
                                                        </>
                                                    )}

                                                </p>

                                                <p className="officer-date">

                                                    Reported:{" "}

                                                    {complaint.capturedAt
                                                        ? new Date(
                                                              complaint.capturedAt
                                                          ).toLocaleString()
                                                        : "Unknown"}

                                                </p>

                                                {complaint.user && (
                                                    <p className="officer-citizen">
                                                        👤 Citizen:{" "}
                                                        {complaint.user.name ||
                                                            complaint.user.email ||
                                                            "Citizen"}
                                                    </p>
                                                )}

                                                {complaint.contractor && (
                                                    <p className="officer-contractor">
                                                        👷 Contractor:{" "}
                                                        {complaint.contractor.name ||
                                                            complaint.contractor.email}
                                                    </p>
                                                )}

                                            </div>

                                            {/* ACTIONS */}

                                            <div className="officer-actions">

                                                {/* PENDING */}

                                                {complaint.status ===
                                                    "PENDING" && (

                                                    <button
                                                        className="verify-btn"
                                                        disabled={
                                                            updatingId ===
                                                            complaint.id
                                                        }
                                                        onClick={() =>
                                                            verifyComplaint(
                                                                complaint.id
                                                            )
                                                        }
                                                    >
                                                        {updatingId ===
                                                        complaint.id
                                                            ? "Updating..."
                                                            : "Verify Complaint"}
                                                    </button>
                                                )}

                                                {/* VERIFIED */}

                                                {complaint.status ===
                                                    "VERIFIED" && (

                                                    <>
                                                        <select
                                                            className="contractor-select"
                                                            value={
                                                                selectedContractors[
                                                                    complaint
                                                                        .id
                                                                ] || ""
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                handleContractorChange(
                                                                    complaint.id,
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        >

                                                            <option value="">
                                                                Select Contractor
                                                            </option>

                                                            {contractors.map(
                                                                (
                                                                    contractor
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            contractor.id
                                                                        }
                                                                        value={
                                                                            contractor.id
                                                                        }
                                                                    >
                                                                        {
                                                                            contractor.name
                                                                        }
                                                                    </option>
                                                                )
                                                            )}

                                                        </select>

                                                        <button
                                                            className="assign-btn"
                                                            disabled={
                                                                updatingId ===
                                                                complaint.id
                                                            }
                                                            onClick={() =>
                                                                assignContractor(
                                                                    complaint.id
                                                                )
                                                            }
                                                        >
                                                            {updatingId ===
                                                            complaint.id
                                                                ? "Assigning..."
                                                                : "Assign Contractor"}
                                                        </button>
                                                    </>
                                                )}

                                                {/* COMPLETED */}

                                                {complaint.status ===
                                                    "COMPLETED" && (

                                                    <button
                                                        className="resolve-btn"
                                                        disabled={
                                                            updatingId ===
                                                            complaint.id
                                                        }
                                                        onClick={() =>
                                                            resolveComplaint(
                                                                complaint.id
                                                            )
                                                        }
                                                    >
                                                        {updatingId ===
                                                        complaint.id
                                                            ? "Resolving..."
                                                            : "Confirm & Resolve"}
                                                    </button>
                                                )}

                                                {/* IN PROGRESS */}

                                                {complaint.status ===
                                                    "IN_PROGRESS" && (

                                                    <span className="waiting-label">
                                                        ⏳ Contractor
                                                        working
                                                    </span>
                                                )}

                                                {/* ASSIGNED */}

                                                {complaint.status ===
                                                    "ASSIGNED" && (

                                                    <span className="waiting-label">
                                                        👷 Assigned
                                                    </span>
                                                )}

                                                {/* RESOLVED */}

                                                {complaint.status ===
                                                    "RESOLVED" && (

                                                    <span className="resolved-label">
                                                        ✓ Resolved
                                                    </span>
                                                )}

                                                <button
                                                    className="details-btn"
                                                    onClick={() =>
                                                        navigate(
                                                            `/report/${complaint.id}`
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

            {/* =================================================
                IMAGE MODAL
            ================================================= */}

            {selectedImage && (

                <div
                    className="officer-image-modal"
                    onClick={() =>
                        setSelectedImage(null)
                    }
                >

                    <div
                        className="officer-modal-content"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="officer-modal-close"
                            onClick={() =>
                                setSelectedImage(null)
                            }
                        >
                            ×
                        </button>

                        <img
                            src={selectedImage}
                            alt="Complaint"
                            className="officer-modal-image"
                        />

                    </div>

                </div>
            )}

        </div>
    );
}

export default Officer;