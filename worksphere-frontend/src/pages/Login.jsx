import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./Login.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  // Active mode: "login" or "register"
  const [mode, setMode] = useState(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Feedback & submission state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync mode with URL search params if changed externally
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "register" || tab === "login") {
      setMode(tab);
    }
  }, [searchParams]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setSearchParams(newMode === "register" ? { tab: "register" } : {});
  };

  // Real-time password requirement checkers
  const passChecks = {
    length: regPassword.length >= 8,
    upper: /[A-Z]/.test(regPassword),
    lower: /[a-z]/.test(regPassword),
    digit: /[0-9]/.test(regPassword),
    special: /[^A-Za-z0-9]/.test(regPassword),
    match: regPassword.length > 0 && regPassword === regConfirmPassword,
  };

  // ==========================================
  // SIGN IN SUBMISSION HANDLER
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!loginEmail.trim() || !loginPassword) {
      setError("Please provide both your company email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.detail || data.error || "Invalid credentials. Please verify your email and password.");
        setLoading(false);
        return;
      }

      // Persist session into localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email);
      localStorage.setItem("user_role", data.role);

      setSuccess("Authentication successful! Redirecting to dashboard...");

      // Redirect based on role
      setTimeout(() => {
        if (data.role === "ADMIN") {
          window.location.href = "/admin-dashboard";
        } else {
          window.location.href = "/employee-dashboard";
        }
      }, 400);

    } catch (err) {
      console.error("Login request error:", err);
      setError("Unable to connect to WorkSphere Cloud Gateway. Please ensure backend service is running.");
      setLoading(false);
    }
  };

  // ==========================================
  // REGISTRATION SUBMISSION HANDLER
  // ==========================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation
    if (!regName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!regEmail.trim()) {
      setError("Please enter your company email address.");
      return;
    }
    const cleanPhone = regPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!passChecks.length || !passChecks.upper || !passChecks.lower || !passChecks.digit || !passChecks.special) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please verify your confirm password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          phone: cleanPhone,
          password: regPassword,
          confirm_password: regConfirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errMessage = "Registration failed. Please check your details.";
        if (typeof data.detail === "string") {
          errMessage = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          errMessage = data.detail[0]?.msg || errMessage;
        }
        setError(errMessage);
        setLoading(false);
        return;
      }

      // Automatically store session & log in new employee
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email);
      localStorage.setItem("user_role", data.role || "EMPLOYEE");

      setSuccess(`Account registered successfully! Welcome aboard, ${data.name}. Redirecting to your dashboard...`);

      setTimeout(() => {
        window.location.href = "/employee-dashboard";
      }, 700);

    } catch (err) {
      console.error("Register request error:", err);
      setError("Unable to connect to WorkSphere Cloud Gateway. Please ensure backend service is running.");
      setLoading(false);
    }
  };

  return (
    <div className="ws-login-container">
      {/* =========================================================
          LEFT BRANDING & AI SHOWCASE PANEL
          ========================================================= */}
      <section className="ws-login-brand-panel">
        {/* Top Bar with Home Link & Logo */}
        <div className="ws-login-top-bar">
          <Link to="/" className="ws-login-brand-logo">
            <div className="ws-login-brand-badge">W</div>
            <span className="ws-login-brand-name">
              WorkSphere <span>AI</span>
            </span>
          </Link>

          <Link to="/" className="ws-login-back-home">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Central Visual & Feature Pitch */}
        <div className="ws-login-brand-content">
          <div className="ws-login-tagline-chip">
            <span className="ws-login-pulse-dot"></span>
            Enterprise Resource Intelligence
          </div>

          <h1 className="ws-login-brand-heading">
            Welcome to the Future of <span>Workplace Resource Booking</span>
          </h1>

          <p className="ws-login-brand-description">
            Sign in to access your intelligent employee dashboard or administrative control center. Experience ML-driven slot recommendations, automated complaint resolution, and real-time facility scheduling.
          </p>

          <div className="ws-login-features-list">
            <div className="ws-login-feature-item">
              <div className="ws-login-feature-icon">⚡</div>
              <div className="ws-login-feature-text">
                <h4>Smart Slot Recommendation</h4>
                <p>Machine learning analyzes utilization patterns to suggest optimal booking windows with zero conflict.</p>
              </div>
            </div>

            <div className="ws-login-feature-item">
              <div className="ws-login-feature-icon">🤖</div>
              <div className="ws-login-feature-text">
                <h4>AI Copilot Assistant</h4>
                <p>Natural conversational booking and automated smart complaint categorization powered by NLP.</p>
              </div>
            </div>

            <div className="ws-login-feature-item">
              <div className="ws-login-feature-icon">📊</div>
              <div className="ws-login-feature-text">
                <h4>Executive Analytics & Auditing</h4>
                <p>Complete visibility over employee reservations, facility capacity, and complaint lifecycle.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom System Status */}
        <div className="ws-login-system-status">
          <div className="ws-login-system-status-indicator">
            <span className="ws-login-live-dot"></span>
            WorkSphere Cloud Gateway Online
          </div>
          <span>Secure SHA-256 / JWT Authentication</span>
        </div>
      </section>

      {/* =========================================================
          RIGHT FORM PANEL: Clean SaaS Card with Tabs
          ========================================================= */}
      <section className="ws-login-form-panel">
        <div className="ws-login-card">
          
          {/* Segmented Mode Switcher */}
          <div className="ws-auth-segmented-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`ws-auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <span>Sign In</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`ws-auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <span>Create Account</span>
            </button>
          </div>

          {/* =====================================================
              MODE 1: SIGN IN FORM
              ===================================================== */}
          {mode === "login" && (
            <>
              <div className="ws-login-card-header">
                <h2>Welcome Back</h2>
                <p>Sign in to manage your workplace resources intelligently.</p>
              </div>

              <form className="ws-login-form" onSubmit={handleLoginSubmit}>
                {/* Email Field */}
                <div className="ws-login-field">
                  <label htmlFor="login-email">Company Email</label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      className="ws-login-input"
                      placeholder="name@worksphere.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="ws-login-field">
                  <label htmlFor="login-password">Password</label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      className="ws-login-input"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="ws-login-password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="ws-login-error-alert" role="alert">
                    <span>⚠️</span>
                    <div>{error}</div>
                  </div>
                )}

                {/* Success Banner */}
                {success && (
                  <div className="ws-login-success-alert" role="status">
                    <span>✅</span>
                    <div>{success}</div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="ws-login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="ws-login-spinner" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Mode Switcher */}
              <div className="ws-auth-switch-footer">
                <span>New to WorkSphere AI?</span>
                <button
                  type="button"
                  className="ws-auth-switch-btn"
                  onClick={() => switchMode("register")}
                >
                  Create an employee account →
                </button>
              </div>
            </>
          )}

          {/* =====================================================
              MODE 2: REGISTRATION FORM
              ===================================================== */}
          {mode === "register" && (
            <>
              <div className="ws-login-card-header">
                <h2>Create Employee Account</h2>
                <p>Register to book meeting rooms, gyms, cafeteria & parking spaces.</p>
              </div>

              {/* Role Info Badge */}
              <div className="ws-register-role-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Role assigned: <strong>Employee</strong> (Standard Workplace Access)</span>
              </div>

              <form className="ws-login-form" onSubmit={handleRegisterSubmit}>
                {/* Full Name */}
                <div className="ws-login-field">
                  <label htmlFor="reg-name">Full Name</label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </span>
                    <input
                      id="reg-name"
                      type="text"
                      className="ws-login-input"
                      placeholder="e.g. Rahul Sharma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                {/* Company Email */}
                <div className="ws-login-field">
                  <label htmlFor="reg-email">Company Email</label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      className="ws-login-input"
                      placeholder="name@worksphere.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div className="ws-login-field">
                  <label htmlFor="reg-phone">
                    <span>Mobile Phone</span>
                    <small style={{ color: "#64748b", fontWeight: 500 }}>(10 digits)</small>
                  </label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </span>
                    <input
                      id="reg-phone"
                      type="tel"
                      maxLength={10}
                      className="ws-login-input"
                      placeholder="9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="ws-login-field">
                  <label htmlFor="reg-password">Password</label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      className="ws-login-input"
                      placeholder="Create a strong password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="ws-login-password-toggle"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      aria-label={showRegPassword ? "Hide password" : "Show password"}
                    >
                      {showRegPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Real-time Checklist */}
                  {regPassword.length > 0 && (
                    <div className="ws-pass-checklist">
                      <div className={`ws-pass-rule ${passChecks.length ? "valid" : ""}`}>
                        <span className="ws-pass-dot"></span>
                        <span>8+ characters</span>
                      </div>
                      <div className={`ws-pass-rule ${passChecks.upper ? "valid" : ""}`}>
                        <span className="ws-pass-dot"></span>
                        <span>Uppercase letter</span>
                      </div>
                      <div className={`ws-pass-rule ${passChecks.digit ? "valid" : ""}`}>
                        <span className="ws-pass-dot"></span>
                        <span>At least 1 digit</span>
                      </div>
                      <div className={`ws-pass-rule ${passChecks.special ? "valid" : ""}`}>
                        <span className="ws-pass-dot"></span>
                        <span>Special character</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="ws-login-field">
                  <label htmlFor="reg-confirm-password">
                    <span>Confirm Password</span>
                    {regConfirmPassword.length > 0 && (
                      <span style={{ fontSize: "0.78rem", fontWeight: 650, color: passChecks.match ? "#059669" : "#dc2626" }}>
                        {passChecks.match ? "✓ Matches" : "✕ Doesn't match"}
                      </span>
                    )}
                  </label>
                  <div className="ws-login-input-wrap">
                    <span className="ws-login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      id="reg-confirm-password"
                      type={showRegConfirmPassword ? "text" : "password"}
                      className="ws-login-input"
                      placeholder="Re-enter your password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="ws-login-password-toggle"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      aria-label={showRegConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showRegConfirmPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="ws-login-error-alert" role="alert">
                    <span>⚠️</span>
                    <div>{error}</div>
                  </div>
                )}

                {/* Success Banner */}
                {success && (
                  <div className="ws-login-success-alert" role="status">
                    <span>✅</span>
                    <div>{success}</div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="ws-login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="ws-login-spinner" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Employee Registration</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Mode Switcher */}
              <div className="ws-auth-switch-footer">
                <span>Already have an account?</span>
                <button
                  type="button"
                  className="ws-auth-switch-btn"
                  onClick={() => switchMode("login")}
                >
                  Sign in here →
                </button>
              </div>
            </>
          )}

          {/* Policy info */}
          <div className="ws-login-footer-info">
            Protected by WorkSphere AI Enterprise Security. By accessing this system you agree to workplace booking compliance policies.
          </div>

        </div>
      </section>
    </div>
  );
}
