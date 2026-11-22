import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/ui";
import "../styles/Login.css";
import "../styles/Register.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function Register() {
    const navigate = useNavigate();

    const [name, setName]                     = useState("");
    const [email, setEmail]                   = useState("");
    const [phone, setPhone]                   = useState("");
    const [password, setPassword]             = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword]     = useState(false);

    const [error, setError]     = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name:     name.trim(),
                    email:    email.trim(),
                    phone:    phone.trim() || null,
                    password: password,
                    role:     "CITIZEN",
                }),
            });

            let data = {};
            const text = await response.text();
            try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

            if (!response.ok) {
                throw new Error(
                    (data && data.message) ||
                    `Registration failed (${response.status})`
                );
            }

            setSuccess(true);
            setTimeout(() => navigate("/"), 1800);

        } catch (err) {
            setError(err.message || "Unable to register. Please try again.");
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
                        Join your city. <em>Make it better.</em>
                    </h1>
                    <p>Create a Citizen account and start reporting civic issues in your area.</p>
                </header>

                <div className="lg-columns rg-columns">

                    {/* ===== ILLUSTRATION PANEL ===== */}
                    <section className="lg-art rg-art" aria-hidden="true">
                        <RegisterIllustration />

                        <div className="lg-float lg-float-a">
                            <span className="lg-float-icon">
                                <Icon name="shield" size={16} />
                            </span>
                            <div>
                                <strong>Citizen account</strong>
                                <span>Report issues instantly</span>
                            </div>
                        </div>

                        <div className="lg-float lg-float-b">
                            <span className="rg-sev-ok">✓</span>
                            <div>
                                <strong>Free &amp; secure</strong>
                                <span>Encrypted · Role-based</span>
                            </div>
                        </div>

                        <ul className="lg-points">
                            <li><Icon name="camera" size={15} /> Photo + GPS evidence</li>
                            <li><Icon name="bolt"   size={15} /> Live status updates</li>
                            <li><Icon name="users"  size={15} /> Community reports</li>
                        </ul>
                    </section>

                    {/* ===== REGISTER FORM ===== */}
                    <section className="lg-auth rg-auth">
                        <div className="lg-auth-head">
                            <h2>Create account</h2>
                            <p>Citizen registration — free and instant.</p>
                        </div>

                        <form className="lg-form" onSubmit={handleRegister} noValidate>

                            {/* Full Name */}
                            <label className="lg-field">
                                <span>Full Name</span>
                                <div className="lg-input">
                                    <Icon name="users" size={17} />
                                    <input
                                        type="text"
                                        placeholder="e.g. Ravi Kumar"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoComplete="name"
                                        required
                                    />
                                </div>
                            </label>

                            {/* Email */}
                            <label className="lg-field">
                                <span>Email Address</span>
                                <div className="lg-input">
                                    <Icon name="bell" size={17} />
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </label>

                            {/* Phone (optional) */}
                            <label className="lg-field">
                                <span>
                                    Phone{" "}
                                    <span style={{ fontWeight: 400, opacity: 0.65 }}>(optional)</span>
                                </span>
                                <div className="lg-input">
                                    <Icon name="bolt" size={17} />
                                    <input
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        autoComplete="tel"
                                    />
                                </div>
                            </label>

                            {/* Password */}
                            <label className="lg-field">
                                <span>Password</span>
                                <div className="lg-input">
                                    <Icon name="shield" size={17} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="lg-peek"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide" : "Show"}
                                    >
                                        <Icon name="eye" size={17} />
                                    </button>
                                </div>
                            </label>

                            {/* Confirm Password */}
                            <label className="lg-field">
                                <span>Confirm Password</span>
                                <div className="lg-input">
                                    <Icon name="shield" size={17} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Repeat your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </label>

                            {/* Error */}
                            {error && (
                                <div className="lg-error" role="alert">
                                    <Icon name="alert" size={16} />
                                    {error}
                                </div>
                            )}

                            {/* Success */}
                            {success && (
                                <div className="rg-success" role="status">
                                    <Icon name="check" size={16} />
                                    Account created! Redirecting to sign in…
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                className="lg-btn lg-btn-primary"
                                disabled={
                                    loading || success ||
                                    !name || !email || !password || !confirmPassword
                                }
                            >
                                {loading ? (
                                    <>
                                        <span className="lg-spinner" /> Creating account…
                                    </>
                                ) : success ? (
                                    <>
                                        <Icon name="check" size={16} /> Account created!
                                    </>
                                ) : (
                                    <>
                                        Create Citizen Account{" "}
                                        <Icon name="chevron" size={16} />
                                    </>
                                )}
                            </button>

                        </form>

                        <div className="lg-divider">
                            <span>Already have an account?</span>
                        </div>

                        <button
                            type="button"
                            className="lg-btn lg-btn-outline"
                            onClick={() => navigate("/")}
                        >
                            Sign in instead
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
// Registration illustration
// =====================================================

function RegisterIllustration() {
    return (
        <svg
            className="lg-city"
            viewBox="0 0 520 400"
            role="img"
            aria-label="Citizen registering on a device"
        >
            <defs>
                <pattern id="rg-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.2" fill="#bfdcd5" />
                </pattern>
                <filter id="rg-soft" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f1d1a" floodOpacity="0.15" />
                </filter>
            </defs>

            <rect width="520" height="400" rx="22" fill="#e4f2ee" />
            <rect width="520" height="400" rx="22" fill="url(#rg-dots)" />

            {/* City silhouette blocks */}
            <g fill="#d3e9e3">
                <rect x="20"  y="40"  width="130" height="90"  rx="12" />
                <rect x="20"  y="210" width="130" height="160" rx="12" />
                <rect x="390" y="40"  width="110" height="90"  rx="12" />
                <rect x="390" y="210" width="110" height="160" rx="12" />
            </g>
            {/* Park */}
            <rect x="260" y="40" width="100" height="90" rx="12" fill="#c7e6cf" />
            <g fill="#8fcca0">
                <circle cx="285" cy="68"  r="12" />
                <circle cx="315" cy="82"  r="14" />
                <circle cx="342" cy="66"  r="11" />
            </g>

            {/* Roads */}
            <g fill="#fff">
                <rect x="0"   y="150" width="520" height="46" />
                <rect x="170" y="0"   width="44"  height="400" />
                <rect x="310" y="0"   width="44"  height="400" />
            </g>
            <g stroke="#cfd9d5" strokeWidth="3" strokeDasharray="12 12">
                <line x1="0"   y1="173" x2="520" y2="173" />
                <line x1="192" y1="0"   x2="192" y2="400" />
                <line x1="332" y1="0"   x2="332" y2="400" />
            </g>

            {/* Map pins */}
            <g transform="translate(192 148)">
                <circle r="12" fill="#0f766e" opacity="0.22">
                    <animate attributeName="r"       values="10;24;10" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <path d="M0 0c-8-10-14-18-14-25a14 14 0 0 1 28 0c0 7-6 15-14 25Z"
                      fill="#0f766e" stroke="#fff" strokeWidth="2" />
                <circle cy="-25" r="5" fill="#fff" />
            </g>
            <g transform="translate(332 148)">
                <path d="M0 0c-7-9-12-16-12-22a12 12 0 0 1 24 0c0 6-5 13-12 22Z"
                      fill="#e8590c" stroke="#fff" strokeWidth="2" />
                <circle cy="-22" r="4.5" fill="#fff" />
            </g>

            {/* Registration form card */}
            <g transform="translate(158 215)" filter="url(#rg-soft)">
                <rect width="204" height="162" rx="16" fill="#fff" />
                {/* header bar */}
                <rect width="204" height="38" rx="16" fill="#0f766e" />
                <circle cx="18"  cy="19" r="7"  fill="rgba(255,255,255,0.3)" />
                <rect x="32" y="13" width="88" height="6" rx="3" fill="rgba(255,255,255,0.75)" />
                {/* field 1 */}
                <rect x="12" y="50" width="58" height="5" rx="2.5" fill="#bfdcd5" />
                <rect x="12" y="60" width="180" height="20" rx="6" fill="#f0f7f5" stroke="#d3e9e4" strokeWidth="1" />
                {/* field 2 */}
                <rect x="12" y="92" width="58" height="5" rx="2.5" fill="#bfdcd5" />
                <rect x="12" y="102" width="180" height="20" rx="6" fill="#f0f7f5" stroke="#d3e9e4" strokeWidth="1" />
                {/* submit */}
                <rect x="12" y="134" width="180" height="20" rx="10" fill="#0f766e" />
                <rect x="66" y="140" width="72"  height="6"  rx="3"  fill="#fff" opacity="0.85" />
            </g>

            {/* Citizen figure */}
            <g transform="translate(60 196)" filter="url(#rg-soft)">
                <ellipse cx="44" cy="168" rx="38" ry="7" fill="#0f1d1a" opacity="0.1" />
                <rect x="31" y="110" width="11" height="56" rx="5.5" fill="#20332f" />
                <rect x="47" y="110" width="11" height="56" rx="5.5" fill="#20332f" />
                <path d="M22 70c0-14 10-24 22-24s22 10 22 24v44H22V70Z" fill="#0f766e" />
                <path d="M62 76c8 2 18-2 26-10" stroke="#0f766e" strokeWidth="11" strokeLinecap="round" fill="none" />
                <path d="M26 78c-6 10-5 22-2 32" stroke="#0b5e57" strokeWidth="10" strokeLinecap="round" fill="none" />
                <circle cx="44" cy="30" r="16" fill="#b9805a" />
                <path d="M28 28c0-12 8-18 17-18s16 6 16 15c-6-4-15-5-22-3-5 1-8 4-11 6Z" fill="#20332f" />
            </g>

            {/* Success bubble */}
            <g transform="translate(148 174)" filter="url(#rg-soft)">
                <rect width="114" height="44" rx="12" fill="#fff" />
                <circle cx="22" cy="22" r="11" fill="#0f766e" />
                <path d="m17 22 3.5 3.5L27 19" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <rect x="40" y="15" width="62" height="6" rx="3" fill="#0f1d1a" opacity="0.8" />
                <rect x="40" y="26" width="42" height="5" rx="2.5" fill="#bfdcd5" />
            </g>
        </svg>
    );
}

export default Register;
