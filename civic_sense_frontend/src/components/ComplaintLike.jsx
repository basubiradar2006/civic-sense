import { useEffect, useState } from "react";
import "./ComplaintLike.css";

const API_URL = import.meta.env.VITE_API_URL;

function ComplaintLike({
    complaintId,
    initialLikeCount = 0,
    initialLiked = false,
}) {
    const [likeCount, setLikeCount] =
        useState(Number(initialLikeCount) || 0);

    const [liked, setLiked] =
        useState(initialLiked === true);

    const [loading, setLoading] =
        useState(false);

    // ============================================
    // GET LOGGED-IN USER ROLE
    // ============================================

    const getUserRole = () => {
        // First try separate role value
        const storedRole =
            localStorage.getItem("role");

        if (storedRole) {
            return storedRole.toUpperCase();
        }

        // Otherwise try the stored user object
        const storedUser =
            localStorage.getItem("user");

        if (storedUser) {
            try {
                const user =
                    JSON.parse(storedUser);

                return String(
                    user?.role ||
                    user?.userRole ||
                    ""
                ).toUpperCase();
            } catch (error) {
                console.error(
                    "Failed to parse stored user:",
                    error
                );
            }
        }

        return "";
    };

    const role = getUserRole();

    // Only citizens can like/unlike
    const isCitizen =
        role === "CITIZEN";

    // ============================================
    // UPDATE STATE WHEN PROPS CHANGE
    // ============================================

    useEffect(() => {
        setLikeCount(
            Number(initialLikeCount) || 0
        );

        setLiked(
            initialLiked === true
        );
    }, [
        complaintId,
        initialLikeCount,
        initialLiked,
    ]);

    // ============================================
    // LIKE / UNLIKE
    // ============================================

    const handleLike = async () => {

        // Only citizens can like
        if (!isCitizen) {
            console.error(
                "Like blocked: current user is not a CITIZEN.",
                "Detected role:",
                role
            );
            return;
        }

        if (loading) {
            return;
        }

        const token =
            localStorage.getItem("token");

        if (!token) {
            console.error(
                "User is not logged in."
            );
            return;
        }

        if (!complaintId) {
            console.error(
                "Complaint ID is missing."
            );
            return;
        }

        const previousLiked =
            liked;

        const previousCount =
            likeCount;

        // ============================================
        // OPTIMISTIC UI
        // ============================================

        const newLiked =
            !liked;

        setLiked(newLiked);

        setLikeCount(
            newLiked
                ? likeCount + 1
                : Math.max(
                    0,
                    likeCount - 1
                )
        );

        try {
            setLoading(true);

            const method =
                newLiked
                    ? "POST"
                    : "DELETE";

            console.log(
                `${method} like request:`,
                complaintId
            );

            const response =
                await fetch(
                    `${API_URL}/api/complaints/${complaintId}/like`,
                    {
                        method,
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                        },
                    }
                );

            // ============================================
            // AUTH ERROR
            // ============================================

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                console.error(
                    "Like request unauthorized:",
                    response.status
                );

                throw new Error(
                    "You are not authorized to like this complaint."
                );
            }

            // ============================================
            // OTHER SERVER ERROR
            // ============================================

            if (!response.ok) {
                const errorText =
                    await response.text();

                console.error(
                    "Like API error:",
                    response.status,
                    errorText
                );

                throw new Error(
                    "Failed to update like."
                );
            }

            // ============================================
            // BACKEND RESPONSE
            // ============================================

            const data =
                await response.json();

            console.log(
                "Like API response:",
                data
            );

            // Backend should return:
            // {
            //   liked: true/false,
            //   likeCount: number
            // }

            if (
                typeof data.liked !==
                "undefined"
            ) {
                setLiked(
                    data.liked === true
                );
            }

            if (
                typeof data.likeCount !==
                "undefined"
            ) {
                setLikeCount(
                    Number(data.likeCount) || 0
                );
            }

        } catch (error) {

            console.error(
                "Like error:",
                error
            );

            // ============================================
            // ROLLBACK OPTIMISTIC UI
            // ============================================

            setLiked(
                previousLiked
            );

            setLikeCount(
                previousCount
            );

        } finally {

            setLoading(false);
        }
    };

    // ============================================
    // UI
    // ============================================

    return (
        <div className="complaint-like-container">

            {isCitizen ? (

                <button
                    type="button"
                    className={`complaint-like-btn ${
                        liked
                            ? "liked"
                            : ""
                    }`}
                    onClick={handleLike}
                    disabled={loading}
                    title={
                        liked
                            ? "Unlike this complaint"
                            : "I am experiencing this too"
                    }
                >

                    <span className="like-icon">
                        👍
                    </span>

                    <span className="like-count">
                        {likeCount}
                    </span>

                </button>

            ) : (

                <div
                    className={`complaint-like-btn ${
                        liked
                            ? "liked"
                            : ""
                    }`}
                >

                    <span className="like-icon">
                        👍
                    </span>

                    <span className="like-count">
                        {likeCount}
                    </span>

                </div>

            )}

            <div className="experience-text">

                👥 {likeCount}{" "}

                {likeCount === 1
                    ? "person is experiencing this"
                    : "people are experiencing this"}

            </div>

        </div>
    );
}

export default ComplaintLike;