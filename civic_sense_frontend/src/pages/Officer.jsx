import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Officer.css";
import ComplaintLike from "../components/ComplaintLike";
import NotificationBell from "../components/NotificationBell";

function Officer() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const user = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const [complaints, setComplaints] = useState([]);
    const [contractors, setContractors] = useState([]);

    const [loading, setLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [error, setError] = useState("");

    const [selectedContractors, setSelectedContractors] =
        useState({});

    const [selectedCategory, setSelectedCategory] =
        useState("ALL");

    const [updatingId, setUpdatingId] = useState(null);

    // =====================================================
    // SLA CLOCK
    // Refreshes remaining time every minute
    // =====================================================

    const [, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    // =====================================================
    // PHOTO / VIDEO MODAL
    // =====================================================

    const [selectedMedia, setSelectedMedia] = useState(null);

    // =====================================================
    // FETCH DATA
    // =====================================================

    useEffect(() => {
        const COMPLAINTS_CACHE_KEY =
            "officerComplaints";

        const CONTRACTORS_CACHE_KEY =
            "officerContractors";

        const cachedComplaints =
            sessionStorage.getItem(
                COMPLAINTS_CACHE_KEY
            );

        const cachedContractors =
            sessionStorage.getItem(
                CONTRACTORS_CACHE_KEY
            );

        // =================================================
        // SHOW CACHED COMPLAINTS
        // =================================================

        if (cachedComplaints) {
            try {
                const parsedComplaints =
                    JSON.parse(cachedComplaints);

                if (Array.isArray(parsedComplaints)) {
                    setComplaints(parsedComplaints);
                    setHasLoadedOnce(true);
                    setLoading(false);
                }
            } catch (error) {
                console.error(
                    "Failed to read cached officer complaints:",
                    error
                );

                sessionStorage.removeItem(
                    COMPLAINTS_CACHE_KEY
                );
            }
        }

        // =================================================
        // SHOW CACHED CONTRACTORS
        // =================================================

        if (cachedContractors) {
            try {
                const parsedContractors =
                    JSON.parse(cachedContractors);

                if (Array.isArray(parsedContractors)) {
                    setContractors(parsedContractors);
                }
            } catch (error) {
                console.error(
                    "Failed to read cached contractors:",
                    error
                );

                sessionStorage.removeItem(
                    CONTRACTORS_CACHE_KEY
                );
            }
        }

        // =================================================
        // FETCH FRESH DATA
        // =================================================

        const fetchData = async () => {
            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                if (!cachedComplaints) {
                    setLoading(true);
                }

                setError("");

                const [
                    complaintsResponse,
                    contractorsResponse,
                ] = await Promise.all([
                    fetch(
                        `${API_URL}/api/complaints`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    ),

                    fetch(
                        `${API_URL}/api/users/contractors`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
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

                    sessionStorage.removeItem(
                        COMPLAINTS_CACHE_KEY
                    );

                    sessionStorage.removeItem(
                        CONTRACTORS_CACHE_KEY
                    );

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

                const freshComplaints =
                    Array.isArray(complaintsData)
                        ? complaintsData
                        : [];

                const freshContractors =
                    Array.isArray(contractorsData)
                        ? contractorsData
                        : [];

                setComplaints(freshComplaints);
                setContractors(freshContractors);

                setHasLoadedOnce(true);

                sessionStorage.setItem(
                    COMPLAINTS_CACHE_KEY,
                    JSON.stringify(
                        freshComplaints
                    )
                );

                sessionStorage.setItem(
                    CONTRACTORS_CACHE_KEY,
                    JSON.stringify(
                        freshContractors
                    )
                );

            } catch (err) {
                console.error(
                    "Officer dashboard error:",
                    err
                );

                if (!cachedComplaints) {
                    setError(
                        "Unable to load officer dashboard."
                    );
                }
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
        localStorage.removeItem("username");

        sessionStorage.removeItem(
            "officerComplaints"
        );

        sessionStorage.removeItem(
            "officerContractors"
        );

        navigate("/");
    };

    // =====================================================
    // UPDATE STATUS LOCALLY
    // =====================================================

    const updateComplaintLocally = (
        complaintId,
        newStatus,
        contractor = undefined,
        additionalData = {}
    ) => {

        setComplaints((previous) => {

            const updated = previous.map(
                (complaint) =>
                    complaint.id === complaintId
                        ? {
                            ...complaint,
                            status: newStatus,

                            ...(contractor !== undefined
                                ? { contractor }
                                : {}),

                            ...additionalData,
                        }
                        : complaint
            );

            sessionStorage.setItem(
                "officerComplaints",
                JSON.stringify(updated)
            );

            return updated;
        });
    };

    // =====================================================
    // VERIFY COMPLAINT
    // =====================================================

    const verifyComplaint = async (id) => {

        const token =
            localStorage.getItem("token");

        try {
            setUpdatingId(id);

            const response = await fetch(
                `${API_URL}/api/complaints/${id}/verify`,
                {
                    method: "PUT",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
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
    // =====================================================

    const assignContractor = async (
        complaintId
    ) => {

        const contractorId =
            selectedContractors[complaintId];

        if (!contractorId) {
            alert(
                "Please select a contractor first."
            );

            return;
        }

        const token =
            localStorage.getItem("token");

        try {
            setUpdatingId(complaintId);

            const response = await fetch(
                `${API_URL}/api/complaints/${complaintId}/assign/${contractorId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
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
    // =====================================================

    const resolveComplaint = async (id) => {

        const token =
            localStorage.getItem("token");

        try {
            setUpdatingId(id);

            const response = await fetch(
                `${API_URL}/api/complaints/${id}/resolve`,
                {
                    method: "PUT",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
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

        setSelectedContractors(
            (previous) => ({
                ...previous,
                [complaintId]: contractorId,
            })
        );
    };

    // =====================================================
    // MEDIA TYPE DETECTION
    // =====================================================

    const isVideoMedia = (complaint) => {

        const mediaType = String(
            complaint?.mediaType || ""
        ).toUpperCase();

        if (mediaType === "VIDEO") {
            return true;
        }

        const url = String(
            complaint?.mediaUrl || ""
        ).toLowerCase();

        return (
            url.includes(".mp4") ||
            url.includes(".webm") ||
            url.includes(".mov") ||
            url.includes(".m4v") ||
            url.includes(".ogg")
        );
    };

    // =====================================================
    // OPEN MEDIA
    // =====================================================

    const openMedia = (complaint) => {

        if (!complaint?.mediaUrl) {
            return;
        }

        const video =
            isVideoMedia(complaint);

        setSelectedMedia({
            url: complaint.mediaUrl,
            type: video
                ? "VIDEO"
                : "PHOTO",
            category:
                complaint.category ||
                "Complaint Evidence",
        });
    };

    // =====================================================
    // CLOSE MEDIA
    // =====================================================

    const closeMedia = () => {
        setSelectedMedia(null);
    };

    // =====================================================
    // ESCAPE TO CLOSE MODAL
    // =====================================================

    useEffect(() => {

        const handleEscape = (event) => {

            if (event.key === "Escape") {
                closeMedia();
            }
        };

        window.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {

            window.removeEventListener(
                "keydown",
                handleEscape
            );
        };

    }, []);

    // =====================================================
    // PRIORITY CLASS
    // =====================================================

    const getPriorityClass = (priority) => {

        if (!priority) {
            return "low";
        }

        return String(priority)
            .toLowerCase()
            .replace(/\s+/g, "-");
    };

    // =====================================================
    // FORMAT SLA DEADLINE
    // =====================================================

    const formatDueDate = (dueAt) => {

        if (!dueAt) {
            return "Not available";
        }

        const date =
            new Date(dueAt);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Not available";
        }

        return date.toLocaleString();
    };

    // =====================================================
    // GET REMAINING SLA TIME
    // =====================================================

    const getRemainingTime = (dueAt) => {

        if (!dueAt) {
            return "No deadline";
        }

        const deadline =
            new Date(dueAt).getTime();

        const now =
            Date.now();

        const difference =
            deadline - now;

        if (difference <= 0) {
            return "SLA BREACHED";
        }

        const totalMinutes =
            Math.floor(
                difference /
                (1000 * 60)
            );

        const days =
            Math.floor(
                totalMinutes /
                (60 * 24)
            );

        const hours =
            Math.floor(
                (
                    totalMinutes %
                    (60 * 24)
                ) / 60
            );

        const minutes =
            totalMinutes % 60;

        if (days > 0) {
            return `${days}d ${hours}h remaining`;
        }

        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        }

        return `${minutes}m remaining`;
    };

    // =====================================================
    // CHECK SLA BREACH
    // =====================================================

    const isSlaBreached = (complaint) => {

        if (
            complaint?.escalated
        ) {
            return true;
        }

        if (!complaint?.dueAt) {
            return false;
        }

        return (
            new Date(
                complaint.dueAt
            ).getTime() <= Date.now()
        );
    };

    // =====================================================
    // STATISTICS
    // =====================================================

    const totalComplaints =
        complaints.length;

    const pendingComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status ===
                "PENDING"
        ).length;

    const verifiedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status ===
                "VERIFIED"
        ).length;

    const assignedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status ===
                "ASSIGNED"
        ).length;

    const inProgressComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status ===
                "IN_PROGRESS"
        ).length;

    const completedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status ===
                "COMPLETED"
        ).length;

    const resolvedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.status ===
                "RESOLVED"
        ).length;

    const escalatedComplaints =
        complaints.filter(
            (complaint) =>
                complaint.escalated === true ||
                complaint.status ===
                "ESCALATED"
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
            value:
                "Public Property Damage",
            label:
                "Public Property Damage",
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

        return String(status)
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
                    <NotificationBell />
                    <span className="officer-user">

                        <span className="officer-user-dot">
                            ●
                        </span>

                        {user?.name ||
                            user?.userName ||
                            "Officer"}

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

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="officer-main">

                {/* =================================================
                    WELCOME
                ================================================= */}

                <section className="officer-welcome">

                    <div className="officer-eyebrow">
                        OPERATIONS OVERVIEW
                    </div>

                    <h1>
                        Officer Dashboard
                    </h1>

                    <p>
                        Verify complaints, assign
                        contractors and monitor
                        SLA deadlines.
                    </p>

                </section>

                {/* =================================================
                    STATISTICS
                ================================================= */}

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

                    {/* ESCALATED */}

                    <div className="officer-stat-card stat-escalated">

                        <span className="stat-label">
                            ESCALATED
                        </span>

                        <strong className="stat-value">
                            {escalatedComplaints}
                        </strong>

                        <span className="stat-note">
                            SLA breached
                        </span>

                    </div>

                </section>

                {/* =================================================
                    COMPLAINTS
                ================================================= */}

                <section className="officer-complaints">

                    <div className="officer-section-header">

                        <div>

                            <div className="officer-eyebrow">
                                FIELD OPERATIONS
                            </div>

                            <h2>
                                Municipal Complaint
                                Triage &amp; Dispatch
                                Ledger
                            </h2>

                            <p>
                                Review complaints,
                                monitor priority and
                                SLA deadlines.
                            </p>

                        </div>

                        <div className="officer-section-controls">

                            <select
                                className="officer-category-filter"
                                value={
                                    selectedCategory
                                }
                                onChange={(event) =>
                                    setSelectedCategory(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="ALL">
                                    All Categories
                                </option>

                                {categoryOptions.map(
                                    (category) => (
                                        <option
                                            key={
                                                category.value
                                            }
                                            value={
                                                category.value
                                            }
                                        >
                                            {
                                                category.label
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                            <span className="officer-section-count">
                                {
                                    filteredComplaints.length
                                }{" "}
                                {
                                    filteredComplaints.length ===
                                    1
                                        ? "report"
                                        : "reports"
                                }
                            </span>

                        </div>

                    </div>

                    {/* =================================================
                        LOADING
                    ================================================= */}

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

                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {!loading &&
                        error && (
                            <div className="officer-empty officer-error">

                                <div className="empty-icon">
                                    !
                                </div>

                                <h3>
                                    Unable to load
                                    dashboard
                                </h3>

                                <p>
                                    {error}
                                </p>

                            </div>
                        )}

                    {/* =================================================
                        NO COMPLAINTS
                    ================================================= */}

                    {!loading &&
                        !error &&
                        filteredComplaints.length ===
                        0 && (
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

                    {/* =================================================
                        COMPLAINT LIST
                    ================================================= */}

                    {!loading &&
                        !error &&
                        filteredComplaints.length >
                        0 && (

                            <div className="officer-complaint-list">

                                {/* TABLE HEADER */}

                                <div className="officer-ledger-head">

                                    <div>
                                        COMPLAINT &
                                        LOCATION
                                    </div>

                                    <div>
                                        STATUS
                                    </div>

                                    <div>
                                        SLA / CRITICALITY
                                    </div>

                                    <div>
                                        ASSIGNED
                                        CONTRACTOR
                                    </div>

                                    <div>
                                        ACTIONS
                                    </div>

                                </div>

                                {/* =================================================
                                    COMPLAINTS
                                ================================================= */}

                                {filteredComplaints.map(
                                    (complaint) => {

                                        const isVideo =
                                            isVideoMedia(
                                                complaint
                                            );

                                        const slaBreached =
                                            isSlaBreached(
                                                complaint
                                            );

                                        return (
                                            <div
                                                className={`officer-complaint-card ${
                                                    slaBreached
                                                        ? "complaint-sla-breached"
                                                        : ""
                                                }`}
                                                key={
                                                    complaint.id
                                                }
                                            >

                                                {/* =================================
                                                    COMPLAINT INFORMATION
                                                ================================= */}

                                                <div className="officer-complaint-main">

                                                    {/* MEDIA */}

                                                    <div className="officer-photo-wrapper">

                                                        <div
                                                            className={`officer-image ${
                                                                isVideo
                                                                    ? "officer-video-media"
                                                                    : ""
                                                            }`}
                                                            onClick={() =>
                                                                openMedia(
                                                                    complaint
                                                                )
                                                            }
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(
                                                                event
                                                            ) => {

                                                                if (
                                                                    event.key ===
                                                                        "Enter" ||
                                                                    event.key ===
                                                                        " "
                                                                ) {

                                                                    event.preventDefault();

                                                                    openMedia(
                                                                        complaint
                                                                    );
                                                                }

                                                            }}
                                                        >

                                                            {complaint.mediaUrl ? (

                                                                isVideo ? (

                                                                    <>
                                                                        <video
                                                                            src={
                                                                                complaint.mediaUrl
                                                                            }
                                                                            muted
                                                                            playsInline
                                                                            preload="metadata"
                                                                            className="officer-video-thumbnail"
                                                                            onError={
                                                                                handleImageError
                                                                            }
                                                                        />

                                                                        <div className="officer-video-overlay">

                                                                            <div className="officer-video-play">
                                                                                ▶
                                                                            </div>

                                                                        </div>

                                                                        <div className="officer-video-label">
                                                                            VIDEO
                                                                        </div>
                                                                    </>

                                                                ) : (

                                                                    <img
                                                                        src={
                                                                            complaint.mediaUrl
                                                                        }
                                                                        alt={
                                                                            complaint.category ||
                                                                            "Complaint"
                                                                        }
                                                                        onError={
                                                                            handleImageError
                                                                        }
                                                                    />

                                                                )

                                                            ) : (

                                                                <div className="no-image">

                                                                    <span>
                                                                        IMG
                                                                    </span>

                                                                    <small>
                                                                        No image
                                                                    </small>

                                                                </div>

                                                            )}

                                                        </div>

                                                        <button
                                                            className="photo-details-btn"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/report/${complaint.id}`,
                                                                    {
                                                                        state: {
                                                                            complaint,
                                                                        },
                                                                    }
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
                                                                {
                                                                    complaint.category ||
                                                                    "Civic Issue"
                                                                }
                                                            </span>

                                                        </div>

                                                                                                                <h3>
                                                            {
                                                                complaint.description ||
                                                                "No description provided."
                                                            }
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
                                                                    : complaint.createdAt
                                                                        ? new Date(
                                                                            complaint.createdAt
                                                                        ).toLocaleString()
                                                                        : "Unknown"}
                                                            </span>

                                                            {complaint.user && (
                                                                <span>
                                                                    Citizen:{" "}
                                                                    {
                                                                        complaint.user.name
                                                                    ||
                                                                        complaint.user.email
                                                                    ||
                                                                        "Citizen"}
                                                                </span>
                                                            )}

                                                        </div>

                                                        {complaint.contractor && (
                                                            <p className="officer-contractor">

                                                                Contractor:{" "}

                                                                {
                                                                    complaint.contractor.name ||
                                                                    complaint.contractor.email
                                                                }

                                                            </p>
                                                        )}

                                                        {/* ==========================================
                                                            LIKE / EXPERIENCING THIS TOO
                                                        ========================================== */}

                                                        <ComplaintLike
                                                            complaintId={
                                                                complaint.id
                                                            }
                                                            initialLikeCount={
                                                                complaint.likeCount
                                                            }
                                                            initialLiked={
                                                                complaint.liked
                                                            }
                                                        />

                                                    </div>

                                                </div>

                                                {/* =================================
                                                    STATUS
                                                ================================= */}

                                                <div className="officer-status-column">

                                                    <span
                                                        className={`officer-status ${getStatusClass(
                                                            complaint.status
                                                        )}`}
                                                    >
                                                        {
                                                            complaint.status ||
                                                            "UNKNOWN"
                                                        }
                                                    </span>

                                                    {complaint.status ===
                                                        "IN_PROGRESS" && (

                                                        <span className="waiting-label">
                                                            Contractor
                                                            working
                                                        </span>

                                                    )}

                                                    {complaint.escalated && (

                                                        <span className="waiting-label sla-status-label">
                                                            Higher officer
                                                            review
                                                        </span>

                                                    )}

                                                </div>


                                                {/* =================================
                                                    SLA / CRITICALITY
                                                ================================= */}

                                                <div className="officer-sla-column">

                                                    <span
                                                        className={`officer-priority-badge ${getPriorityClass(
                                                            complaint.priority
                                                        )}`}
                                                    >
                                                        {complaint.priority ===
                                                            "CRITICAL" && "🚨 "}
                                                        {complaint.priority ===
                                                            "HIGH" && "🔴 "}
                                                        {complaint.priority ===
                                                            "MEDIUM" && "🟡 "}
                                                        {complaint.priority ===
                                                            "LOW" && "🟢 "}
                                                        {complaint.priority || "LOW"}
                                                    </span>

                                                    <span
                                                        className={`officer-sla-badge ${
                                                            slaBreached
                                                                ? "sla-overdue"
                                                                : "sla-active"
                                                        }`}
                                                    >
                                                        {getRemainingTime(
                                                            complaint.dueAt
                                                        )}
                                                    </span>

                                                    <span className="officer-due-date">
                                                        Due: {formatDueDate(
                                                            complaint.dueAt
                                                        )}
                                                    </span>

                                                    {complaint.escalated && (
                                                        <div className="officer-escalation-alert">
                                                            <strong>
                                                                🚨 SLA BREACHED
                                                            </strong>
                                                            <span>
                                                                Escalated for higher-level review
                                                            </span>
                                                        </div>
                                                    )}

                                                </div>

                                                {/* =================================
                                                    CONTRACTOR
                                                ================================= */}

                                                <div className="officer-contractor-column">

                                                    {complaint.status ===
                                                    "VERIFIED" ? (

                                                        <>

                                                            <select
                                                                className="contractor-select"
                                                                value={
                                                                    selectedContractors[
                                                                        complaint.id
                                                                    ] ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    handleContractorChange(
                                                                        complaint.id,
                                                                        event.target
                                                                            .value
                                                                    )
                                                                }
                                                            >

                                                                <option value="">
                                                                    Select
                                                                    Contractor
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
                                                                {
                                                                    complaint.contractor.name ||
                                                                    complaint.contractor.email
                                                                }
                                                            </strong>

                                                            <span>
                                                                Assigned
                                                                contractor
                                                            </span>

                                                        </div>

                                                    ) : (

                                                        <span className="contractor-empty">
                                                            Not assigned
                                                        </span>

                                                    )}

                                                </div>

                                                {/* =================================
                                                    ACTIONS
                                                ================================= */}

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
                                        );
                                    }
                                )}

                            </div>

                        )}

                </section>

            </main>

            {/* =====================================================
                PHOTO / VIDEO MODAL
            ===================================================== */}

            {selectedMedia && (

                <div
                    className="officer-media-modal"
                    onClick={closeMedia}
                >

                    <div
                        className="officer-modal-content"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="officer-modal-close"
                            onClick={closeMedia}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <div className="officer-modal-header">

                            <span>
                                {selectedMedia.type ===
                                "VIDEO"
                                    ? "🎥 Video Evidence"
                                    : "🖼️ Photo Evidence"}
                            </span>

                            <small>
                                {
                                    selectedMedia.category
                                }
                            </small>

                        </div>

                        <div className="officer-modal-body">

                            {selectedMedia.type ===
                            "VIDEO" ? (

                                <video
                                    src={
                                        selectedMedia.url
                                    }
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="officer-modal-video"
                                />

                            ) : (

                                <img
                                    src={
                                        selectedMedia.url
                                    }
                                    alt={
                                        selectedMedia.category
                                    }
                                    className="officer-modal-image"
                                />

                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Officer;