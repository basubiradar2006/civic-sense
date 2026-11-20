import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Icon } from "../components/ui";
import "../styles/Login.css";

const ROLE_HOME = {
    CITIZEN: "/citizen",
    OFFICER: "/officer",
    CONTRACTOR: "/contractor",
};

function Login() {
    const navigate = useNavigate();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            // The backend accepts an email OR a phone number in "email"
            const data = await api("/api/auth/login", {
                method: "POST",
                auth: false,
                body: { email: identifier.trim(), password },
            });

            localStorage.setItem("token", data.token);
            localStorage.setItem(
                "user",
                JSON.stringify({
                    userId: data.userId,
                    id: data.userId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    role: data.role,
                })
            );
            sessionStorage.clear();

            const home = ROLE_HOME[data.role];
            if (!home) {
                throw new Error("Your account has no dashboard yet.");
            }
            navigate(home);
        } catch (err) {
            setError(err.message || "Unable to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lg-page">
            <div className="lg-frame">
                {/* ===== TAGLINE BANNER ===== */}
                <header className="lg-banner">
                    <span className="lg-logo">
                        <Icon name="logo" size={20} />
                    </span>
                    <h1>
                        Spot it. Snap it. <em>Get it fixed.</em>
                    </h1>
                    <p>CivicPulse turns every citizen report into a repair the city can't ignore.</p>
                </header>

                <div className="lg-columns">
                    {/* ===== ILLUSTRATION ===== */}
                    <section className="lg-art" aria-hidden="true">
                        <CityIllustration />

                        <div className="lg-float lg-float-a">
                            <span className="lg-float-icon">
                                <Icon name="users" size={16} />
                            </span>
                            <div>
                                <strong>14 citizens</strong>
                                <span>reported the same pothole</span>
                            </div>
                        </div>

                        <div className="lg-float lg-float-b">
                            <span className="lg-sev-ring">82</span>
                            <div>
                                <strong>Critical severity</strong>
                                <span>Main road · near a school</span>
                            </div>
                        </div>

                        <ul className="lg-points">
                            <li><Icon name="camera" size={15} /> Photo + GPS evidence</li>
                            <li><Icon name="layers" size={15} /> Duplicates merged automatically</li>
                            <li><Icon name="bolt" size={15} /> Live status for everyone</li>
                        </ul>
                    </section>

                    {/* ===== LOGIN CREDENTIALS ===== */}
                    <section className="lg-auth">
                        <div className="lg-auth-head">
                            <h2>Sign in</h2>
                            <p>Citizens, officers and contractors use the same login.</p>
                        </div>

                        <form className="lg-form" onSubmit={handleLogin} noValidate>
                            <label className="lg-field">
                                <span>Email or Phone Number</span>
                                <div className="lg-input">
                                    <Icon name="users" size={17} />
                                    <input
                                        type="text"
                                        inputMode="email"
                                        placeholder="you@example.com or +8801…"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="lg-field">
                                <span>Password</span>
                                <div className="lg-input">
                                    <Icon name="shield" size={17} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="lg-peek"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        <Icon name="eye" size={17} />
                                    </button>
                                </div>
                            </label>

                            {error && (
                                <div className="lg-error" role="alert">
                                    <Icon name="alert" size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="lg-btn lg-btn-primary"
                                disabled={loading || !identifier || !password}
                            >
                                {loading ? (
                                    <>
                                        <span className="lg-spinner" /> Signing in…
                                    </>
                                ) : (
                                    <>
                                        Sign in <Icon name="chevron" size={16} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="lg-divider">
                            <span>No account yet?</span>
                        </div>

                        <button
                            type="button"
                            className="lg-btn lg-btn-outline"
                            onClick={() => navigate("/register")}
                        >
                            Register
                        </button>

                        <p className="lg-foot">
                            <Icon name="shield" size={14} /> Role-based access · encrypted passwords
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// Map with reported potholes + a citizen reporting one
// =====================================================

function CityIllustration() {
    return (
        <svg className="lg-city" viewBox="0 0 520 400" role="img">
            <defs>
                <pattern id="lg-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.2" fill="#bfdcd5" />
                </pattern>
                <filter id="lg-soft" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f1d1a" floodOpacity="0.18" />
                </filter>
            </defs>

            <rect width="520" height="400" rx="22" fill="#e4f2ee" />
            <rect width="520" height="400" rx="22" fill="url(#lg-dots)" />

            {/* city blocks */}
            <g fill="#d3e9e3">
                <rect x="24" y="24" width="150" height="96" rx="12" />
                <rect x="24" y="196" width="150" height="180" rx="12" />
                <rect x="250" y="24" width="96" height="96" rx="12" />
                <rect x="250" y="196" width="96" height="70" rx="12" />
                <rect x="422" y="196" width="74" height="180" rx="12" />
            </g>
            {/* park */}
            <rect x="422" y="24" width="74" height="96" rx="12" fill="#c7e6cf" />
            <g fill="#8fcca0">
                <circle cx="445" cy="52" r="11" />
                <circle cx="472" cy="70" r="13" />
                <circle cx="447" cy="94" r="10" />
            </g>
            {/* school marker */}
            <g transform="translate(266 214)">
                <rect width="64" height="36" rx="8" fill="#fff" />
                <path d="M14 24V15l8-5 8 5v9" stroke="#0f766e" strokeWidth="2" fill="none" />
                <rect x="38" y="12" width="18" height="4" rx="2" fill="#bfdcd5" />
                <rect x="38" y="20" width="12" height="4" rx="2" fill="#bfdcd5" />
            </g>

            {/* roads */}
            <g fill="#ffffff">
                <rect x="0" y="134" width="520" height="50" />
                <rect x="190" y="0" width="46" height="400" />
                <rect x="362" y="0" width="46" height="400" />
            </g>
            <g stroke="#cfd9d5" strokeWidth="3" strokeDasharray="12 12">
                <line x1="0" y1="159" x2="520" y2="159" />
                <line x1="213" y1="0" x2="213" y2="400" />
                <line x1="385" y1="0" x2="385" y2="400" />
            </g>

            {/* potholes */}
            <g>
                <path d="M286 152c6-7 22-8 31-3 8 5 5 14-4 17-11 4-29 1-30-6 0-3 1-6 3-8Z" fill="#40514c" />
                <path d="M292 154c5-3 15-4 21-1" stroke="#7c8c87" strokeWidth="2" fill="none" />
                <path d="M200 286c4-5 15-6 21-2 5 4 3 10-3 12-8 2-19 0-20-5 0-2 1-4 2-5Z" fill="#40514c" />
                <path d="M371 70c4-5 14-6 20-2 5 3 3 9-3 11-7 3-18 1-19-4 0-2 1-4 2-5Z" fill="#40514c" />
            </g>

            {/* pins */}
            <Pin x={302} y={146} color="#d92d20" pulse />
            <Pin x={211} y={282} color="#e8590c" />
            <Pin x={381} y={66} color="#b7791f" />

            {/* citizen reporting */}
            <g transform="translate(70 214)" filter="url(#lg-soft)">
                <ellipse cx="44" cy="160" rx="40" ry="8" fill="#0f1d1a" opacity="0.12" />
                {/* legs */}
                <rect x="30" y="104" width="12" height="54" rx="6" fill="#20332f" />
                <rect x="47" y="104" width="12" height="54" rx="6" fill="#20332f" />
                {/* body */}
                <path d="M22 66c0-14 10-24 22-24s22 10 22 24v44H22V66Z" fill="#0f766e" />
                {/* arm holding phone */}
                <path d="M60 70c10 2 20-6 26-18" stroke="#0f766e" strokeWidth="11" strokeLinecap="round" fill="none" />
                <rect x="80" y="26" width="22" height="36" rx="5" fill="#0f1d1a" transform="rotate(14 91 44)" />
                <rect x="83" y="30" width="16" height="26" rx="3" fill="#5eead4" transform="rotate(14 91 44)" />
                {/* other arm */}
                <path d="M26 72c-6 12-6 24-2 34" stroke="#0b5e57" strokeWidth="10" strokeLinecap="round" fill="none" />
                {/* head */}
                <circle cx="44" cy="26" r="16" fill="#b9805a" />
                <path d="M28 24c0-12 8-18 17-18s16 6 16 15c-6-4-15-5-22-3-5 1-8 4-11 6Z" fill="#20332f" />
            </g>

            {/* "report sent" bubble */}
            <g transform="translate(150 196)" filter="url(#lg-soft)">
                <rect width="100" height="40" rx="12" fill="#fff" />
                <circle cx="20" cy="20" r="10" fill="#0f766e" />
                <path d="m15 20 3.5 3.5L25 17" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <rect x="38" y="13" width="50" height="6" rx="3" fill="#0f1d1a" opacity="0.8" />
                <rect x="38" y="24" width="34" height="5" rx="2.5" fill="#bfdcd5" />
            </g>
        </svg>
    );
}

function Pin({ x, y, color, pulse }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            {pulse && (
                <circle r="10" fill={color} opacity="0.35">
                    <animate attributeName="r" values="8;26;8" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.45;0;0.45" dur="2.4s" repeatCount="indefinite" />
                </circle>
            )}
            <path
                d="M0 0c-9-11-15-19-15-27a15 15 0 0 1 30 0c0 8-6 16-15 27Z"
                fill={color}
                stroke="#fff"
                strokeWidth="2.5"
            />
            <circle cy="-27" r="5.5" fill="#fff" />
        </g>
    );
}

export default Login;
