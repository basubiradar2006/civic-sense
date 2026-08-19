import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ReportDetails.css";

function ReportDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchComplaint = async () => {
            const token = localStorage.getItem("token");

            try {
                const response = await fetch(
                    `${API_URL}/api/complaints/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to load complaint details"
                    );
                }

                const data = await response.json();

                setComplaint(data);
            } catch (err) {
                console.error(err);
                setError(
                    "Unable to load complaint details."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchComplaint();
    }, [id, API_URL]);

    if (loading) {
        return (
            <div className="report-details-page">
                <h2>Loading complaint...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="report-details-page">
                <h2>{error}</h2>

                <button onClick={() => navigate(-1)}>
                    Go Back
                </button>
            </div>
        );
    }

    if (!complaint) {
        return (
            <div className="report-details-page">
                <h2>Complaint not found</h2>

                <button onClick={() => navigate(-1)}>
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="report-details-page">

            <div className="report-details-header">

                <button
                    className="report-back-btn"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <div>
                    <span>COMPLAINT DETAILS</span>

                    <h1>
                        CS-
                        {String(complaint.id).padStart(
                            4,
                            "0"
                        )}
                    </h1>
                </div>

            </div>

            <div className="report-details-card">

                <div className="report-details-image">

                    {complaint.mediaUrl ? (
                        <img
                            src={complaint.mediaUrl}
                            alt={
                                complaint.category ||
                                "Complaint"
                            }
                        />
                    ) : (
                        <div>
                            No image available
                        </div>
                    )}

                </div>

                <div className="report-details-content">

                    <div className="report-detail-row">
                        <span>Category</span>
                        <strong>
                            {complaint.category ||
                                "N/A"}
                        </strong>
                    </div>

                    <div className="report-detail-row">
                        <span>Status</span>
                        <strong>
                            {complaint.status ||
                                "N/A"}
                        </strong>
                    </div>

                    <div className="report-detail-row">
                        <span>Description</span>
                        <strong>
                            {complaint.description ||
                                "No description"}
                        </strong>
                    </div>

                    <div className="report-detail-row">
                        <span>Address</span>
                        <strong>
                            {complaint.address ||
                                "N/A"}
                        </strong>
                    </div>

                    <div className="report-detail-row">
                        <span>Latitude</span>
                        <strong>
                            {complaint.latitude ??
                                "N/A"}
                        </strong>
                    </div>

                    <div className="report-detail-row">
                        <span>Longitude</span>
                        <strong>
                            {complaint.longitude ??
                                "N/A"}
                        </strong>
                    </div>

                    <div className="report-detail-row">
                        <span>Reported At</span>
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
                            <span>Contractor</span>
                            <strong>
                                {complaint.contractor.name ||
                                    complaint.contractor.email}
                            </strong>
                        </div>
                    )}

                </div>

            </div>

        </div>
    );
}

export default ReportDetails;