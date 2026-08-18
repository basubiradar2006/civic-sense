import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Register.css";

const API_URL=import.meta.env.VITE_API_URL;

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
        <div className="register-container">

            <div className="register-card">

                <h1>CivicProof</h1>

                <p className="register-subtitle">
                    Create your account
                </p>

                <form onSubmit={handleRegister}>

                    <label>Name</label>

                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

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

                    <label>Role</label>

                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="CITIZEN">Citizen</option>
                        <option value="OFFICER">Officer</option>
                        <option value="CONTRACTOR">Contractor</option>
                    </select>

                    {error && (
                        <p className="register-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating account..."
                            : "Register"
                        }
                    </button>

                </form>

                <p className="register-login">
                    Already have an account?

                    <button
                        onClick={() => navigate("/")}
                    >
                        Login
                    </button>
                </p>

            </div>

        </div>
    );
}

export default Register;