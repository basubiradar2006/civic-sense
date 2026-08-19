import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NearbyComplaints.css";

function NearbyComplaints() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedImage, setSelectedImage] = useState(null);

    // Radius in kilometers
    const [radius, setRadius] = useState(5);

    // =====================================================
    // GET NEARBY COMPLAINTS
    // =====================================================

    const fetchNearbyComplaints = () => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        if (!navigator.geolocation) {
            setError(
                "Geolocation is not supported by your browser."
            );
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                console.log("My location:", {
                    latitude,
                    longitude,
                });

                try {
                    const response = await fetch(
                        `${API_URL}/api/complaints/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/");
                        return;
                    }

                    if (!response.ok) {
                        throw new Error(
                            "Failed to fetch nearby complaints"
                        );
                    }

                    const data = await response.json();

                    console.log("Nearby complaints:", data);

                    setComplaints(
                        Array.isArray(data) ? data : []
                    );

                } catch (err) {
                    console.error(
                        "Nearby complaint error:",
                        err
                    );

                    setError(
                        "Unable to load nearby complaints."
                    );
                } finally {
                    setLoading(false);
                }
            },

            (locationError) => {
                console.error(
                    "Location error:",
                    locationError
                );

                setLoading(false);

                switch (locationError.code) {
                    case locationError.PERMISSION_DENIED:
                        setError(
                            "Location permission was denied. Please allow location access."
                        );
                        break;

                    case locationError.POSITION_UNAVAILABLE:
                        setError(
                            "Your current location could not be determined."
                        );
                        break;

                    case locationError.TIMEOUT:
                        setError(
                            "Location request timed out. Please try again."
                        );
                        break;

                    default:
                        setError(
                            "Unable to get your location."
                        );
                }
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // =====================================================
    // INITIAL FETCH
    // =====================================================

    useEffect(() => {
        fetchNearbyComplaints();
    }, [radius]);

    // =====================================================
    // LIKE / UNLIKE
    // =====================================================

    const handleLike = async (complaint) => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        const complaintId = complaint.id;

        try {
            const method = complaint.liked
                ? "DELETE"
                : "POST";

            const response = await fetch(
                `${API_URL}/api/complaints/${complaintId}/like`,
                {
                    method: method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/");
                return;
            }

            if (!response.ok) {
                throw new Error("Like operation failed");
            }

            const data = await response.json();

            console.log("Like response:", data);

            // Update only this complaint
            setComplaints((previousComplaints) =>
                previousComplaints.map((item) =>
                    item.id === complaintId
                        ? {
                              ...item,
                              liked: data.liked,
                              likeCount: data.likeCount,
                          }
                        : item
                )
            );

        } catch (err) {
            console.error(
                "Like error:",
                err
            );
        }
    };

    // =====================================================
    // IMAGE ERROR
    // =====================================================

    const handleImageError = (event) => {
        event.currentTarget.style.display = "none";

        const container =
            event.currentTarget.parentElement;

        if (container) {
            container.classList.add("image-error");
        }
    };

    // =====================================================
    // FORMAT DISTANCE
    // =====================================================

    const formatDistance = (distance) => {
        if (
            typeof distance !== "number" ||
            !Number.isFinite(distance)
        ) {
            return null;
        }

        if (distance < 1) {
            return `${Math.round(distance * 1000)} m away`;
        }

        return `${distance.toFixed(1)} km away`;
    };

    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
    };

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="nearby-page">

            {/* ================= HEADER ================= */}

            <header className="nearby-header">

                <div
                    className="nearby-logo"
                    onClick={() => navigate("/citizen")}
                >
                    CivicProof
                </div>

                <div className="nearby-header-actions">

                    <button
                        className="back-btn"
                        onClick={() => navigate("/citizen")}
                    >
                        ← Dashboard
                    </button>

                    <button
                        className="nearby-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* ================= MAIN ================= */}

            <main className="nearby-main">

                {/* ================= TITLE ================= */}

                <section className="nearby-title-section">

                    <div>
                        <h1>
                            📍 Nearby Complaints
                        </h1>

                        <p>
                            See civic issues reported near your location.
                        </p>
                    </div>

                    <div className="radius-control">

                        <label htmlFor="radius">
                            Search radius
                        </label>

                        <select
                            id="radius"
                            value={radius}
                            onChange={(e) =>
                                setRadius(
                                    Number(e.target.value)
                                )
                            }
                        >
                            <option value={1}>
                                1 km
                            </option>

                            <option value={2}>
                                2 km
                            </option>

                            <option value={5}>
                                5 km
                            </option>

                            <option value={10}>
                                10 km
                            </option>

                            <option value={20}>
                                20 km
                            </option>
                        </select>

                    </div>

                </section>


                {/* ================= REFRESH ================= */}

                <div className="nearby-toolbar">

                    <span>
                        Showing complaints within{" "}
                        <strong>{radius} km</strong>
                    </span>

                    <button
                        className="refresh-btn"
                        onClick={fetchNearbyComplaints}
                        disabled={loading}
                    >
                        🔄 Refresh Location
                    </button>

                </div>


                {/* ================= LOADING ================= */}

                {loading && (
                    <div className="nearby-message">

                        <div className="loader"></div>

                        <h3>
                            Finding nearby complaints...
                        </h3>

                        <p>
                            Please allow location access.
                        </p>

                    </div>
                )}


                {/* ================= ERROR ================= */}

                {!loading && error && (
                    <div className="nearby-message error">

                        <div className="message-icon">
                            ⚠️
                        </div>

                        <h3>
                            Unable to find complaints
                        </h3>

                        <p>
                            {error}
                        </p>

                        <button
                            className="retry-btn"
                            onClick={fetchNearbyComplaints}
                        >
                            Try Again
                        </button>

                    </div>
                )}


                {/* ================= NO COMPLAINTS ================= */}

                {!loading &&
                    !error &&
                    complaints.length === 0 && (

                        <div className="nearby-message">

                            <div className="message-icon">
                                🎉
                            </div>

                            <h3>
                                No nearby complaints
                            </h3>

                            <p>
                                There are no reported complaints
                                within {radius} km of your location.
                            </p>

                            <button
                                className="refresh-btn"
                                onClick={fetchNearbyComplaints}
                            >
                                🔄 Search Again
                            </button>

                        </div>
                    )}


                {/* ================= COMPLAINTS ================= */}

                {!loading &&
                    !error &&
                    complaints.length > 0 && (

                        <section className="nearby-grid">

                            {complaints.map((complaint) => (

                                <article
                                    className="nearby-card"
                                    key={complaint.id}
                                >

                                    {/* IMAGE */}

                                    <div className="nearby-image-container">

                                        {complaint.mediaUrl ? (
                                            <img
                                                src={complaint.mediaUrl}
                                                alt={
                                                    complaint.category ||
                                                    "Complaint"
                                                }
                                                className="nearby-image"
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
                                                <span>
                                                    📷
                                                </span>

                                                <p>
                                                    No image
                                                </p>
                                            </div>
                                        )}

                                        {/* DISTANCE */}

                                        {complaint.distance !==
                                            undefined &&
                                            complaint.distance !==
                                                null && (
                                                <span className="distance-badge">
                                                    📍{" "}
                                                    {formatDistance(
                                                        complaint.distance
                                                    )}
                                                </span>
                                            )}

                                    </div>


                                    {/* CONTENT */}

                                    <div className="nearby-card-content">

                                        {/* CATEGORY + STATUS */}

                                        <div className="nearby-category-row">

                                            <h2>
                                                {complaint.category ||
                                                    "Civic Issue"}
                                            </h2>

                                            <span
                                                className={`nearby-status ${
                                                    complaint.status
                                                        ?.toLowerCase()
                                                        .replace(
                                                            /\s+/g,
                                                            "-"
                                                        ) ||
                                                    "unknown"
                                                }`}
                                            >
                                                {complaint.status ||
                                                    "UNKNOWN"}
                                            </span>

                                        </div>


                                        {/* DESCRIPTION */}

                                        <p className="nearby-description">
                                            {complaint.description ||
                                                "No description provided."}
                                        </p>


                                        {/* ADDRESS */}

                                        <p className="nearby-address">
                                            📍{" "}
                                            {complaint.address ||
                                                "Address not available"}
                                        </p>


                                        {/* DATE */}

                                        <p className="nearby-date">
                                            {complaint.capturedAt
                                                ? new Date(
                                                      complaint.capturedAt
                                                  ).toLocaleString()
                                                : "Date unavailable"}
                                        </p>


                                        {/* ACTIONS */}

                                        <div className="nearby-actions">

                                            <button
                                                className={`like-btn ${
                                                    complaint.liked
                                                        ? "liked"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handleLike(
                                                        complaint
                                                    )
                                                }
                                            >
                                                {complaint.liked
                                                    ? "❤️ Liked"
                                                    : "🤍 Like"}

                                                <span>
                                                    {complaint.likeCount ??
                                                        0}
                                                </span>
                                            </button>


                                            <button
                                                className="details-btn"
                                                onClick={() =>
                                                    navigate(
                                                        `/report/${complaint.id}`
                                                    )
                                                }
                                            >
                                                View Details →
                                            </button>

                                        </div>

                                    </div>

                                </article>

                            ))}

                        </section>
                    )}

            </main>


            {/* ================= IMAGE MODAL ================= */}

            {selectedImage && (

                <div
                    className="nearby-image-modal"
                    onClick={() =>
                        setSelectedImage(null)
                    }
                >

                    <div
                        className="nearby-modal-content"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <button
                            className="nearby-modal-close"
                            onClick={() =>
                                setSelectedImage(null)
                            }
                        >
                            ×
                        </button>

                        <img
                            src={selectedImage}
                            alt="Complaint evidence"
                            className="nearby-modal-image"
                        />

                    </div>

                </div>
            )}

        </div>
    );
}

export default NearbyComplaints;