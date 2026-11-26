import { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function AdminSettings() {
  const [adminName] = useState(
    localStorage.getItem("user_name") || "Administrator"
  );
  const [adminEmail] = useState(
    localStorage.getItem("user_email") || "admin@worksphere.com"
  );

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [preferences, setPreferences] = useState({
    allowBookings: true,
    allowComplaints: true,
    autoSlotRecommendation: true,
  });

  const [toggleNotice, setToggleNotice] = useState("");

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordNotice("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to update password.");
      }

      setPasswordNotice("Password updated successfully! Please keep your credentials secure.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Unable to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
    setToggleNotice("System preference updated for this operational session.");
    setTimeout(() => setToggleNotice(""), 3500);
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <span className="adm-header-eyebrow">ADMINISTRATION / CONFIGURATION</span>
          <h1>Admin Settings & Security</h1>
          <p>Manage administrative profile, system operational toggles, and security credentials.</p>
        </div>
      </div>

      {toggleNotice && (
        <div className="adm-alert adm-alert-success" role="status">
          <span>✓ {toggleNotice}</span>
        </div>
      )}

      <div className="adm-dashboard-grid">
        {/* Profile Card */}
        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Administrator Account</h3>
            <span className="adm-badge adm-badge-booked">Active Administrator</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: "24px",
                fontWeight: "800"
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "700" }}>{adminName}</h4>
              <p style={{ margin: "0", fontSize: "12px", color: "var(--adm-muted)" }}>{adminEmail}</p>
              <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "700" }}>System Superuser</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", borderTop: "1px solid var(--adm-line)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--adm-muted)" }}>Role:</span>
              <strong>System Administrator</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--adm-muted)" }}>Access Level:</span>
              <strong>Full Management Access</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--adm-muted)" }}>Session Duration:</span>
              <strong>120 minutes (JWT HS256)</strong>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Security & Password</h3>
            <span style={{ fontSize: "11px", color: "var(--adm-muted)", fontWeight: "600" }}>Direct DB Update</span>
          </div>

          {passwordNotice && (
            <div className="adm-alert adm-alert-success" role="status" style={{ padding: "8px 12px", fontSize: "12px" }}>
              <span>✓ {passwordNotice}</span>
            </div>
          )}

          {passwordError && (
            <div className="adm-alert adm-alert-error" role="alert" style={{ padding: "8px 12px", fontSize: "12px" }}>
              <span>⚠ {passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                  New Password *
                </label>
                <input
                  type="password"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  placeholder="At least 8 chars, 1 uppercase, 1 digit, 1 special"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="adm-btn-primary"
                style={{ marginTop: "6px" }}
                disabled={passwordLoading}
              >
                {passwordLoading ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Operational System Switches */}
      <div className="adm-panel">
        <div className="adm-panel-header">
          <h3 className="adm-panel-title">System Policies & Controls</h3>
          <span style={{ fontSize: "11px", color: "var(--adm-muted)", fontWeight: "600" }}>Live Workplace Preferences</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <div style={{ padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid var(--adm-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px" }}>Facility Reservations</strong>
              <div style={{ fontSize: "11px", color: "var(--adm-muted)", marginTop: "2px" }}>Allow employees to submit new bookings</div>
            </div>
            <button
              type="button"
              className={preferences.allowBookings ? "adm-btn-primary" : "adm-btn-secondary"}
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => togglePreference("allowBookings")}
            >
              {preferences.allowBookings ? "Active" : "Paused"}
            </button>
          </div>

          <div style={{ padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid var(--adm-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px" }}>Complaint Submission</strong>
              <div style={{ fontSize: "11px", color: "var(--adm-muted)", marginTop: "2px" }}>Allow employee workplace incident reporting</div>
            </div>
            <button
              type="button"
              className={preferences.allowComplaints ? "adm-btn-primary" : "adm-btn-secondary"}
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => togglePreference("allowComplaints")}
            >
              {preferences.allowComplaints ? "Active" : "Paused"}
            </button>
          </div>

          <div style={{ padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid var(--adm-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "13px" }}>AI Smart Recommendations</strong>
              <div style={{ fontSize: "11px", color: "var(--adm-muted)", marginTop: "2px" }}>Random Forest slot prediction active</div>
            </div>
            <button
              type="button"
              className={preferences.autoSlotRecommendation ? "adm-btn-primary" : "adm-btn-secondary"}
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => togglePreference("autoSlotRecommendation")}
            >
              {preferences.autoSlotRecommendation ? "Active" : "Paused"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
