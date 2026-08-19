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

    // CATEGORY FILTER
    const [selectedCategory, setSelectedCategory] =
        useState("ALL");

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
    // CATEGORY FILTER
    // =====================================================

    const categoryOptions = [
        {
            value: "Road Damage",
            label: "Road Damage",
        },
        {
            value: "Garbage",
            label: "Garbage / Waste",
        },
        {
            value: "Street Light",
            label: "Street Light",
        },
        {
            value: "Water Leakage",
            label: "Water Leakage",
        },
        {
            value: "Drainage",
            label: "Drainage Problem",
        },
        {
            value: "Illegal Dumping",
            label: "Illegal Dumping",
        },
        {
            value: "Public Property Damage",
            label: "Public Property Damage",
        },
        {
            value: "Other",
            label: "Other",
        },
    ];

    const filteredComplaints =
        selectedCategory === "ALL"
            ? complaints
            : complaints.filter(
                (complaint) =>
                    complaint.category ===
                    selectedCategory
            );

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

            {/* HEADER */}

            <header className="officer-header">

                <div className="officer-brand">

                    <div className="officer-brand-mark">
                        CP
                    </div>

                    <div>
                        <div className="officer-logo">
                            CivicProof
                        </div>

                        <div className="officer-brand-subtitle">
                            Municipal Operations
                        </div>
                    </div>

                </div>

                <div className="officer-header-right">

                    <span className="officer-user">

                        <span className="officer-user-dot">
                            ●
                        </span>

                        {user?.name || "Officer"}

                        <span className="officer-role">
                            OFFICER
                        </span>

                    </span>

                    <button
                        className="officer-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>

            {/* MAIN */}

            <main className="officer-main">

                {/* WELCOME */}

                <section className="officer-welcome">

                    <div className="officer-eyebrow">
                        OPERATIONS OVERVIEW
                    </div>

                    <h1>
                        Officer Dashboard
                    </h1>

                    <p>
                        Verify complaints, assign
                        contractors and confirm
                        completed work.
                    </p>

                </section>

                {/* STATISTICS */}

                <section className="officer-stats">

                    <div className="officer-stat-card stat-total">

                        <span className="stat-label">
                            TOTAL COMPLAINTS
                        </span>

                        <strong className="stat-value">
                            {totalComplaints}
                        </strong>

                        <span className="stat-note">
                            All reported issues
                        </span>

                    </div>

                    <div className="officer-stat-card stat-pending">

                        <span className="stat-label">
                            PENDING TRIAGE
                        </span>

                        <strong className="stat-value">
                            {pendingComplaints}
                        </strong>

                        <span className="stat-note">
                            Awaiting verification
                        </span>

                    </div>

                    <div className="officer-stat-card stat-verified">

                        <span className="stat-label">
                            VERIFIED
                        </span>

                        <strong className="stat-value">
                            {verifiedComplaints}
                        </strong>

                        <span className="stat-note">
                            Ready for dispatch
                        </span>

                    </div>

                    <div className="officer-stat-card stat-assigned">

                        <span className="stat-label">
                            ASSIGNED
                        </span>

                        <strong className="stat-value">
                            {assignedComplaints}
                        </strong>

                        <span className="stat-note">
                            Contractor assigned
                        </span>

                    </div>

                    <div className="officer-stat-card stat-progress">

                        <span className="stat-label">
                            ACTIVE REPAIRS
                        </span>

                        <strong className="stat-value">
                            {inProgressComplaints}
                        </strong>

                        <span className="stat-note">
                            Contractors working
                        </span>

                    </div>

                    <div className="officer-stat-card stat-completed">

                        <span className="stat-label">
                            COMPLETED
                        </span>

                        <strong className="stat-value">
                            {completedComplaints}
                        </strong>

                        <span className="stat-note">
                            Awaiting confirmation
                        </span>

                    </div>

                    <div className="officer-stat-card stat-resolved">

                        <span className="stat-label">
                            RESOLVED
                        </span>

                        <strong className="stat-value">
                            {resolvedComplaints}
                        </strong>

                        <span className="stat-note">
                            Closed complaints
                        </span>

                    </div>

                </section>

                {/* COMPLAINTS */}

                <section className="officer-complaints">

                    <div className="officer-section-header">

                        <div>

                            <div className="officer-eyebrow">
                                FIELD OPERATIONS
                            </div>

                            <h2>
                                Municipal Complaint Triage
                                &amp; Dispatch Ledger
                            </h2>

                            <p>
                                Review and manage civic
                                complaints.
                            </p>

                        </div>

                        {/* CATEGORY FILTER */}

                        <div className="officer-section-controls">

                            <select
                                className="officer-category-filter"
                                value={selectedCategory}
                                onChange={(event) =>
                                    setSelectedCategory(event.target.value)
                                }
                            >
                                <option value="ALL">
                                    All Categories
                                </option>

                                {categoryOptions.map((category) => (
                                    <option
                                        key={category.value}
                                        value={category.value}
                                    >
                                        {category.label}
                                    </option>
                                ))}
                            </select>

                            <span className="officer-section-count">
                                {filteredComplaints.length} reports
                            </span>

                        </div>

                    </div>

                    {/* LOADING */}

                    {loading && (
                        <div className="officer-empty">

                            <div className="empty-icon">
                                ◌
                            </div>

                            <h3>
                                Loading complaints...
                            </h3>

                        </div>
                    )}

                    {/* ERROR */}

                    {!loading && error && (
                        <div className="officer-empty officer-error">

                            <div className="empty-icon">
                                !
                            </div>

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
                        filteredComplaints.length === 0 && (

                            <div className="officer-empty">

                                <div className="empty-icon">
                                    □
                                </div>

                                <h3>
                                    {selectedCategory ===
                                    "ALL"
                                        ? "No complaints found"
                                        : `No ${selectedCategory} complaints found`}
                                </h3>

                            </div>
                        )}

                    {/* COMPLAINT LIST */}

                    {!loading &&
                        !error &&
                        filteredComplaints.length > 0 && (

                            <div className="officer-complaint-list">

                                {/* TABLE HEADER */}

                                <div className="officer-ledger-head">

                                    <div>
                                        COMPLAINT &amp;
                                        LOCATION
                                    </div>

                                    <div>
                                        STATUS
                                    </div>

                                    <div>
                                        ASSIGNED CONTRACTOR
                                    </div>

                                    <div>
                                        ACTIONS
                                    </div>

                                </div>

                                {/* COMPLAINTS */}

                                {filteredComplaints.map(
                                    (complaint) => (

                                        <div
                                            className="officer-complaint-card"
                                            key={
                                                complaint.id
                                            }
                                        >

                                            {/* COMPLAINT INFORMATION */}

                                            <div className="officer-complaint-main">

                                                {/* IMAGE */}

                                                <div className="officer-photo-wrapper">

                                                    <div className="officer-image">

                                                        {complaint.mediaUrl ? (
                                                            <img
                                                                src={complaint.mediaUrl}
                                                                alt={
                                                                    complaint.category ||
                                                                    "Complaint"
                                                                }
                                                                onClick={() =>
                                                                    setSelectedImage(
                                                                        complaint.mediaUrl
                                                                    )
                                                                }
                                                                onError={handleImageError}
                                                            />
                                                        ) : (
                                                            <div className="no-image">
                                                                <span>IMG</span>
                                                                <small>No image</small>
                                                            </div>
                                                        )}

                                                    </div>

                                                    <button
                                                        className="photo-details-btn"
                                                        onClick={() =>
                                                            navigate(
                                                                `/report/${complaint.id}`
                                                            )
                                                        }
                                                    >
                                                        View Details
                                                    </button>

                                                </div>
                                                {/* INFORMATION */}

                                                <div className="officer-info">

                                                    <div className="officer-id-row">

                                                        <span className="officer-complaint-id">
                                                            CS-
                                                            {String(
                                                                complaint.id
                                                            ).padStart(
                                                                4,
                                                                "0"
                                                            )}
                                                        </span>

                                                        <span className="officer-category">
                                                            {complaint.category ||
                                                                "Civic Issue"}
                                                        </span>

                                                    </div>

                                                    <h3>
                                                        {complaint.description ||
                                                            "No description provided."}
                                                    </h3>

                                                    <p className="officer-location">

                                                        <span className="location-pin">
                                                            ●
                                                        </span>

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

                                                    <div className="officer-meta-row">

                                                        <span>
                                                            Reported:{" "}
                                                            {complaint.capturedAt
                                                                ? new Date(
                                                                      complaint.capturedAt
                                                                  ).toLocaleString()
                                                                : "Unknown"}
                                                        </span>

                                                        {complaint.user && (
                                                            <span>
                                                                Citizen:{" "}
                                                                {complaint
                                                                    .user
                                                                    .name ||
                                                                    complaint
                                                                        .user
                                                                        .email ||
                                                                    "Citizen"}
                                                            </span>
                                                        )}

                                                    </div>

                                                    {complaint.contractor && (
                                                        <p className="officer-contractor">

                                                            Contractor:{" "}

                                                            {complaint
                                                                .contractor
                                                                .name ||
                                                                complaint
                                                                    .contractor
                                                                    .email}

                                                        </p>
                                                    )}

                                                </div>

                                            </div>

                                            {/* STATUS */}

                                            <div className="officer-status-column">

                                                <span
                                                    className={`officer-status ${getStatusClass(
                                                        complaint.status
                                                    )}`}
                                                >
                                                    {complaint.status ||
                                                        "UNKNOWN"}
                                                </span>

                                                {complaint.status ===
                                                    "IN_PROGRESS" && (

                                                    <span className="waiting-label">
                                                        Contractor working
                                                    </span>

                                                )}

                                                

                                                {complaint.status ===
                                                    "RESOLVED" && (

                                                    <span className="resolved-label">
                                                        ✓ Resolved
                                                    </span>

                                                )}

                                            </div>

                                            {/* CONTRACTOR */}

                                            <div className="officer-contractor-column">

                                                {complaint.status ===
                                                "VERIFIED" ? (

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

                                                ) : complaint.contractor ? (

                                                    <div className="contractor-display">

                                                        <strong>
                                                            {complaint
                                                                .contractor
                                                                .name ||
                                                                complaint
                                                                    .contractor
                                                                    .email}
                                                        </strong>

                                                        <span>
                                                            Assigned contractor
                                                        </span>

                                                    </div>

                                                ) : (

                                                    <span className="contractor-empty">
                                                        Not assigned
                                                    </span>

                                                )}

                                            </div>

                                            {/* ACTIONS */}

                                            <div className="officer-actions">

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

                                                <button
                                                    className="details-btn"
                                                    onClick={() =>
                                                        navigate(
                                                            `/report/${complaint.id}`
                                                        )
                                                    }
                                                >
                                                    Inspect Dossier
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>
                        )}

                </section>

            </main>

            {/* IMAGE MODAL */}

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