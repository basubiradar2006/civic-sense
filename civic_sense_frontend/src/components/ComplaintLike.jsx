import { useEffect, useState } from "react";
import "./ComplaintLike.css";

const API_URL = import.meta.env.VITE_API_URL;

function ComplaintLike({
    complaintId,
    initialLikeCount = 0,
    initialLiked = false,
}) {
    const [likeCount, setLikeCount] =
        useState(initialLikeCount);

    const [liked, setLiked] =
        useState(initialLiked);

    const [loading, setLoading] =
        useState(false);

    useEffect(() => {
        setLikeCount(initialLikeCount);
        setLiked(initialLiked);
    }, [
        complaintId,
        initialLikeCount,
        initialLiked,
    ]);

    const handleLike = async () => {

        if (loading) {
            return;
        }

        const token =
            localStorage.getItem("token");

        if (!token) {
            console.error(
                "User is not logged in"
            );
            return;
        }

        const previousLiked = liked;
        const previousCount = likeCount;

        // ============================================
        // OPTIMISTIC UI
        // ============================================

        const newLiked = !liked;

        setLiked(newLiked);

        setLikeCount(
            newLiked
                ? likeCount + 1
                : Math.max(0, likeCount - 1)
        );

        try {

            setLoading(true);

            const method =
                newLiked
                    ? "POST"
                    : "DELETE";

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

            if (!response.ok) {

                throw new Error(
                    "Failed to update like"
                );
            }

            const data =
                await response.json();

            // Use actual backend result
            setLiked(
                data.liked === true
            );

            setLikeCount(
                Number(data.likeCount) || 0
            );

        } catch (error) {

            console.error(
                "Like error:",
                error
            );

            // ========================================
            // ROLLBACK IF SERVER FAILED
            // ========================================

            setLiked(previousLiked);
            setLikeCount(previousCount);

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="complaint-like-container">

            <button
                type="button"
                className={`complaint-like-btn ${
                    liked
                        ? "liked"
                        : ""
                }`}
                onClick={handleLike}
                disabled={loading}
            >

                <span className="like-icon">
                    👍
                </span>

                {/* <span className="like-text">
                    {liked
                        ? "Experiencing this too"
                        : "I'm experiencing this too"}
                </span> */}

                <span className="like-count">
                    {likeCount}
                </span>

            </button>

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