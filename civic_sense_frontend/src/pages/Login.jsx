import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Invalid email or password");
            }

            // Store JWT
            localStorage.setItem("token", data.token);

            // Store user information
            localStorage.setItem(
                "user",
                JSON.stringify({
                    userId: data.userId,
                    name: data.name,
                    email: data.email,
                    role: data.role,
                })
            );

            // Redirect according to role
            if (data.role === "CITIZEN") {
                navigate("/citizen");
            } else if (data.role === "OFFICER") {
                navigate("/officer");
            } else if (data.role === "CONTRACTOR") {
                navigate("/contractor");
            } else {
                setError("Invalid user role.");
            }
        } catch (error) {
            setError(error.message || "Unable to login. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* BRANDING */}
            <div className="login-brand">

                <div className="brand-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                    >
                        <path d="M12 3 5 6v5c0 4.5 2.8 8.4 7 10 4.2-1.6 7-5.5 7-10V6l-7-3Z" />
                    </svg>
                </div>

                <h1>CivicSense</h1>

                <p>Civic Complaint &amp; Accountability Platform</p>

            </div>


            {/* LOGIN CARD */}
            <div className="login-card">

                {/* TABS */}
                <div className="auth-tabs">

                    <button
                        type="button"
                        className="auth-tab active"
                    >
                        Log In
                    </button>

                    <button
                        type="button"
                        className="auth-tab"
                        onClick={() => navigate("/register")}
                    >
                        Register as Citizen
                    </button>

                </div>


                {/* FORM */}
                <form
                    className="login-form"
                    onSubmit={handleLogin}
                >

                    {/* EMAIL */}
                    <div className="input-group">

                        <label htmlFor="email">
                            Email Address
                        </label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="14"
                                        rx="2"
                                    />

                                    <path d="m3 7 9 6 9-6" />
                                </svg>
                            </span>

                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                autoComplete="email"
                                required
                            />

                        </div>

                    </div>


                    {/* PASSWORD */}
                    <div className="input-group">

                        <label htmlFor="password">
                            Password
                        </label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <rect
                                        x="5"
                                        y="10"
                                        width="14"
                                        height="10"
                                        rx="2"
                                    />

                                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                </svg>
                            </span>


                            <input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />


                            {/* SHOW / HIDE PASSWORD */}
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >

                                {showPassword ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6a17 17 0 0 1-3.2 4.1" />
                                        <path d="M6.2 6.2A16.7 16.7 0 0 0 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.7-.5" />
                                    </svg>
                                ) : (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="2.5"
                                        />
                                    </svg>
                                )}

                            </button>

                        </div>

                    </div>


                    {/* ERROR */}
                    {error && (
                        <div className="login-error">

                            <span className="error-icon">
                                !
                            </span>

                            <span>
                                {error}
                            </span>

                        </div>
                    )}


                    {/* LOGIN BUTTON */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >

                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            "Log In"
                        )}

                    </button>

                </form>

            </div>


            {/* FOOTER */}
            <div className="login-footer">
                <span>Secured by Supabase Auth</span>
                <span>•</span>
                <span>Role-based access control</span>
            </div>

        </div>
    );
}

export default Login;