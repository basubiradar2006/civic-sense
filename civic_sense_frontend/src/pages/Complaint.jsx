import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/theme.css";
import "../styles/Complaint.css";
import { supabase } from "../supabaseClient";
import { CATEGORIES, assessmentStatus, severityOf } from "../lib/format";
import HazardEvidenceFields from "../components/HazardEvidenceFields";
import { AppHeader, Icon } from "../components/ui";
import { clearSession, getToken } from "../lib/api";

const API_URL = import.meta.env.VITE_API_URL;

function Complaint() {
    const navigate = useNavigate();

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const videoRef         = useRef(null);
    const canvasRef        = useRef(null);
    const streamRef        = useRef(null);
    const mediaRecorderRef = useRef(null);
    const videoChunksRef   = useRef([]);

    const [category, setCategory]           = useState("");
    const [hazardEvidence, setHazardEvidence] = useState({});
    const [description, setDescription]     = useState("");

    const [showCamera, setShowCamera]       = useState(false);
    const [cameraMode, setCameraMode]       = useState(null);

    const [photo, setPhoto]                 = useState(null);
    const [recordedVideo, setRecordedVideo] = useState(null);
    const [isRecording, setIsRecording]     = useState(false);

    const [location, setLocation]           = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);

    const [submitting, setSubmitting]       = useState(false);

    // =====================================================
    // CLEANUP ON UNMOUNT
    // =====================================================

    useEffect(() => { return () => { stopCamera(); }; }, []);

    // =====================================================
    // CAMERA — PHOTO
    // =====================================================

    const openCamera = async () => {
        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            streamRef.current = stream;
            setCameraMode("PHOTO");
            setShowCamera(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch {
            alert("Camera access denied or camera is not available. Please allow camera permission.");
        }
    };

    // =====================================================
    // CAMERA — VIDEO RECORDING
    // =====================================================

    const startVideoRecording = async () => {
        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: true,
            });
            streamRef.current = stream;
            setCameraMode("VIDEO");
            setShowCamera(true);
            setIsRecording(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);

            videoChunksRef.current = [];
            let opts = {};
            if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9"))
                opts.mimeType = "video/webm;codecs=vp9";
            else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8"))
                opts.mimeType = "video/webm;codecs=vp8";
            else if (MediaRecorder.isTypeSupported("video/webm"))
                opts.mimeType = "video/webm";

            const recorder = new MediaRecorder(stream, opts);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || "video/webm";
                const blob = new Blob(videoChunksRef.current, { type: mimeType });
                if (blob.size === 0) {
                    alert("Video recording failed. Please try again.");
                    stream.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                    setIsRecording(false);
                    setShowCamera(false);
                    return;
                }
                const ext = mimeType.includes("mp4") ? "mp4" : "webm";
                const file = new File([blob], `evidence-${Date.now()}.${ext}`, { type: mimeType });
                const url  = URL.createObjectURL(blob);
                setRecordedVideo({ file, url, capturedAt: new Date().toISOString() });
                stream.getTracks().forEach(t => t.stop());
                streamRef.current = null;
                setShowCamera(false);
                setIsRecording(false);
                getLocation();
            };

            recorder.onerror = () => { alert("Video recording failed."); stopCamera(); setIsRecording(false); setShowCamera(false); };
            recorder.start(1000);
        } catch {
            setIsRecording(false);
            setShowCamera(false);
            alert("Unable to access camera and microphone. Please allow permissions.");
        }
    };

    const stopVideoRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive")
            mediaRecorderRef.current.stop();
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    // =====================================================
    // CAPTURE PHOTO
    // =====================================================

    const capturePhoto = () => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        if (!video.videoWidth || !video.videoHeight) {
            alert("Camera is not ready yet. Please wait.");
            return;
        }
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        const capturedAt = new Date().toISOString();
        canvas.toBlob((blob) => {
            if (!blob) { alert("Failed to capture photo."); return; }
            const file = new File([blob], `evidence-${Date.now()}.jpg`, { type: "image/jpeg" });
            const url  = URL.createObjectURL(blob);
            setPhoto({ file, url, capturedAt });
            stopCamera();
            setShowCamera(false);
            setCameraMode(null);
            getLocation();
        }, "image/jpeg", 0.9);
    };

    const cancelCamera = () => {
        if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive")
            mediaRecorderRef.current.stop();
        stopCamera();
        setShowCamera(false);
        setCameraMode(null);
        setIsRecording(false);
        videoChunksRef.current = [];
        mediaRecorderRef.current = null;
    };

    const retakePhoto = () => { if (photo?.url) URL.revokeObjectURL(photo.url); setPhoto(null); openCamera(); };
    const retakeVideo = () => { if (recordedVideo?.url) URL.revokeObjectURL(recordedVideo.url); setRecordedVideo(null); startVideoRecording(); };

    // =====================================================
    // LOCATION
    // =====================================================

    const getLocation = () => {
        if (!navigator.geolocation) { alert("Geolocation is not supported by this browser."); return; }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                setLocation({ latitude, longitude, accuracy, address: "Finding address…" });
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        { headers: { Accept: "application/json" } }
                    );
                    if (!res.ok) throw new Error("geocode failed");
                    const data = await res.json();
                    setLocation({ latitude, longitude, accuracy, address: data.display_name || "Address not available" });
                } catch {
                    setLocation({ latitude, longitude, accuracy, address: "Address not available" });
                }
                setLocationLoading(false);
            },
            () => { setLocationLoading(false); alert("Unable to get your location. Please allow location permission."); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category)                             { alert("Please select a category."); return; }
        if (!description.trim())                   { alert("Please enter a description."); return; }
        if (!photo && !recordedVideo)              { alert("Please capture a photo or record a video."); return; }
        if (photo && recordedVideo)                { alert("Please select either photo or video evidence."); return; }
        if (!location)                             { alert("Please capture your location."); return; }
        if (!location.address || location.address === "Finding address…") {
            alert("Please wait until the address is detected."); return;
        }

        const token = getToken();
        if (!token) { alert("Please login again."); return; }

        setSubmitting(true);

        try {
            const mediaFile = photo?.file || recordedVideo?.file;
            const mediaType = photo ? "PHOTO" : "VIDEO";
            if (!mediaFile) { alert("Evidence file not found."); return; }

            const fileName = `${mediaType.toLowerCase()}-${Date.now()}-${mediaFile.name}`;
            const filePath = `complaints/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("evidence")
                .upload(filePath, mediaFile, { contentType: mediaFile.type, upsert: false });

            if (uploadError) { alert("Failed to upload evidence."); return; }

            const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(filePath);
            const mediaUrl = urlData.publicUrl;

            const complaint = {
                category,
                hazardEvidence,
                description,
                latitude:   location.latitude,
                longitude:  location.longitude,
                accuracy:   location.accuracy,
                address:    location.address,
                capturedAt: photo ? photo.capturedAt : recordedVideo.capturedAt,
                mediaType,
                mediaUrl,
                status: "PENDING",
            };

            const res = await fetch(`${API_URL}/api/complaints`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(complaint),
            });

            if (!res.ok) { const t = await res.text(); console.error(t); throw new Error("Failed to submit complaint"); }

            const saved = await res.json();
            const code  = `CP-${String(saved.id).padStart(4, "0")}`;
            const priority = severityOf(saved);
            const status   = assessmentStatus(saved.severityAssessment);
            const msg      = priority === "UNASSESSED" ? status : `${priority} priority · ${status}`;

            if (saved.submissionResult === "ALREADY_REPORTED") {
                alert(`You have already reported this issue (${code}).\nWe'll keep you updated on its progress.`);
            } else if (saved.submissionResult === "MERGED") {
                alert(`Your report was added to an existing nearby issue.\nReference: ${code}\n${msg}`);
            } else {
                alert(`Complaint submitted successfully!\nComplaint ID: ${code}\n${msg}`);
            }

            navigate("/citizen");
        } catch {
            alert("Failed to submit complaint.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => { clearSession(); navigate("/"); };

    // =====================================================
    // RENDER
    // =====================================================

    const hasMedia = photo || recordedVideo;

    return (
        <div className="cp-complaint-page cp-app">

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
            <main className="cp-complaint-main">

                {/* HERO */}
                <div className="cp-complaint-hero">
                    <div className="cp-eyebrow">New Report</div>
                    <h1>Report a Civic Issue</h1>
                    <p>Attach photo or video evidence with GPS so officers can act fast.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="cp-complaint-card">

                        {/* ── CATEGORY ── */}
                        <div className="cp-field">
                            <label htmlFor="cp-category">Complaint Category</label>
                            <select
                                id="cp-category"
                                className="cp-complaint-select"
                                value={category}
                                onChange={(e) => { setCategory(e.target.value); setHazardEvidence({}); }}
                                required
                            >
                                <option value="">Select a category…</option>
                                {CATEGORIES.map((opt) => <option key={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* ── HAZARD EVIDENCE (dynamic per category) ── */}
                        {category && (
                            <HazardEvidenceFields
                                category={category}
                                value={hazardEvidence}
                                onChange={setHazardEvidence}
                            />
                        )}

                        <hr className="cp-section-divider" />

                        {/* ── DESCRIPTION ── */}
                        <div className="cp-field">
                            <label htmlFor="cp-desc">Description</label>
                            <textarea
                                id="cp-desc"
                                className="cp-complaint-textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the problem in detail…"
                                rows={5}
                                maxLength={500}
                                required
                            />
                            <div className="cp-char-count">{description.length} / 500</div>
                        </div>

                        <hr className="cp-section-divider" />

                        {/* ── LOCATION ── */}
                        <div className="cp-field">
                            <label>Complaint Location</label>
                            <div className={`cp-loc-box ${location ? "cp-loc-ok" : ""}`}>
                                <div className="cp-loc-info">
                                    <span className="cp-loc-icon">
                                        <Icon name="pin" size={20} />
                                    </span>
                                    <div>
                                        {!location ? (
                                            <>
                                                <h3>Location not captured</h3>
                                                <p>GPS coordinates will be attached to your report.</p>
                                            </>
                                        ) : (
                                            <>
                                                <h3>✓ Location captured</h3>
                                                <p>{location.address}</p>
                                                <p className="cp-loc-coords">
                                                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                                    {" · "}±{location.accuracy.toFixed(0)} m
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="cp-btn cp-btn-primary cp-btn-sm"
                                    onClick={getLocation}
                                    disabled={locationLoading}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {locationLoading ? (
                                        <><span className="lg-spinner" style={{ width: 13, height: 13 }} /> Finding…</>
                                    ) : (
                                        <><Icon name="pin" size={14} /> {location ? "Refresh" : "Get location"}</>
                                    )}
                                </button>
                            </div>
                        </div>

                        <hr className="cp-section-divider" />

                        {/* ── EVIDENCE ── */}
                        <div className="cp-field">
                            <label>Evidence</label>
                            <span className="cp-hint">
                                Capture a photo or record a short video directly with your device camera.
                            </span>

                            {/* PICK PHOTO / VIDEO */}
                            {!hasMedia && !showCamera && (
                                <div className="cp-evidence-cards">
                                    <button type="button" className="cp-ev-card cp-ev-photo" onClick={openCamera}>
                                        <span className="cp-ev-icon"><Icon name="camera" size={22} /></span>
                                        <span className="cp-ev-title">Capture Photo</span>
                                        <span className="cp-ev-sub">Open camera</span>
                                    </button>
                                    <button type="button" className="cp-ev-card cp-ev-video" onClick={startVideoRecording}>
                                        <span className="cp-ev-icon"><Icon name="play" size={22} /></span>
                                        <span className="cp-ev-title">Record Video</span>
                                        <span className="cp-ev-sub">Start recording</span>
                                    </button>
                                </div>
                            )}

                            {/* CAMERA FEED */}
                            {showCamera && (
                                <div className="cp-camera-wrap">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="cp-camera-feed"
                                    />
                                    {cameraMode === "VIDEO" && isRecording && (
                                        <div className="cp-recording-badge">
                                            <span className="cp-recording-dot" />
                                            Recording…
                                        </div>
                                    )}
                                    <div className="cp-camera-controls">
                                        {cameraMode === "PHOTO" && (
                                            <button type="button" className="cp-capture-btn" onClick={capturePhoto}>
                                                <Icon name="camera" size={16} /> Capture
                                            </button>
                                        )}
                                        {cameraMode === "VIDEO" && isRecording && (
                                            <button type="button" className="cp-capture-btn" onClick={stopVideoRecording}>
                                                <Icon name="x" size={16} /> Stop recording
                                            </button>
                                        )}
                                        <button type="button" className="cp-cancel-camera" onClick={cancelCamera}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PHOTO PREVIEW */}
                            {photo && (
                                <div className="cp-preview-wrap">
                                    <img src={photo.url} alt="Captured evidence" className="cp-preview-media" />
                                    <div className="cp-preview-info">
                                        <p className="cp-preview-ok">
                                            <Icon name="check" size={13} /> Photo captured
                                        </p>
                                        <p>🕐 {new Date(photo.capturedAt).toLocaleString()}</p>
                                        {location && <p><Icon name="pin" size={12} /> {location.address}</p>}
                                    </div>
                                    <div className="cp-preview-footer">
                                        <button
                                            type="button"
                                            className="cp-btn cp-btn-ghost cp-btn-sm"
                                            onClick={retakePhoto}
                                        >
                                            <Icon name="refresh" size={13} /> Retake photo
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* VIDEO PREVIEW */}
                            {recordedVideo && (
                                <div className="cp-preview-wrap">
                                    <video
                                        src={recordedVideo.url}
                                        controls
                                        playsInline
                                        className="cp-preview-media"
                                    />
                                    <div className="cp-preview-info">
                                        <p className="cp-preview-ok">
                                            <Icon name="check" size={13} /> Video recorded
                                        </p>
                                        <p>🕐 {new Date(recordedVideo.capturedAt).toLocaleString()}</p>
                                        {location && <p><Icon name="pin" size={12} /> {location.address}</p>}
                                    </div>
                                    <div className="cp-preview-footer">
                                        <button
                                            type="button"
                                            className="cp-btn cp-btn-ghost cp-btn-sm"
                                            onClick={retakeVideo}
                                        >
                                            <Icon name="refresh" size={13} /> Retake video
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Hidden canvas for photo capture */}
                            <canvas ref={canvasRef} style={{ display: "none" }} />
                        </div>

                        {/* ── SUBMIT ── */}
                        <button
                            type="submit"
                            className="cp-submit-btn"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <><span className="lg-spinner" /> Submitting…</>
                            ) : (
                                <><Icon name="bolt" size={16} /> Submit Complaint</>
                            )}
                        </button>

                    </div>
                </form>

            </main>
        </div>
    );
}

export default Complaint;
