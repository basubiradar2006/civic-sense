import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Citizen.css";
import ComplaintLike from "../components/ComplaintLike";


function Citizen() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    // =====================================================
    // STATE
    // =====================================================

    const [myComplaints, setMyComplaints] = useState([]);
    const [recentComplaints, setRecentComplaints] = useState([]);

    const [complaintView, setComplaintView] = useState("MY");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [user, setUser] = useState(null);

    // =====================================================
    // MEDIA POPUP
    // =====================================================

    const [selectedMedia, setSelectedMedia] = useState(null);

    // =====================================================
    // LOAD USER
    // =====================================================

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error("Failed to parse user:", error);
            }
        }
    }, []);

    // =====================================================
    // FETCH COMPLAINTS
    // =====================================================

    useEffect(() => {
        const MY_COMPLAINTS_CACHE_KEY =
            "citizenMyComplaints";

        const RECENT_COMPLAINTS_CACHE_KEY =
            "citizenRecentComplaints";

        const cachedMyComplaints =
            sessionStorage.getItem(
                MY_COMPLAINTS_CACHE_KEY
            );

        const cachedRecentComplaints =
            sessionStorage.getItem(
                RECENT_COMPLAINTS_CACHE_KEY
            );

        // Show cached data immediately when returning
        // from the complaint details page.
        if (cachedMyComplaints) {
            try {
                const parsedMyComplaints =
                    JSON.parse(cachedMyComplaints);

                if (Array.isArray(parsedMyComplaints)) {
                    setMyComplaints(parsedMyComplaints);
                }
            } catch (error) {
                console.error(
                    "Failed to read cached citizen complaints:",
                    error
                );

                sessionStorage.removeItem(
                    MY_COMPLAINTS_CACHE_KEY
                );
            }
        }

        if (cachedRecentComplaints) {
            try {
                const parsedRecentComplaints =
                    JSON.parse(cachedRecentComplaints);

                if (Array.isArray(parsedRecentComplaints)) {
                    setRecentComplaints(
                        parsedRecentComplaints
                    );
                }
            } catch (error) {
                console.error(
                    "Failed to read cached recent complaints:",
                    error
                );

                sessionStorage.removeItem(
                    RECENT_COMPLAINTS_CACHE_KEY
                );
            }
        }

        const hasCachedData =
            !!cachedMyComplaints ||
            !!cachedRecentComplaints;

        // If we have cached data, don't show the full-page
        // loading screen again when returning from View Details.
        if (hasCachedData) {
            setLoading(false);
        }

        const fetchComplaints = async () => {
            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                // Only show loading on the first visit.
                if (!hasCachedData) {
                    setLoading(true);
                }

                setError("");

                const [myResponse, recentResponse] =
                    await Promise.all([
                        fetch(
                            `${API_URL}/api/complaints/my`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    "Content-Type":
                                        "application/json",
                                },
                            }
                        ),

                        fetch(
                            `${API_URL}/api/complaints/recent`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    "Content-Type":
                                        "application/json",
                                },
                            }
                        ),
                    ]);

                // =================================================
                // AUTHENTICATION ERROR
                // =================================================

                if (
                    myResponse.status === 401 ||
                    myResponse.status === 403 ||
                    recentResponse.status === 401 ||
                    recentResponse.status === 403
                ) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    sessionStorage.removeItem(
                        MY_COMPLAINTS_CACHE_KEY
                    );
                    sessionStorage.removeItem(
                        RECENT_COMPLAINTS_CACHE_KEY
                    );

                    navigate("/");
                    return;
                }

                // =================================================
                // MY COMPLAINTS ERROR
                // =================================================

                if (!myResponse.ok) {
                    const errorText =
                        await myResponse.text();

                    console.error(
                        "My complaints error:",
                        errorText
                    );

                    throw new Error(
                        "Failed to fetch my complaints"
                    );
                }

                // =================================================
                // RECENT COMPLAINTS ERROR
                // =================================================

                if (!recentResponse.ok) {
                    const errorText =
                        await recentResponse.text();

                    console.error(
                        "Recent complaints error:",
                        errorText
                    );

                    throw new Error(
                        "Failed to fetch recent complaints"
                    );
                }

                // =================================================
                // JSON
                // =================================================

                const myData =
                    await myResponse.json();

                const recentData =
                    await recentResponse.json();

                console.log(
                    "My Complaints:",
                    myData
                );

                console.log(
                    "Recent Complaints:",
                    recentData
                );

                const freshMyComplaints =
                    Array.isArray(myData)
                        ? myData
                        : [];

                const freshRecentComplaints =
                    Array.isArray(recentData)
                        ? recentData
                        : [];

                // Update UI with fresh data.
                setMyComplaints(
                    freshMyComplaints
                );

                setRecentComplaints(
                    freshRecentComplaints
                );

                // Save latest data for instant return
                // from View Details.
                sessionStorage.setItem(
                    MY_COMPLAINTS_CACHE_KEY,
                    JSON.stringify(
                        freshMyComplaints
                    )
                );

                sessionStorage.setItem(
                    RECENT_COMPLAINTS_CACHE_KEY,
                    JSON.stringify(
                        freshRecentComplaints
                    )
                );
            } catch (err) {
                console.error(
                    "Citizen dashboard error:",
                    err
                );

                // If cached data exists, keep displaying it.
                // Only show the error on the first load.
                if (!hasCachedData) {
                    setError(
                        err.message ||
                            "Unable to load complaints."
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        fetchComplaints();
    }, [API_URL, navigate]);

    // =====================================================
    // CURRENT COMPLAINTS
    // =====================================================

    const currentComplaints =
        complaintView === "MY"
            ? myComplaints
            : recentComplaints;

    // =====================================================
    // CATEGORY LIST
    // =====================================================

    const categories = useMemo(() => {
        const uniqueCategories = [
            ...myComplaints,
            ...recentComplaints,
        ]
            .map((complaint) => complaint.category)
            .filter(Boolean);

        return [
            "ALL",
            ...new Set(uniqueCategories),
        ];
    }, [myComplaints, recentComplaints]);

    // =====================================================
    // FILTER
    // =====================================================

    const displayedComplaints =
        currentComplaints.filter((complaint) => {
            if (categoryFilter === "ALL") {
                return true;
            }

            return (
                complaint.category === categoryFilter
            );
        });

    // =====================================================
    // CHANGE VIEW
    // =====================================================

    const handleComplaintViewChange = (view) => {
        setComplaintView(view);
        setCategoryFilter("ALL");
    };

    // =====================================================
    // VIEW DETAILS
    // =====================================================

    const handleViewDetails = (complaint) => {
        navigate(`/report/${complaint.id}`, {
            state: {
                complaint,
            },
        });
    };

    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("username");

        // Clear cached citizen data on logout.
        sessionStorage.removeItem(
            "citizenMyComplaints"
        );

        sessionStorage.removeItem(
            "citizenRecentComplaints"
        );

        navigate("/");
    };

    // =====================================================
    // DISPLAY USER NAME
    // =====================================================

    const displayName =
        user?.name ||
        user?.userName ||
        user?.username ||
        user?.email ||
        localStorage.getItem("username") ||
        "Citizen";

    // =====================================================
    // STATISTICS
    // =====================================================

    const totalMyComplaints =
        myComplaints.length;

    const pendingCount =
        myComplaints.filter(
            (complaint) =>
                String(
                    complaint.status || ""
                ).toUpperCase() === "PENDING"
        ).length;

    const assignedCount =
        myComplaints.filter(
            (complaint) =>
                String(
                    complaint.status || ""
                ).toUpperCase() === "ASSIGNED"
        ).length;

    const inProgressCount =
        myComplaints.filter(
            (complaint) =>
                String(
                    complaint.status || ""
                ).toUpperCase() === "IN_PROGRESS"
        ).length;

    const completedCount =
        myComplaints.filter(
            (complaint) =>
                String(
                    complaint.status || ""
                ).toUpperCase() === "COMPLETED"
        ).length;

    const resolvedCount =
        myComplaints.filter((complaint) => {
            const status = String(
                complaint.status || ""
            ).toUpperCase();

            return (
                status === "RESOLVED" ||
                status === "COMPLETED"
            );
        }).length;

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
    // STATUS TEXT
    // =====================================================

    const getStatusText = (status) => {
        if (!status) {
            return "UNKNOWN";
        }

        return String(status).replace(/_/g, " ");
    };

    // =====================================================
    // VIDEO CHECK
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
            url.includes(".webm") ||
            url.includes(".mp4") ||
            url.includes(".mov") ||
            url.includes(".m4v") ||
            url.includes(".ogg")
        );
    };

    // =====================================================
    // OPEN MEDIA
    // =====================================================

    const openMediaPopup = (complaint) => {
        if (!complaint?.mediaUrl) {
            return;
        }

        const video = isVideoMedia(complaint);

        setSelectedMedia({
            url: complaint.mediaUrl,
            type: video ? "VIDEO" : "PHOTO",
            category:
                complaint.category ||
                "Complaint Evidence",
        });
    };

    // =====================================================
    // CLOSE MEDIA
    // =====================================================

    const closeMediaPopup = () => {
        setSelectedMedia(null);
    };

    // =====================================================
    // ESCAPE
    // =====================================================

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeMediaPopup();
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
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="citizen-page">

                <header className="citizen-header">

                    <div className="citizen-brand">

                        <div className="citizen-brand-logo">
                            CP
                        </div>

                        <div>
                            <div className="citizen-brand-name">
                                CivicProof
                            </div>

                            <div className="citizen-brand-subtitle">
                                MUNICIPAL OPERATIONS
                            </div>
                        </div>

                    </div>

                </header>

                <main className="citizen-main">

                    <div className="citizen-loading">

                        <div className="citizen-loading-spinner">
                            ◌
                        </div>

                        <h2>
                            Loading dashboard...
                        </h2>

                    </div>

                </main>

            </div>
        );
    }

    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (
        <div className="citizen-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="citizen-header">

                <div className="citizen-brand">

                    <div className="citizen-brand-logo">
                        CP
                    </div>

                    <div>

                        <div className="citizen-brand-name">
                            CivicProof
                        </div>

                        <div className="citizen-brand-subtitle">
                            MUNICIPAL OPERATIONS
                        </div>

                    </div>

                </div>

                <div className="citizen-header-right">

                    <div className="citizen-user">

                        <span className="citizen-online-dot"></span>

                        <span>
                            {displayName}
                        </span>

                    </div>

                    <span className="citizen-role-badge">
                        CITIZEN
                    </span>

                    <button
                        className="citizen-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* =================================================
                MAIN
            ================================================= */}

            <main className="citizen-main">

                {/* =================================================
                    INTRO
                ================================================= */}

                <section className="citizen-dashboard-intro">

                    <div className="citizen-eyebrow">
                        CITIZEN OPERATIONS
                    </div>

                    <h1>
                        Citizen Dashboard
                    </h1>

                    <p>
                        Track your complaints, report
                        issues and monitor civic work.
                    </p>

                </section>


                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="citizen-stats">

                    <div className="citizen-stat-card total">

                        <div className="citizen-stat-title">
                            MY COMPLAINTS
                        </div>

                        <div className="citizen-stat-number">
                            {totalMyComplaints}
                        </div>

                        <div className="citizen-stat-description">
                            All reported issues
                        </div>

                    </div>


                    <div className="citizen-stat-card pending">

                        <div className="citizen-stat-title">
                            PENDING
                        </div>

                        <div className="citizen-stat-number">
                            {pendingCount}
                        </div>

                        <div className="citizen-stat-description">
                            Awaiting verification
                        </div>

                    </div>


                    <div className="citizen-stat-card assigned">

                        <div className="citizen-stat-title">
                            ASSIGNED
                        </div>

                        <div className="citizen-stat-number">
                            {assignedCount}
                        </div>

                        <div className="citizen-stat-description">
                            Contractor assigned
                        </div>

                    </div>


                    <div className="citizen-stat-card progress">

                        <div className="citizen-stat-title">
                            ACTIVE REPAIRS
                        </div>

                        <div className="citizen-stat-number">
                            {inProgressCount}
                        </div>

                        <div className="citizen-stat-description">
                            Work currently active
                        </div>

                    </div>


                    <div className="citizen-stat-card completed">

                        <div className="citizen-stat-title">
                            COMPLETED
                        </div>

                        <div className="citizen-stat-number">
                            {completedCount}
                        </div>

                        <div className="citizen-stat-description">
                            Work completed
                        </div>

                    </div>


                    <div className="citizen-stat-card resolved">

                        <div className="citizen-stat-title">
                            RESOLVED
                        </div>

                        <div className="citizen-stat-number">
                            {resolvedCount}
                        </div>

                        <div className="citizen-stat-description">
                            Closed complaints
                        </div>

                    </div>

                </section>


                {/* =================================================
                    REPORT BUTTON
                ================================================= */}

                <div className="citizen-report-action">

                    <button
                        className="citizen-report-btn"
                        onClick={() =>
                            navigate("/complaint")
                        }
                    >
                        + Report New Complaint
                    </button>

                </div>


                {/* =================================================
                    COMPLAINT SECTION
                ================================================= */}

                <section className="citizen-complaints-section">

                    {/* =================================================
                        SECTION HEADER
                    ================================================= */}

                    <div className="citizen-section-header">

                        <div>

                            <div className="section-eyebrow">
                                FIELD ACTIVITY
                            </div>

                            <h2>
                                My Complaint Ledger
                            </h2>

                            <p>
                                Review and track your
                                civic complaints.
                            </p>

                        </div>

                        <div className="citizen-section-controls">

                            <select
                                className="citizen-category-filter"
                                value={categoryFilter}
                                onChange={(event) =>
                                    setCategoryFilter(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="ALL">
                                    All Categories
                                </option>

                                {categories
                                    .filter(
                                        (category) =>
                                            category !==
                                            "ALL"
                                    )
                                    .map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}

                            </select>

                            <span className="citizen-section-count">
                                {displayedComplaints.length}{" "}
                                {displayedComplaints.length ===
                                1
                                    ? "report"
                                    : "reports"}
                            </span>

                        </div>

                    </div>


                    {/* =================================================
                        TABS
                    ================================================= */}

                    <div className="citizen-tabs-row">

                        <div className="citizen-complaint-tabs">

                            <button
                                className={`citizen-complaint-tab ${
                                    complaintView ===
                                    "MY"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handleComplaintViewChange(
                                        "MY"
                                    )
                                }
                            >
                                My Complaints

                                <span>
                                    {
                                        myComplaints.length
                                    }
                                </span>

                            </button>


                            <button
                                className={`citizen-complaint-tab ${
                                    complaintView ===
                                    "RECENT"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handleComplaintViewChange(
                                        "RECENT"
                                    )
                                }
                            >
                                Recent Complaints

                                <span>
                                    {
                                        recentComplaints.length
                                    }
                                </span>

                            </button>

                        </div>

                    </div>


                    {/* =================================================
                        TABLE HEADER
                    ================================================= */}

                    {!error &&
                        displayedComplaints.length >
                            0 && (

                            <div className="citizen-table-header">

                                <div>
                                    COMPLAINT & LOCATION
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
                        )}


                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {error && (

                        <div className="citizen-error">

                            <h3>
                                Unable to load complaints
                            </h3>

                            <p>
                                {error}
                            </p>

                        </div>
                    )}


                    {/* =================================================
                        EMPTY
                    ================================================= */}

                    {!error &&
                        displayedComplaints.length ===
                            0 && (

                            <div className="citizen-empty-state">

                                <div className="citizen-empty-icon">
                                    □
                                </div>

                                <h3>
                                    {complaintView ===
                                    "MY"
                                        ? "No complaints yet"
                                        : "No recent complaints"}
                                </h3>

                                <p>
                                    {complaintView ===
                                    "MY"
                                        ? "Your reported complaints will appear here."
                                        : "Recent complaints will appear here."}
                                </p>

                            </div>
                        )}


                    {/* =================================================
                        COMPLAINT LIST
                    ================================================= */}

                    {!error &&
                        displayedComplaints.length >
                            0 && (

                            <div className="citizen-complaint-list">

                                {displayedComplaints.map(
                                    (complaint) => {

                                        const video =
                                            isVideoMedia(
                                                complaint
                                            );

                                        const contractorName =
                                            complaint
                                                .contractor
                                                ?.name ||
                                            complaint
                                                .contractor
                                                ?.userName ||
                                            complaint
                                                .contractor
                                                ?.email ||
                                            "Not assigned";

                                        return (

                                            <article
                                                className="citizen-complaint-card"
                                                key={
                                                    complaint.id
                                                }
                                            >

                                                {/* =================================================
                                                    FIRST COLUMN
                                                    IMAGE + COMPLAINT INFO
                                                ================================================= */}

                                                <div className="citizen-complaint-main">

                                                    {/* MEDIA */}

                                                    <div
                                                        className={`citizen-complaint-image ${
                                                            video
                                                                ? "citizen-video-media"
                                                                : "citizen-photo-media"
                                                        }`}
                                                        onClick={() =>
                                                            openMediaPopup(
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
                                                                openMediaPopup(
                                                                    complaint
                                                                );
                                                            }

                                                        }}
                                                    >

                                                        {complaint.mediaUrl ? (

                                                            video ? (

                                                                <>
                                                                    <video
                                                                        src={
                                                                            complaint.mediaUrl
                                                                        }
                                                                        muted
                                                                        preload="metadata"
                                                                        className="citizen-complaint-video-thumbnail"
                                                                    />

                                                                    <div className="citizen-video-overlay">

                                                                        <div className="citizen-video-play">
                                                                            ▶
                                                                        </div>

                                                                    </div>

                                                                    <div className="citizen-video-label">
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
                                                                />

                                                            )

                                                        ) : (

                                                            <div className="citizen-no-media">
                                                                No image
                                                            </div>

                                                        )}

                                                    </div>


                                                    {/* COMPLAINT INFORMATION */}

                                                    <div className="citizen-complaint-info">

                                                        <div className="citizen-complaint-id-row">

                                                            <span className="citizen-complaint-id">
                                                                CS-
                                                                {String(
                                                                    complaint.id
                                                                ).padStart(
                                                                    4,
                                                                    "0"
                                                                )}
                                                            </span>

                                                            <span className="citizen-category-badge">
                                                                {complaint.category ||
                                                                    "Civic Issue"}
                                                            </span>

                                                        </div>


                                                        <h3>
                                                            {complaint.description ||
                                                                "No description available."}
                                                        </h3>


                                                        <p className="citizen-complaint-location">

                                                            📍{" "}

                                                            {complaint.address
                                                                ? complaint.address
                                                                : complaint.latitude !=
                                                                        null &&
                                                                    complaint.longitude !=
                                                                        null
                                                                  ? `${complaint.latitude}, ${complaint.longitude}`
                                                                  : "Location not available"}

                                                        </p>


                                                        <div className="citizen-complaint-meta">

                                                            <span>
                                                                Reported:{" "}

                                                                {complaint.capturedAt
                                                                    ? new Date(
                                                                          complaint.capturedAt
                                                                      ).toLocaleString()
                                                                    : "Date not available"}

                                                            </span>

                                                        </div>
                                                        <ComplaintLike
                                                            complaintId={complaint.id}
                                                            initialLikeCount={complaint.likeCount}
                                                            initialLiked={complaint.liked}
                                                        />
                                                    </div>

                                                </div>


                                                {/* =================================================
                                                    STATUS
                                                ================================================= */}

                                                <div className="citizen-complaint-status">

                                                    <span
                                                        className={`citizen-status ${getStatusClass(
                                                            complaint.status
                                                        )}`}
                                                    >
                                                        {getStatusText(
                                                            complaint.status
                                                        )}
                                                    </span>

                                                </div>


                                                {/* =================================================
                                                    CONTRACTOR
                                                ================================================= */}

                                                <div className="citizen-contractor">

                                                    {complaint.contractor ? (

                                                        <>
                                                            <strong>
                                                                {
                                                                    contractorName
                                                                }
                                                            </strong>

                                                            <span>
                                                                Assigned contractor
                                                            </span>
                                                        </>

                                                    ) : (

                                                        <>
                                                            <strong className="not-assigned">
                                                                Not assigned
                                                            </strong>

                                                            <span>
                                                                Awaiting assignment
                                                            </span>
                                                        </>

                                                    )}

                                                </div>


                                                {/* =================================================
                                                    ACTION
                                                ================================================= */}

                                                <div className="citizen-complaint-action">

                                                    <button
                                                        className="citizen-view-details-btn"
                                                        onClick={() =>
                                                            handleViewDetails(
                                                                complaint
                                                            )
                                                        }
                                                    >
                                                        View Details
                                                    </button>

                                                </div>

                                            </article>
                                        );
                                    }
                                )}

                            </div>
                        )}

                </section>

            </main>


            {/* =====================================================
                MEDIA MODAL
            ===================================================== */}

            {selectedMedia && (

                <div
                    className="citizen-media-modal"
                    onClick={closeMediaPopup}
                >

                    <div
                        className="citizen-media-modal-content"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="citizen-media-modal-close"
                            onClick={closeMediaPopup}
                            aria-label="Close"
                        >
                            ×
                        </button>


                        <div className="citizen-media-modal-header">

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


                        <div className="citizen-media-modal-body">

                            {selectedMedia.type ===
                            "VIDEO" ? (

                                <video
                                    src={
                                        selectedMedia.url
                                    }
                                    controls
                                    autoPlay={false}
                                    playsInline
                                    preload="metadata"
                                    className="citizen-modal-video"
                                />

                            ) : (

                                <img
                                    src={
                                        selectedMedia.url
                                    }
                                    alt={
                                        selectedMedia.category
                                    }
                                    className="citizen-modal-image"
                                />

                            )}

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Citizen;