import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "../styles/Contractor.css";
import ComplaintLike from "../components/ComplaintLike";

function Contractor() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const user = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    // =====================================================
    // STATE
    // =====================================================

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // PHOTO / VIDEO MODAL
    const [selectedMedia, setSelectedMedia] =
        useState(null);

    const [updatingId, setUpdatingId] =
        useState(null);

    const [selectedWorkPhotos, setSelectedWorkPhotos] =
        useState([]);

    const [uploadingPhotos, setUploadingPhotos] =
        useState(false);

    const [activeView, setActiveView] =
        useState("MY");

    const [selectedCategory, setSelectedCategory] =
        useState("ALL");

    // =====================================================
    // FETCH COMPLAINTS
    // =====================================================

    useEffect(() => {
        const fetchComplaints = async () => {
            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${API_URL}/api/complaints`,
                    {
                        method: "GET",
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
                        "Failed to fetch complaints"
                    );
                }

                const data =
                    await response.json();

                console.log(
                    "Contractor Complaints:",
                    data
                );

                setProjects(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (err) {
                console.error(
                    "Contractor complaint fetch error:",
                    err
                );

                setError(
                    "Unable to load complaints."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchComplaints();
    }, [API_URL, navigate]);

    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("username");

        navigate("/");
    };

    // =====================================================
    // CURRENT CONTRACTOR ID
    // =====================================================

    const currentContractorId =
        user?.id ??
        user?.userId ??
        user?.contractorId ??
        null;

    // =====================================================
    // CHECK ASSIGNED TO ME
    // =====================================================

    const isAssignedToMe = (project) => {
        const contractor =
            project?.contractor ||
            project?.assignedContractor ||
            project?.assignedTo ||
            null;

        if (!contractor) {
            return false;
        }

        if (
            typeof contractor === "object"
        ) {
            const contractorId =
                contractor.id ??
                contractor.userId ??
                contractor.contractorId;

            if (
                contractorId != null &&
                currentContractorId != null
            ) {
                return (
                    Number(contractorId) ===
                    Number(currentContractorId)
                );
            }

            const contractorUsername =
                contractor.userName ||
                contractor.username ||
                contractor.email;

            const currentUsername =
                user?.userName ||
                user?.username ||
                user?.email;

            if (
                contractorUsername &&
                currentUsername
            ) {
                return (
                    contractorUsername ===
                    currentUsername
                );
            }
        }

        if (
            typeof contractor === "number" ||
            typeof contractor === "string"
        ) {
            return (
                currentContractorId != null &&
                Number(contractor) ===
                    Number(currentContractorId)
            );
        }

        return false;
    };

    // =====================================================
    // CONTRACTOR NAME
    // =====================================================

    const getContractorName = (project) => {
        const contractor =
            project?.contractor ||
            project?.assignedContractor ||
            project?.assignedTo ||
            null;

        if (!contractor) {
            return "Not assigned";
        }

        if (
            typeof contractor === "object"
        ) {
            return (
                contractor.name ||
                contractor.userName ||
                contractor.username ||
                contractor.email ||
                "Assigned contractor"
            );
        }

        return "Assigned contractor";
    };

    // =====================================================
    // CHECK VIDEO MEDIA
    // =====================================================

    const isVideoMedia = (project) => {
        const mediaType = String(
            project?.mediaType || ""
        ).toUpperCase();

        if (mediaType === "VIDEO") {
            return true;
        }

        const url = String(
            project?.mediaUrl || ""
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

    const openMedia = (project) => {
        if (!project?.mediaUrl) {
            return;
        }

        const video =
            isVideoMedia(project);

        setSelectedMedia({
            url: project.mediaUrl,
            type: video
                ? "VIDEO"
                : "PHOTO",
            category:
                project.category ||
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
    // START WORK
    // =====================================================

    const startWork = async (projectId) => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        try {
            setUpdatingId(projectId);

            const response = await fetch(
                `${API_URL}/api/complaints/${projectId}/start`,
                {
                    method: "PUT",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const responseText =
                await response.text();

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
                    responseText ||
                        "Unable to start work"
                );
            }

            let updatedComplaint = null;

            try {
                updatedComplaint =
                    JSON.parse(responseText);
            } catch {
                updatedComplaint = null;
            }

            setProjects(
                (previousProjects) =>
                    previousProjects.map(
                        (project) =>
                            project.id ===
                            projectId
                                ? {
                                      ...project,

                                      status:
                                          updatedComplaint?.status ||
                                          "IN_PROGRESS",

                                      ...(updatedComplaint?.contractor
                                          ? {
                                                contractor:
                                                    updatedComplaint.contractor,
                                            }
                                          : {}),
                                  }
                                : project
                    )
            );
        } catch (error) {
            console.error(
                "Start work error:",
                error
            );

            alert(
                error.message ||
                    "Unable to start work."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // =====================================================
    // SELECT WORK PHOTOS
    // =====================================================

    const handleWorkPhotoSelect = (event) => {
        const files =
            Array.from(
                event.target.files || []
            );

        if (files.length === 0) {
            return;
        }

        const imageFiles =
            files.filter((file) =>
                file.type.startsWith("image/")
            );

        if (
            imageFiles.length !==
            files.length
        ) {
            alert(
                "Only image files can be uploaded."
            );
        }

        setSelectedWorkPhotos(
            imageFiles
        );

        event.target.value = "";
    };

    // =====================================================
    // REMOVE SELECTED PHOTO
    // =====================================================

    const removeSelectedPhoto = (index) => {
        setSelectedWorkPhotos(
            (previousPhotos) =>
                previousPhotos.filter(
                    (_, photoIndex) =>
                        photoIndex !== index
                )
        );
    };

    // =====================================================
    // UPLOAD WORK PHOTOS
    // =====================================================

    const uploadWorkPhotos = async (
        projectId
    ) => {
        if (
            selectedWorkPhotos.length === 0
        ) {
            alert(
                "Please select work photos first."
            );

            return;
        }

        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        try {
            setUploadingPhotos(true);

            const uploadedUrls = [];

            // ---------------------------------------------
            // UPLOAD TO SUPABASE
            // ---------------------------------------------

            for (
                const photo of selectedWorkPhotos
            ) {
                const extension =
                    photo.name
                        ?.split(".")
                        .pop() ||
                    "jpg";

                const fileName =
                    `work-${projectId}-${Date.now()}-${Math.random()
                        .toString(36)
                        .substring(
                            2,
                            8
                        )}.${extension}`;

                const filePath =
                    `work-photos/${projectId}/${fileName}`;

                const {
                    error: uploadError,
                } =
                    await supabase.storage
                        .from("evidence")
                        .upload(
                            filePath,
                            photo,
                            {
                                contentType:
                                    photo.type ||
                                    "image/jpeg",

                                upsert: false,
                            }
                        );

                if (uploadError) {
                    console.error(
                        "Supabase upload error:",
                        uploadError
                    );

                    throw new Error(
                        "Failed to upload work photo."
                    );
                }

                const {
                    data: urlData,
                } =
                    supabase.storage
                        .from("evidence")
                        .getPublicUrl(
                            filePath
                        );

                if (
                    !urlData?.publicUrl
                ) {
                    throw new Error(
                        "Unable to get uploaded photo URL."
                    );
                }

                uploadedUrls.push(
                    urlData.publicUrl
                );
            }

            // ---------------------------------------------
            // SAVE URLS TO BACKEND
            // ---------------------------------------------

            const response =
                await fetch(
                    `${API_URL}/api/complaints/${projectId}/work-photos`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`,
                        },

                        body: JSON.stringify({
                            photoUrls:
                                uploadedUrls,
                        }),
                    }
                );

            const responseText =
                await response.text();

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );

                navigate("/");
                return;
            }

            if (!response.ok) {
                throw new Error(
                    responseText ||
                        "Failed to save work photos."
                );
            }

            alert(
                "Work photos uploaded successfully."
            );

            setSelectedWorkPhotos([]);
        } catch (error) {
            console.error(
                "Work photo upload error:",
                error
            );

            alert(
                error.message ||
                    "Unable to upload work photos."
            );
        } finally {
            setUploadingPhotos(false);
        }
    };

    // =====================================================
    // COMPLETE WORK
    // =====================================================

    const completeWork = async (
        projectId
    ) => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        try {
            setUpdatingId(projectId);

            const response = await fetch(
                `${API_URL}/api/complaints/${projectId}/complete`,
                {
                    method: "PUT",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const responseText =
                await response.text();

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
                    responseText ||
                        "Unable to complete work."
                );
            }

            let updatedComplaint = null;

            try {
                updatedComplaint =
                    JSON.parse(responseText);
            } catch {
                updatedComplaint = null;
            }

            setProjects(
                (previousProjects) =>
                    previousProjects.map(
                        (project) =>
                            project.id ===
                            projectId
                                ? {
                                      ...project,

                                      status:
                                          updatedComplaint?.status ||
                                          "COMPLETED",
                                  }
                                : project
                    )
            );
        } catch (error) {
            console.error(
                "Complete work error:",
                error
            );

            alert(
                error.message ||
                    "Unable to complete work."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // =====================================================
    // CATEGORY OPTIONS
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

    // =====================================================
    // MY PROJECTS
    // =====================================================

    const myProjects = useMemo(() => {
        return projects.filter(
            (project) =>
                isAssignedToMe(project)
        );
    }, [
        projects,
        currentContractorId,
        user,
    ]);

    // =====================================================
    // CURRENT VIEW
    // =====================================================

    const viewProjects =
        activeView === "MY"
            ? myProjects
            : projects;

    // =====================================================
    // CATEGORY FILTER
    // =====================================================

    const filteredProjects =
        selectedCategory === "ALL"
            ? viewProjects
            : viewProjects.filter(
                  (project) =>
                      project.category ===
                      selectedCategory
              );

    // =====================================================
    // STATISTICS
    // =====================================================

    const totalProjects =
        myProjects.length;

    const pendingProjects =
        myProjects.filter(
            (project) =>
                project.status ===
                    "PENDING" ||
                project.status ===
                    "ASSIGNED"
        ).length;

    const inProgressProjects =
        myProjects.filter(
            (project) =>
                project.status ===
                    "IN_PROGRESS" ||
                project.status ===
                    "IN PROGRESS"
        ).length;

    const completedProjects =
        myProjects.filter(
            (project) =>
                project.status ===
                    "RESOLVED" ||
                project.status ===
                    "COMPLETED"
        ).length;

    // =====================================================
    // FORMAT COORDINATE
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
    // STATUS TEXT
    // =====================================================

    const getStatusText = (status) => {
        if (!status) {
            return "UNKNOWN";
        }

        return String(status).replace(
            /_/g,
            " "
        );
    };

    // =====================================================
    // IMAGE ERROR
    // =====================================================

    const handleImageError = (
        event
    ) => {
        event.currentTarget.style.display =
            "none";

        const container =
            event.currentTarget
                .parentElement;

        if (container) {
            container.classList.add(
                "image-error"
            );
        }
    };

    // =====================================================
    // VIEW CHANGE
    // =====================================================

    const handleViewChange = (
        view
    ) => {
        setActiveView(view);
        setSelectedCategory("ALL");
        setSelectedWorkPhotos([]);
    };

    // =====================================================
    // ESCAPE TO CLOSE MEDIA
    // =====================================================

    useEffect(() => {
        const handleEscape = (event) => {
            if (
                event.key === "Escape"
            ) {
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
    // RENDER
    // =====================================================

    return (
        <div className="contractor-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="contractor-header">

                <div className="contractor-brand">

                    <div className="contractor-brand-logo">
                        CP
                    </div>

                    <div>
                        <div className="contractor-brand-name">
                            CivicProof
                        </div>

                        <div className="contractor-brand-subtitle">
                            MUNICIPAL OPERATIONS
                        </div>
                    </div>

                </div>

                <div className="contractor-header-right">

                    <div className="contractor-user">

                        <span className="contractor-online-dot">
                        </span>

                        <span>
                            {user?.name ||
                                user?.userName ||
                                "Contractor"}
                        </span>

                    </div>

                    <span className="contractor-role-badge">
                        CONTRACTOR
                    </span>

                    <button
                        className="contractor-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* =================================================
                MAIN
            ================================================= */}

            <main className="contractor-main">

                {/* =================================================
                    INTRO
                ================================================= */}

                <section className="contractor-dashboard-intro">

                    <div className="contractor-eyebrow">
                        FIELD OPERATIONS
                    </div>

                    <h1>
                        Contractor Dashboard
                    </h1>

                    <p>
                        Review civic complaints,
                        manage your assigned
                        projects and track
                        completed work.
                    </p>

                </section>


                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="contractor-stats">

                    <div className="contractor-stat-card total">

                        <div className="contractor-stat-title">
                            MY PROJECTS
                        </div>

                        <div className="contractor-stat-number">
                            {totalProjects}
                        </div>

                        <div className="contractor-stat-description">
                            Assigned to you
                        </div>

                    </div>


                    <div className="contractor-stat-card assigned">

                        <div className="contractor-stat-title">
                            ASSIGNED
                        </div>

                        <div className="contractor-stat-number">
                            {pendingProjects}
                        </div>

                        <div className="contractor-stat-description">
                            Awaiting work
                        </div>

                    </div>


                    <div className="contractor-stat-card progress">

                        <div className="contractor-stat-title">
                            IN PROGRESS
                        </div>

                        <div className="contractor-stat-number">
                            {inProgressProjects}
                        </div>

                        <div className="contractor-stat-description">
                            Currently working
                        </div>

                    </div>


                    <div className="contractor-stat-card completed">

                        <div className="contractor-stat-title">
                            COMPLETED
                        </div>

                        <div className="contractor-stat-number">
                            {completedProjects}
                        </div>

                        <div className="contractor-stat-description">
                            Finished projects
                        </div>

                    </div>

                </section>


                {/* =================================================
                    PROJECT LEDGER
                ================================================= */}

                <section className="contractor-projects">

                    {/* SECTION HEADER */}

                    <div className="contractor-section-header">

                        <div>

                            <div className="contractor-section-eyebrow">
                                COMPLAINT LEDGER
                            </div>

                            <h2>
                                {activeView ===
                                "MY"
                                    ? "My Projects"
                                    : "All Complaints"}
                            </h2>

                            <p>
                                {activeView ===
                                "MY"
                                    ? "Complaints currently assigned to you."
                                    : "Review all civic complaints available in the system."}
                            </p>

                        </div>


                        <div className="contractor-section-controls">

                            <div className="contractor-view-tabs">

                                <button
                                    className={`contractor-view-tab ${
                                        activeView ===
                                        "MY"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handleViewChange(
                                            "MY"
                                        )
                                    }
                                >
                                    My Projects
                                </button>

                                <button
                                    className={`contractor-view-tab ${
                                        activeView ===
                                        "ALL"
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handleViewChange(
                                            "ALL"
                                        )
                                    }
                                >
                                    All Complaints
                                </button>

                            </div>


                            <select
                                className="contractor-category-filter"
                                value={
                                    selectedCategory
                                }
                                onChange={(event) =>
                                    setSelectedCategory(
                                        event.target
                                            .value
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


                            <span className="contractor-section-count">

                                {
                                    filteredProjects.length
                                }{" "}

                                {filteredProjects.length ===
                                1
                                    ? "report"
                                    : "reports"}

                            </span>

                        </div>

                    </div>


                    {/* TABLE HEADER */}

                    {!loading &&
                        !error &&
                        filteredProjects.length >
                            0 && (

                            <div className="contractor-table-header">

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


                    {/* LOADING */}

                    {loading && (

                        <div className="contractor-empty">

                            <div className="contractor-loading-icon">
                                ◌
                            </div>

                            <h3>
                                Loading complaints...
                            </h3>

                        </div>

                    )}


                    {/* ERROR */}

                    {!loading &&
                        error && (

                            <div className="contractor-empty contractor-error">

                                <div className="contractor-empty-icon">
                                    !
                                </div>

                                <h3>
                                    Unable to load complaints
                                </h3>

                                <p>
                                    {error}
                                </p>

                            </div>
                        )}


                    {/* EMPTY */}

                    {!loading &&
                        !error &&
                        filteredProjects.length ===
                            0 && (

                            <div className="contractor-empty">

                                <div className="contractor-empty-icon">
                                    □
                                </div>

                                <h3>
                                    {activeView ===
                                    "MY"
                                        ? selectedCategory ===
                                          "ALL"
                                            ? "No projects assigned"
                                            : `No ${selectedCategory} projects assigned`
                                        : selectedCategory ===
                                          "ALL"
                                        ? "No complaints found"
                                        : `No ${selectedCategory} complaints found`}
                                </h3>

                                <p>
                                    {activeView ===
                                    "MY"
                                        ? "Projects assigned to you will appear here."
                                        : "There are no complaints matching this filter."}
                                </p>

                            </div>
                        )}


                    {/* COMPLAINT LIST */}

                    {!loading &&
                        !error &&
                        filteredProjects.length >
                            0 && (

                            <div className="contractor-project-list">

                                {filteredProjects.map(
                                    (project) => {

                                        const assignedToMe =
                                            isAssignedToMe(
                                                project
                                            );

                                        const hasContractor =
                                            !!(
                                                project?.contractor ||
                                                project?.assignedContractor ||
                                                project?.assignedTo
                                            );

                                        const video =
                                            isVideoMedia(
                                                project
                                            );

                                        return (

                                            <article
                                                className="contractor-project-card"
                                                key={
                                                    project.id
                                                }
                                            >

                                                {/* =================================
                                                    COMPLAINT & LOCATION
                                                ================================= */}

                                                <div className="contractor-complaint-main">

                                                    <div
                                                        className={`contractor-project-image ${
                                                            video
                                                                ? "contractor-video-media"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            openMedia(
                                                                project
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
                                                                    project
                                                                );
                                                            }
                                                        }}
                                                    >

                                                        {project.mediaUrl ? (

                                                            video ? (

                                                                <>
                                                                    <video
                                                                        src={
                                                                            project.mediaUrl
                                                                        }
                                                                        muted
                                                                        playsInline
                                                                        preload="metadata"
                                                                        className="contractor-video-thumbnail"
                                                                        onError={
                                                                            handleImageError
                                                                        }
                                                                    />

                                                                    <div className="contractor-video-overlay">
                                                                        <div className="contractor-video-play">
                                                                            ▶
                                                                        </div>
                                                                    </div>

                                                                    <div className="contractor-video-label">
                                                                        VIDEO
                                                                    </div>
                                                                </>

                                                            ) : (

                                                                <img
                                                                    src={
                                                                        project.mediaUrl
                                                                    }
                                                                    alt={
                                                                        project.category ||
                                                                        "Complaint"
                                                                    }
                                                                    onError={
                                                                        handleImageError
                                                                    }
                                                                />

                                                            )

                                                        ) : (

                                                            <div className="contractor-no-image">
                                                                No image
                                                            </div>

                                                        )}

                                                    </div>


                                                    <div className="contractor-project-info">

                                                        <div className="contractor-id-category">

                                                            <span className="contractor-complaint-id">
                                                                CS-
                                                                {String(
                                                                    project.id
                                                                ).padStart(
                                                                    4,
                                                                    "0"
                                                                )}
                                                            </span>

                                                            <span className="contractor-category-badge">
                                                                {
                                                                    project.category ||
                                                                    "Civic Issue"
                                                                }
                                                            </span>

                                                        </div>


                                                        <h3>
                                                            {
                                                                project.description ||
                                                                "No description provided."
                                                            }
                                                        </h3>


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


                                                        <div className="contractor-meta">

                                                            Reported:{" "}

                                                            {project.capturedAt
                                                                ? new Date(
                                                                      project.capturedAt
                                                                  ).toLocaleString()
                                                                : "Unknown"}

                                                        </div>
                                                        <ComplaintLike
                                                            complaintId={project.id}
                                                            initialLikeCount={project.likeCount}
                                                            initialLiked={project.liked}
                                                        />
                                                    </div>

                                                </div>


                                                {/* STATUS */}

                                                <div className="contractor-status-column">

                                                    <span
                                                        className={`contractor-status ${getStatusClass(
                                                            project.status
                                                        )}`}
                                                    >
                                                        {
                                                            getStatusText(
                                                                project.status
                                                            )
                                                        }
                                                    </span>

                                                </div>


                                                {/* ASSIGNED CONTRACTOR */}

                                                <div className="contractor-assigned-column">

                                                    {assignedToMe ? (

                                                        <>
                                                            <strong>
                                                                {user?.name ||
                                                                    user?.userName ||
                                                                    "You"}
                                                            </strong>

                                                            <span>
                                                                Assigned to you
                                                            </span>
                                                        </>

                                                    ) : hasContractor ? (

                                                        <>
                                                            <strong>
                                                                {
                                                                    getContractorName(
                                                                        project
                                                                    )
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


                                                {/* ACTIONS */}

                                                <div className="contractor-project-actions">

                                                    {/* VIEW DETAILS */}

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


                                                    {/* MY PROJECT */}

                                                    {assignedToMe ? (

                                                        <>

                                                            {/* ASSIGNED */}

                                                            {(project.status ===
                                                                "ASSIGNED" ||
                                                                project.status ===
                                                                    "PENDING") && (

                                                                <button
                                                                    className="action-start"
                                                                    disabled={
                                                                        updatingId ===
                                                                        project.id
                                                                    }
                                                                    onClick={() =>
                                                                        startWork(
                                                                            project.id
                                                                        )
                                                                    }
                                                                >
                                                                    {updatingId ===
                                                                    project.id
                                                                        ? "Starting..."
                                                                        : "Start Work"}
                                                                </button>

                                                            )}


                                                            {/* IN PROGRESS */}

                                                            {(project.status ===
                                                                "IN_PROGRESS" ||
                                                                project.status ===
                                                                    "IN PROGRESS") && (

                                                                <div className="work-upload-box">

                                                                    <div className="work-progress-label">
                                                                        Work In Progress
                                                                    </div>


                                                                    <label className="work-photo-select">

                                                                        + Add Work Photos

                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            multiple
                                                                            hidden
                                                                            onChange={
                                                                                handleWorkPhotoSelect
                                                                            }
                                                                        />

                                                                    </label>


                                                                    {selectedWorkPhotos.length >
                                                                        0 && (

                                                                        <div className="selected-work-photos">

                                                                            {selectedWorkPhotos.map(
                                                                                (
                                                                                    photo,
                                                                                    index
                                                                                ) => (

                                                                                    <div
                                                                                        className="selected-work-photo"
                                                                                        key={`${photo.name}-${index}`}
                                                                                    >

                                                                                        <img
                                                                                            src={URL.createObjectURL(
                                                                                                photo
                                                                                            )}
                                                                                            alt="Selected work"
                                                                                        />

                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                removeSelectedPhoto(
                                                                                                    index
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            ×
                                                                                        </button>

                                                                                    </div>

                                                                                )
                                                                            )}

                                                                        </div>

                                                                    )}


                                                                    {selectedWorkPhotos.length >
                                                                        0 && (

                                                                        <div className="selected-photo-count">

                                                                            {
                                                                                selectedWorkPhotos.length
                                                                            }{" "}
                                                                            photo
                                                                            {selectedWorkPhotos.length >
                                                                            1
                                                                                ? "s"
                                                                                : ""}{" "}
                                                                            selected

                                                                        </div>

                                                                    )}


                                                                    <button
                                                                        className="action-upload"
                                                                        disabled={
                                                                            uploadingPhotos ||
                                                                            selectedWorkPhotos.length ===
                                                                                0
                                                                        }
                                                                        onClick={() =>
                                                                            uploadWorkPhotos(
                                                                                project.id
                                                                            )
                                                                        }
                                                                    >
                                                                        {uploadingPhotos
                                                                            ? "Uploading..."
                                                                            : "Upload Work Photos"}
                                                                    </button>


                                                                    <button
                                                                        className="action-complete"
                                                                        disabled={
                                                                            updatingId ===
                                                                            project.id
                                                                        }
                                                                        onClick={() =>
                                                                            completeWork(
                                                                                project.id
                                                                            )
                                                                        }
                                                                    >
                                                                        {updatingId ===
                                                                        project.id
                                                                            ? "Completing..."
                                                                            : "Mark Completed"}
                                                                    </button>

                                                                </div>

                                                            )}


                                                            {/* COMPLETED */}

                                                            {(project.status ===
                                                                "COMPLETED" ||
                                                                project.status ===
                                                                    "RESOLVED") && (

                                                                <span className="completed-label">
                                                                    ✓ Completed
                                                                </span>

                                                            )}

                                                        </>

                                                    ) : (

                                                        hasContractor ? (

                                                            <span className="assigned-other-label">
                                                                Assigned to another contractor
                                                            </span>

                                                        ) : (

                                                            <button
                                                                className="action-request"
                                                                onClick={() =>
                                                                    alert(
                                                                        "Please contact the officer to request this complaint."
                                                                    )
                                                                }
                                                            >
                                                                Request Assignment
                                                            </button>

                                                        )

                                                    )}

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
                PHOTO / VIDEO MODAL
            ===================================================== */}

            {selectedMedia && (

                <div
                    className="contractor-media-modal"
                    onClick={closeMedia}
                >

                    <div
                        className="contractor-media-modal-content"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="contractor-media-modal-close"
                            onClick={closeMedia}
                            aria-label="Close"
                        >
                            ×
                        </button>


                        <div className="contractor-media-modal-header">

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


                        <div className="contractor-media-modal-body">

                            {selectedMedia.type ===
                            "VIDEO" ? (

                                <video
                                    src={
                                        selectedMedia.url
                                    }
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="contractor-modal-video"
                                />

                            ) : (

                                <img
                                    src={
                                        selectedMedia.url
                                    }
                                    alt={
                                        selectedMedia.category
                                    }
                                    className="contractor-modal-image"
                                />

                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Contractor;