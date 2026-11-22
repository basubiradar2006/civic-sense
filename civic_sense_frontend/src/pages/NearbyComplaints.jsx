import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Icon, SeverityBadge, StatusBadge } from "../components/ui";
import { API_URL, clearSession, getToken } from "../lib/api";
import "../styles/theme.css";
import "../styles/NearbyComplaints.css";

function NearbyComplaints() {
    const navigate = useNavigate();

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [radius, setRadius]         = useState(5);

    // =====================================================
    // FETCH NEARBY
    // =====================================================

    const fetchNearbyComplaints = () => {
        const token = getToken();
        if (!token) { navigate("/"); return; }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(
                        `${API_URL}/api/complaints/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.status === 401 || res.status === 403) {
                        clearSession(); navigate("/"); return;
                    }
                    if (!res.ok) throw new Error("Failed to fetch nearby complaints");
                    const data = await res.json();
                    setComplaints(Array.isArray(data) ? data : []);
                } catch (err) {
                    setError("Unable to load nearby complaints.");
                } finally {
                    setLoading(false);
                }
            },
            (locationError) => {
                setLoading(false);
                switch (locationError.code) {
                    case locationError.PERMISSION_DENIED:
                        setError("Location permission was denied. Please allow location access."); break;
                    case locationError.POSITION_UNAVAILABLE:
                        setError("Your current location could not be determined."); break;
                    case locationError.TIMEOUT:
                        setError("Location request timed out. Please try again."); break;
                    default:
                        setError("Unable to get your location.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    useEffect(() => { fetchNearbyComplaints(); }, [radius]);

    // =====================================================
    // LIKE
    // =====================================================

    const handleLike = async (complaint) => {
        const token = getToken();
        if (!token) { navigate("/"); return; }

        try {
            const res = await fetch(
                `${API_URL}/api/complaints/${complaint.id}/like`,
                { method: complaint.liked ? "DELETE" : "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.status === 401 || res.status === 403) { clearSession(); navigate("/"); return; }
            if (!res.ok) throw new Error("Like failed");
            const data = await res.json();
            setComplaints(prev =>
                prev.map(c => c.id === complaint.id ? { ...c, liked: data.liked, likeCount: data.likeCount } : c)
            );
        } catch { /* silent */ }
    };

    // =====================================================
    // FORMAT DISTANCE
    // =====================================================

    const formatDistance = (d) => {
        if (typeof d !== "number" || !Number.isFinite(d)) return null;
        return d < 1 ? `${Math.round(d * 1000)} m away` : `${d.toFixed(1)} km away`;
    };

    const handleLogout = () => { clearSession(); navigate("/"); };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="nb-page cp-app">

            {/* HEADER */}
            <AppHeader role="CITIZEN" user={user} live="offline" onLogout={handleLogout}>
                <button
                    className="cp-btn cp-btn-ghost cp-btn-sm"
                    onClick={() => navigate("/citizen")}
                >
                    <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
                    Dashboard
                </button>
            </AppHeader>

            {/* MAIN */}
            <main className="nb-main">

                {/* HERO */}
                <div className="nb-hero">
                    <div>
                        <div className="cp-eyebrow">Issues Near Me</div>
                        <h1>Nearby Complaints</h1>
                        <p>Civic issues reported within your area, sorted by proximity.</p>
                    </div>

                    <div className="nb-radius">
                        <label htmlFor="nb-radius-sel">Search radius</label>
                        <select
                            id="nb-radius-sel"
                            value={radius}
                            onChange={(e) => setRadius(Number(e.target.value))}
                        >
                            <option value={1}>1 km</option>
                            <option value={2}>2 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={20}>20 km</option>
                        </select>
                    </div>
                </div>

                {/* TOOLBAR */}
                <div className="nb-toolbar">
                    <span>
                        Showing complaints within <strong>{radius} km</strong> of your location
                    </span>
                    <button
                        className="cp-btn cp-btn-ghost cp-btn-sm"
                        onClick={fetchNearbyComplaints}
                        disabled={loading}
                    >
                        <Icon name="refresh" size={14} />
                        Refresh location
                    </button>
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="nb-state">
                        <div className="nb-spinner" />
                        <h3>Finding nearby complaints…</h3>
                        <p>Please allow location access when prompted.</p>
                    </div>
                )}

                {/* ERROR */}
                {!loading && error && (
                    <div className="nb-state nb-error">
                        <div className="nb-state-icon">
                            <Icon name="alert" size={24} />
                        </div>
                        <h3>Unable to find complaints</h3>
                        <p>{error}</p>
                        <button
                            className="cp-btn cp-btn-primary"
                            style={{ marginTop: 8 }}
                            onClick={fetchNearbyComplaints}
                        >
                            <Icon name="refresh" size={15} /> Try again
                        </button>
                    </div>
                )}

                {/* EMPTY */}
                {!loading && !error && complaints.length === 0 && (
                    <div className="nb-state">
                        <div className="nb-state-icon">
                            <Icon name="pin" size={24} />
                        </div>
                        <h3>No nearby complaints</h3>
                        <p>
                            No reported issues within <strong>{radius} km</strong> of your location.
                            Try widening the radius or search again.
                        </p>
                        <button
                            className="cp-btn cp-btn-ghost"
                            style={{ marginTop: 8 }}
                            onClick={fetchNearbyComplaints}
                        >
                            <Icon name="refresh" size={15} /> Search again
                        </button>
                    </div>
                )}

                {/* GRID */}
                {!loading && !error && complaints.length > 0 && (
                    <section className="nb-grid">
                        {complaints.map((complaint) => (
                            <article className="nb-card" key={complaint.id}>

                                {/* IMAGE */}
                                <div className="nb-card-img">
                                    {complaint.mediaUrl ? (
                                        <img
                                            src={complaint.mediaUrl}
                                            alt={complaint.category || "Complaint"}
                                            onClick={() => setSelectedImage(complaint.mediaUrl)}
                                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                                        />
                                    ) : (
                                        <div className="nb-card-no-img">
                                            <Icon name="camera" size={28} />
                                            <span>No image</span>
                                        </div>
                                    )}

                                    {/* DISTANCE BADGE */}
                                    {complaint.distance != null && (
                                        <span className="nb-dist">
                                            <Icon name="pin" size={12} />
                                            {formatDistance(complaint.distance)}
                                        </span>
                                    )}
                                </div>

                                {/* BODY */}
                                <div className="nb-card-body">
                                    <div className="nb-card-row">
                                        <h2>{complaint.category || "Civic Issue"}</h2>
                                        <StatusBadge status={complaint.status} />
                                        <SeverityBadge complaint={complaint} showScore={false} />
                                    </div>

                                    <p className="nb-desc">
                                        {complaint.description || "No description provided."}
                                    </p>

                                    {complaint.address && (
                                        <p className="nb-addr">
                                            <Icon name="pin" size={12} />
                                            {complaint.address}
                                        </p>
                                    )}

                                    <p className="nb-date">
                                        {complaint.capturedAt
                                            ? new Date(complaint.capturedAt).toLocaleString()
                                            : "Date unavailable"}
                                    </p>

                                    {/* ACTIONS */}
                                    <div className="nb-card-actions">
                                        <button
                                            className={`nb-like ${complaint.liked ? "nb-liked" : ""}`}
                                            onClick={() => handleLike(complaint)}
                                        >
                                            <Icon name={complaint.liked ? "check" : "users"} size={14} />
                                            {complaint.liked ? "Supported" : "Support"}
                                            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                                                {complaint.likeCount ?? 0}
                                            </span>
                                        </button>

                                        <button
                                            className="nb-details"
                                            onClick={() => navigate(`/report/${complaint.id}`)}
                                        >
                                            View details
                                            <Icon name="chevron" size={14} />
                                        </button>
                                    </div>
                                </div>

                            </article>
                        ))}
                    </section>
                )}

            </main>

            {/* IMAGE MODAL */}
            {selectedImage && (
                <div
                    className="nb-modal-bg"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="nb-modal-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="nb-modal-close"
                            onClick={() => setSelectedImage(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <img src={selectedImage} alt="Complaint evidence" />
                    </div>
                </div>
            )}

        </div>
    );
}

export default NearbyComplaints;
