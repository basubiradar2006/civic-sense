import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

const API_URL=import.meta.env.VITE_API_URL;

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
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
                    role: data.role
                })
            );

            // Redirect according to role
            if (data.role === "CITIZEN") {
                navigate("/citizen");

            } else if (data.role === "OFFICER") {
                navigate("/officer");

            } else if (data.role === "CONTRACTOR") {
                navigate("/contractor");
            }

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);
        }
    };

    return (
        <div className="login-container">

            <div className="login-card">

                <h1>CivicProof</h1>

                <p className="login-subtitle">
                    Civic Accountability Platform
                </p>

                <form onSubmit={handleLogin}>

                    <label>Email</label>

                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>

                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                <p className="login-register">
                    Don't have an account?

                    <button
                        onClick={() => navigate("/register")}
                    >
                        Register
                    </button>
                </p>

            </div>

        </div>
    );
}

export default Login;