import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SeverityBadge, SeverityBreakdown } from "../components/ui";
import { API_URL, api, AuthError, getStoredUser } from "../lib/api";
import { assessmentStatus } from "../lib/format";

import "../styles/ReportDetails.css";

function ReportDetails() {
    const { id } = useParams();

    const navigate = useNavigate();

    // ==========================================
    // COMPLAINT
    // ==========================================

    const [report, setReport] = useState(null);
    const loading = report?.id !== id;
    const complaint = loading ? null : report.complaint;
    const error = loading ? null : report.error;

    // ==========================================
    // WORK PHOTOS
    // ==========================================

    const [workPhotos, setWorkPhotos] = useState([]);

    const [workPhotosLoading, setWorkPhotosLoading] =
        useState(true);

    const [workPhotosError, setWorkPhotosError] =
        useState("");

    // ==========================================
    // IMAGE PREVIEW
    // ==========================================

    const [selectedImage, setSelectedImage] =
        useState(null);

    // ==========================================
    // FETCH COMPLAINT
    // ==========================================

    useEffect(() => {
        let active = true;

        api(`/api/complaints/${id}`)
            .then((complaint) => {
                if (complaint !== null && complaint?.id == null) {
                    throw new Error("Invalid complaint response");
                }
                if (active) setReport({ id, complaint });
            })
            .catch((err) => {
                if (!active) return;
                if (err instanceof AuthError) navigate("/");
                else setReport({ id, error: "Unable to load complaint details." });
            });

        return () => { active = false; };
    }, [id, navigate]);

    // ==========================================
    // FETCH WORK PHOTOS
    // ==========================================

    useEffect(() => {
        const fetchWorkPhotos = async () => {

            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {

                setWorkPhotosLoading(true);

                setWorkPhotosError("");

                const response = await fetch(
                    `${API_URL}/api/complaints/${id}/work-photos`,
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

                console.log(
                    "Work photos response:",
                    response.status
                );

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
                        "Failed to load work photos"
                    );
                }

                const data =
                    await response.json();

                console.log(
                    "Work Photos:",
                    data
                );

                setWorkPhotos(
                    Array.isArray(data)
                        ? data
                        : []
                );

            } catch (err) {

                console.error(
                    "Work photos error:",
                    err
                );

                setWorkPhotosError(
                    "Unable to load work photos."
                );

                setWorkPhotos([]);

            } finally {

                setWorkPhotosLoading(false);

            }
        };

        fetchWorkPhotos();

    }, [
        id,
        navigate,
    ]);

    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <div className="report-details-page">

                <div className="report-loading">
                    <div className="report-loading-spinner">
                        ◌
                    </div>

                    <h2>
                        Loading complaint...
                    </h2>
                </div>

            </div>
        );
    }

    // ==========================================
    // ERROR
    // ==========================================

    if (error) {
        return (
            <div className="report-details-page">

                <div className="report-error">

                    <h2>
                        {error}
                    </h2>

                    <button
                        className="report-back-btn"
                        onClick={() =>
                            navigate(-1)
                        }
                    >
                        ← Go Back
                    </button>

                </div>

            </div>
        );
    }

    // ==========================================
    // NOT FOUND
    // ==========================================

    if (!complaint) {
        return (
            <div className="report-details-page">

                <div className="report-error">

                    <h2>
                        Complaint not found
                    </h2>

                    <button
                        className="report-back-btn"
                        onClick={() =>
                            navigate(-1)
                        }
                    >
                        ← Go Back
                    </button>

                </div>

            </div>
        );
    }

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="report-details-page">

            {/* ======================================
                HEADER
            ====================================== */}

            <div className="report-details-header">

                <button
                    className="report-back-btn"
                    onClick={() =>
                        navigate(-1)
                    }
                >
                    ← Back
                </button>

                <div>

                    <span>
                        COMPLAINT DETAILS
                    </span>

                    <h1>
                        CS-
                        {String(
                            complaint.id
                        ).padStart(4, "0")}
                    </h1>

                </div>

            </div>

            {/* ======================================
                COMPLAINT CARD
            ====================================== */}

            <div className="report-details-card">

                {/* ==================================
                    ORIGINAL IMAGE
                ================================== */}

                <div className="report-details-image">

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
                        />

                    ) : (

                        <div className="no-original-image">
                            No image available
                        </div>

                    )}

                </div>

                {/* ==================================
                    DETAILS
                ================================== */}

                <div className="report-details-content">

                    <section className="report-severity" aria-label="Complaint severity">
                        <div className="report-severity-heading">
                            <strong>Severity</strong>
                            <SeverityBadge complaint={complaint} />
                        </div>
                        {getStoredUser()?.role === "OFFICER" && complaint.severityAssessment ? (
                            <SeverityBreakdown complaint={complaint} />
                        ) : (
                            <p>
                                {assessmentStatus(complaint.severityAssessment)}
                                {complaint.severityAssessment?.explanation && (
                                    <> · {complaint.severityAssessment.explanation}</>
                                )}
                            </p>
                        )}
                    </section>

                    <div className="report-detail-row">

                        <span>
                            Category
                        </span>

                        <strong>
                            {complaint.category ||
                                "N/A"}
                        </strong>

                    </div>

                    <div className="report-detail-row">

                        <span>
                            Status
                        </span>

                        <strong
                            className={`report-status ${(
                                complaint.status ||
                                ""
                            )
                                .toLowerCase()
                                .replace(
                                    /\s+/g,
                                    "-"
                                )}`}
                        >
                            {complaint.status ||
                                "N/A"}
                        </strong>

                    </div>

                    <div className="report-detail-row">

                        <span>
                            Description
                        </span>

                        <strong>
                            {complaint.description ||
                                "No description"}
                        </strong>

                    </div>

                    <div className="report-detail-row">

                        <span>
                            Address
                        </span>

                        <strong>
                            {complaint.address ||
                                "N/A"}
                        </strong>

                    </div>

                    <div className="report-detail-row">

                        <span>
                            Latitude
                        </span>

                        <strong>
                            {complaint.latitude ??
                                "N/A"}
                        </strong>

                    </div>

                    <div className="report-detail-row">

                        <span>
                            Longitude
                        </span>

                        <strong>
                            {complaint.longitude ??
                                "N/A"}
                        </strong>

                    </div>

                    <div className="report-detail-row">

                        <span>
                            Reported At
                        </span>

                        <strong>
                            {complaint.capturedAt
                                ? new Date(
                                      complaint.capturedAt
                                  ).toLocaleString()
                                : "N/A"}
                        </strong>

                    </div>

                    {complaint.contractor && (

                        <div className="report-detail-row">

                            <span>
                                Contractor
                            </span>

                            <strong>
                                {
                                    complaint
                                        .contractor
                                        .name ||
                                    complaint
                                        .contractor
                                        .userName ||
                                    complaint
                                        .contractor
                                        .email ||
                                    "Assigned contractor"
                                }
                            </strong>

                        </div>

                    )}

                </div>

            </div>

            {/* ======================================
                WORK PHOTOS
            ====================================== */}

            <section className="work-photos-section">

                <div className="work-photos-header">

                    <div>

                        <div className="section-eyebrow">
                            WORK COMPLETION
                        </div>

                        <h2>
                            Work Photos
                        </h2>

                        <p>
                            Photos uploaded by the
                            contractor during the
                            work.
                        </p>

                    </div>

                    <span className="work-photo-count">

                        {workPhotos.length}{" "}

                        {workPhotos.length === 1
                            ? "photo"
                            : "photos"}

                    </span>

                </div>

                {/* ==================================
                    LOADING
                ================================== */}

                {workPhotosLoading && (

                    <div className="work-photos-loading">

                        <div className="work-photo-spinner">
                            ◌
                        </div>

                        <span>
                            Loading work photos...
                        </span>

                    </div>

                )}

                {/* ==================================
                    ERROR
                ================================== */}

                {!workPhotosLoading &&
                    workPhotosError && (

                        <div className="no-work-photos">

                            {workPhotosError}

                        </div>

                    )}

                {/* ==================================
                    NO PHOTOS
                ================================== */}

                {!workPhotosLoading &&
                    !workPhotosError &&
                    workPhotos.length === 0 && (

                        <div className="no-work-photos">

                            <div className="no-work-photo-icon">
                                □
                            </div>

                            <h3>
                                No work photos yet
                            </h3>

                            <p>
                                Work photos uploaded by
                                the contractor will
                                appear here.
                            </p>

                        </div>

                    )}

                {/* ==================================
                    PHOTOS
                ================================== */}

                {!workPhotosLoading &&
                    !workPhotosError &&
                    workPhotos.length > 0 && (

                        <div className="work-photo-grid">

                            {workPhotos.map(
                                (photo) => (

                                    <div
                                        className="work-photo-card"
                                        key={
                                            photo.id
                                        }
                                    >

                                        <div className="work-photo-image-wrapper">

                                            <img
                                                src={
                                                    photo.photoUrl
                                                }
                                                alt="Contractor work"
                                                className="work-photo-image"
                                                onClick={() =>
                                                    setSelectedImage(
                                                        photo.photoUrl
                                                    )
                                                }
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";

                                                    event.currentTarget.parentElement.classList.add(
                                                        "work-photo-image-error"
                                                    );
                                                }}
                                            />

                                            <div className="work-photo-overlay">
                                                Click to enlarge
                                            </div>

                                        </div>

                                        <div className="work-photo-info">

                                            <span className="work-photo-uploader">

                                                Work evidence

                                            </span>

                                            {photo.uploadedAt && (

                                                <small>

                                                    Uploaded{" "}

                                                    {new Date(
                                                        photo.uploadedAt
                                                    ).toLocaleString()}

                                                </small>

                                            )}

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

            </section>

            {/* ======================================
                IMAGE MODAL
            ====================================== */}

            {selectedImage && (

                <div
                    className="report-image-modal"
                    onClick={() =>
                        setSelectedImage(
                            null
                        )
                    }
                >

                    <div
                        className="report-image-modal-content"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="report-image-modal-close"
                            onClick={() =>
                                setSelectedImage(
                                    null
                                )
                            }
                        >
                            ×
                        </button>

                        <img
                            src={
                                selectedImage
                            }
                            alt="Evidence"
                        />

                    </div>

                </div>

            )}

        </div>
    );
}

export default ReportDetails;
