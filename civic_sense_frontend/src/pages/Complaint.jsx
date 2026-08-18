import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Complaint.css";

import { supabase } from "../supabaseClient";

const API_URL = import.meta.env.VITE_API_URL;

function Complaint() {
    const navigate = useNavigate();

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");

    const [showCamera, setShowCamera] = useState(false);
    const [photo, setPhoto] = useState(null);

    const [location, setLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);

    // =====================================================
    // STOP CAMERA WHEN LEAVING PAGE
    // =====================================================

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);


    // =====================================================
    // OPEN CAMERA
    // =====================================================

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" }
                },
                audio: false
            });

            streamRef.current = stream;

            setShowCamera(true);

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);

        } catch (error) {
            console.error("Camera error:", error);

            alert(
                "Camera access denied or camera is not available."
            );
        }
    };


    // =====================================================
    // STOP CAMERA
    // =====================================================

    const stopCamera = () => {
        if (streamRef.current) {

            streamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current = null;
        }
    };


    // =====================================================
    // CAPTURE PHOTO
    // =====================================================

    const capturePhoto = () => {

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const capturedAt = new Date().toISOString();

        canvas.toBlob(
            (blob) => {

                if (!blob) return;

                const file = new File(
                    [blob],
                    `evidence-${Date.now()}.jpg`,
                    {
                        type: "image/jpeg"
                    }
                );

                setPhoto({
                    file: file,
                    url: URL.createObjectURL(blob),
                    capturedAt: capturedAt
                });

                stopCamera();
                setShowCamera(false);

                // Get GPS after photo capture
                getLocation();
            },
            "image/jpeg",
            0.9
        );
    };


    // =====================================================
    // RETAKE PHOTO
    // =====================================================

    const retakePhoto = () => {
        setPhoto(null);
        openCamera();
    };


    // =====================================================
    // GET GPS + REVERSE GEOCODING
    // =====================================================

    const getLocation = () => {

        if (!navigator.geolocation) {

            alert(
                "Geolocation is not supported by this browser."
            );

            return;
        }

        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(

            async (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;

                console.log("========== GPS DEBUG ==========");
                console.log("Latitude:", latitude);
                console.log("Longitude:", longitude);
                console.log("Accuracy:", accuracy);
                console.log("Full position:", position);
                console.log("================================");

                // Show GPS immediately
                setLocation({
                    latitude,
                    longitude,
                    accuracy,
                    address: "Finding address..."
                });


                // =================================================
                // REVERSE GEOCODING
                // =================================================

                try {

                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        {
                            headers: {
                                Accept: "application/json"
                            }
                        }
                    );


                    if (!response.ok) {
                        throw new Error(
                            "Failed to get address"
                        );
                    }


                    const data =
                        await response.json();


                    console.log(
                        "Reverse geocoding response:",
                        data
                    );


                    const address =
                        data.display_name ||
                        "Address not available";


                    // Save address with GPS
                    setLocation({
                        latitude,
                        longitude,
                        accuracy,
                        address
                    });


                } catch (error) {

                    console.error(
                        "Reverse geocoding error:",
                        error
                    );


                    // GPS is still valid even if
                    // address lookup fails
                    setLocation({
                        latitude,
                        longitude,
                        accuracy,
                        address: "Address not available"
                    });
                }


                setLocationLoading(false);
            },


            (error) => {

                console.error(
                    "Location error:",
                    error
                );

                setLocationLoading(false);

                alert(
                    "Unable to get your location. Please allow location permission."
                );
            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };


    // =====================================================
    // SUBMIT COMPLAINT
    // =====================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        // =================================================
        // VALIDATION
        // =================================================

        if (!category) {

            alert(
                "Please select a category."
            );

            return;
        }


        if (!description.trim()) {

            alert(
                "Please enter a description."
            );

            return;
        }


        if (!photo) {

            alert(
                "Please capture evidence."
            );

            return;
        }


        if (!location) {

            alert(
                "Please capture your location."
            );

            return;
        }


        // Don't submit while address is still loading
        if (
            !location.address ||
            location.address === "Finding address..."
        ) {

            alert(
                "Please wait until the address is detected."
            );

            return;
        }


        try {

            // =================================================
            // 1. GET LOGIN TOKEN
            // =================================================

            const token =
                localStorage.getItem("token");


            if (!token) {

                alert(
                    "Please login again."
                );

                return;
            }


            // =================================================
            // 2. CREATE FILE PATH
            // =================================================

            const fileName =
                `complaint-${Date.now()}.jpg`;

            const filePath =
                `complaints/${fileName}`;


            // =================================================
            // 3. UPLOAD PHOTO TO SUPABASE
            // =================================================

            console.log(
                "Uploading photo..."
            );


            const {
                error: uploadError
            } = await supabase.storage
                .from("evidence")
                .upload(
                    filePath,
                    photo.file,
                    {
                        contentType: "image/jpeg",
                        upsert: false
                    }
                );


            if (uploadError) {

                console.error(
                    "Supabase upload error:",
                    uploadError
                );

                alert(
                    "Failed to upload photo."
                );

                return;
            }


            console.log(
                "Photo uploaded successfully!"
            );


            // =================================================
            // 4. GET PHOTO URL
            // =================================================

            const {
                data: urlData
            } = supabase.storage
                .from("evidence")
                .getPublicUrl(filePath);


            const mediaUrl =
                urlData.publicUrl;


            console.log(
                "Photo URL:",
                mediaUrl
            );


            // =================================================
            // 5. CREATE COMPLAINT OBJECT
            // =================================================

            const complaint = {

                category: category,

                description: description,

                // GPS
                latitude: location.latitude,

                longitude: location.longitude,

                accuracy: location.accuracy,

                // Human-readable address
                address: location.address,

                // Evidence time
                capturedAt: photo.capturedAt,

                // Media
                mediaType: "PHOTO",

                mediaUrl: mediaUrl,

                // New complaints always start PENDING
                status: "PENDING"
            };


            console.log(
                "Sending complaint:",
                complaint
            );


            // =================================================
            // 6. SEND TO SPRING BOOT
            // =================================================

            const response = await fetch(
                `${API_URL}/api/complaints`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify(
                        complaint
                    )
                }
            );


            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "Backend error:",
                    errorText
                );

                throw new Error(
                    "Failed to submit complaint"
                );
            }


            // =================================================
            // 7. GET SAVED COMPLAINT
            // =================================================

            const savedComplaint =
                await response.json();


            console.log(
                "Saved complaint:",
                savedComplaint
            );


            // =================================================
            // 8. SUCCESS
            // =================================================

            alert(
                `Complaint submitted successfully!\nComplaint ID: ${savedComplaint.id}`
            );


            navigate("/citizen");


        } catch (error) {

            console.error(
                "Complaint submission error:",
                error
            );

            alert(
                "Failed to submit complaint."
            );
        }
    };


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <div className="complaint-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <header className="complaint-header">

                <button
                    className="back-btn"
                    onClick={() =>
                        navigate("/citizen")
                    }
                >
                    ← Back
                </button>


                <h1>
                    Raise a Complaint
                </h1>


                <div className="header-space"></div>

            </header>


            {/* =================================================
                MAIN
            ================================================= */}

            <main className="complaint-container">


                <div className="complaint-intro">

                    <h2>
                        Report a Civic Issue
                    </h2>

                    <p>
                        Report problems in your
                        area with verified evidence.
                    </p>

                </div>


                <form
                    className="complaint-form"
                    onSubmit={handleSubmit}
                >


                    {/* =================================================
                        CATEGORY
                    ================================================= */}

                    <div className="form-group">

                        <label>
                            Complaint Category
                        </label>


                        <select
                            value={category}
                            onChange={(e) =>
                                setCategory(
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Select a category
                            </option>


                            <option value="Road Damage">
                                Road Damage
                            </option>


                            <option value="Garbage">
                                Garbage / Waste
                            </option>


                            <option value="Street Light">
                                Street Light
                            </option>


                            <option value="Water Leakage">
                                Water Leakage
                            </option>


                            <option value="Drainage">
                                Drainage Problem
                            </option>


                            <option value="Illegal Dumping">
                                Illegal Dumping
                            </option>


                            <option value="Public Property Damage">
                                Public Property Damage
                            </option>


                            <option value="Other">
                                Other
                            </option>

                        </select>

                    </div>


                    {/* =================================================
                        DESCRIPTION
                    ================================================= */}

                    <div className="form-group">

                        <label>
                            Description
                        </label>


                        <textarea
                            value={description}
                            onChange={(e) =>
                                setDescription(
                                    e.target.value
                                )
                            }
                            placeholder="Describe the problem..."
                            rows="6"
                            maxLength="500"
                        />


                        <div className="character-count">
                            {description.length}/500
                        </div>

                    </div>


                    {/* =================================================
                        LOCATION
                    ================================================= */}

                    <div className="form-group">

                        <label>
                            Complaint Location
                        </label>


                        <div className="location-box">


                            <div className="location-info">


                                <div className="location-icon">
                                    📍
                                </div>


                                <div>


                                    {!location ? (

                                        <>

                                            <h3>
                                                Location not captured
                                            </h3>


                                            <p>
                                                GPS location will
                                                be attached to
                                                your complaint.
                                            </p>

                                        </>

                                    ) : (

                                        <>

                                            <h3>
                                                ✓ Location captured
                                            </h3>


                                            {/* ADDRESS */}

                                            <p>
                                                📍{" "}
                                                {location.address}
                                            </p>


                                            {/* COORDINATES */}

                                            <p className="coordinates">
                                                {location.latitude.toFixed(6)},
                                                {" "}
                                                {location.longitude.toFixed(6)}
                                            </p>


                                            {/* ACCURACY */}

                                            <p>
                                                Accuracy:
                                                {" "}
                                                {location.accuracy.toFixed(1)}
                                                {" "}m
                                            </p>

                                        </>

                                    )}

                                </div>

                            </div>


                            <button
                                type="button"
                                className="location-btn"
                                onClick={getLocation}
                                disabled={locationLoading}
                            >

                                {locationLoading
                                    ? "Finding location..."
                                    : "Get Location"}

                            </button>

                        </div>

                    </div>


                    {/* =================================================
                        EVIDENCE
                    ================================================= */}

                    <div className="form-group">

                        <label>
                            Evidence
                        </label>


                        <p className="evidence-text">
                            Capture evidence directly
                            using your device camera.
                        </p>


                        {/* CAMERA / VIDEO BUTTONS */}

                        {!photo && !showCamera && (

                            <div className="evidence-container">


                                <button
                                    type="button"
                                    className="evidence-card photo-card"
                                    onClick={openCamera}
                                >

                                    <span className="evidence-icon">
                                        📷
                                    </span>


                                    <span className="evidence-title">
                                        Capture Photo
                                    </span>


                                    <span className="evidence-subtitle">
                                        Open Camera
                                    </span>

                                </button>


                                <button
                                    type="button"
                                    className="evidence-card video-card"
                                    onClick={() => {

                                        alert(
                                            "Video recording will be added next."
                                        );

                                    }}
                                >

                                    <span className="evidence-icon">
                                        🎥
                                    </span>


                                    <span className="evidence-title">
                                        Record Video
                                    </span>


                                    <span className="evidence-subtitle">
                                        Open Camera
                                    </span>

                                </button>

                            </div>

                        )}


                        {/* =================================================
                            CAMERA
                        ================================================= */}

                        {showCamera && (

                            <div className="camera-container">


                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="camera-preview"
                                />


                                <div className="camera-controls">


                                    <button
                                        type="button"
                                        className="capture-btn"
                                        onClick={capturePhoto}
                                    >
                                        📷 Capture
                                    </button>


                                    <button
                                        type="button"
                                        className="cancel-camera-btn"
                                        onClick={() => {

                                            stopCamera();

                                            setShowCamera(false);

                                        }}
                                    >
                                        Cancel
                                    </button>

                                </div>

                            </div>

                        )}


                        {/* =================================================
                            PHOTO PREVIEW
                        ================================================= */}

                        {photo && (

                            <div className="photo-preview-container">


                                <img
                                    src={photo.url}
                                    alt="Captured evidence"
                                    className="photo-preview"
                                />


                                <div className="photo-details">


                                    <p>
                                        ✓ Photo captured
                                    </p>


                                    <p>
                                        🕐{" "}
                                        {new Date(
                                            photo.capturedAt
                                        ).toLocaleString()}
                                    </p>


                                    {location && (

                                        <>

                                            <p>
                                                📍{" "}
                                                {location.address}
                                            </p>


                                            <p>
                                                {location.latitude.toFixed(6)},
                                                {" "}
                                                {location.longitude.toFixed(6)}
                                            </p>

                                        </>

                                    )}

                                </div>


                                <button
                                    type="button"
                                    className="retake-btn"
                                    onClick={retakePhoto}
                                >
                                    Retake Photo
                                </button>

                            </div>

                        )}


                        {/* Hidden canvas */}

                        <canvas
                            ref={canvasRef}
                            style={{
                                display: "none"
                            }}
                        />

                    </div>


                    {/* =================================================
                        SUBMIT
                    ================================================= */}

                    <button
                        type="submit"
                        className="submit-btn"
                    >
                        Submit Complaint
                    </button>


                </form>

            </main>

        </div>
    );
}

export default Complaint;