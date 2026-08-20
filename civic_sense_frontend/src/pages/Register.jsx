import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Register.css";

const API_URL = import.meta.env.VITE_API_URL;

function Register() {

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("CITIZEN");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const response = await fetch(
                `${API_URL}/api/auth/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password,
                        role: role
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            // Registration successful
            navigate("/");

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="register-page">

            {/* BRANDING */}
            <div className="register-brand">

                <div className="register-brand-icon">
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

                <p>
                    Civic Complaint &amp; Accountability Platform
                </p>

            </div>


            {/* REGISTER CARD */}
            <div className="register-card">

                {/* TABS */}
                <div className="register-tabs">

                    <button
                        type="button"
                        className="register-tab"
                        onClick={() => navigate("/")}
                    >
                        Log In
                    </button>

                    <button
                        type="button"
                        className="register-tab active"
                    >
                        Register as Citizen
                    </button>

                </div>


                {/* FORM */}
                <form onSubmit={handleRegister}>

                    {/* NAME */}
                    <div className="register-input-group">

                        <label htmlFor="name">
                            Full Name
                        </label>

                        <div className="register-input-wrapper">

                            <span className="register-input-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle
                                        cx="12"
                                        cy="8"
                                        r="3.2"
                                    />

                                    <path d="M5.5 20c.7-3.4 2.9-5.2 6.5-5.2s5.8 1.8 6.5 5.2" />
                                </svg>
                            </span>

                            <input
                                id="name"
                                type="text"
                                placeholder="e.g. Rohan Deshmukh"
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                required
                            />

                        </div>

                    </div>


                    {/* EMAIL */}
                    <div className="register-input-group">

                        <label htmlFor="email">
                            Email Address
                        </label>

                        <div className="register-input-wrapper">

                            <span className="register-input-icon">
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
                                required
                            />

                        </div>

                    </div>


                    {/* PASSWORD */}
                    <div className="register-input-group">

                        <label htmlFor="password">
                            Password
                        </label>

                        <div className="register-input-wrapper">

                            <span className="register-input-icon">
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
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                            />

                        </div>

                    </div>


                    {/* ERROR */}
                    {error && (
                        <div className="register-error">

                            <span className="register-error-icon">
                                !
                            </span>

                            <span>
                                {error}
                            </span>

                        </div>
                    )}


                    {/* REGISTER BUTTON */}
                    <button
                        type="submit"
                        className="register-button"
                        disabled={loading}
                    >

                        {loading
                            ? (
                                <>
                                    <span className="register-spinner"></span>
                                    Creating account...
                                </>
                            )
                            : "Create Citizen Account"
                        }

                    </button>

                </form>

            </div>


            {/* FOOTER */}
            <div className="register-footer">
                <span>Secured by Supabase Auth</span>
                <span>•</span>
                <span>Role-based access control</span>
            </div>

        </div>
    );
}

export default Register;