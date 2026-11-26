import { useEffect, useState } from "react";
import EmployeeManagement from "./EmployeeManagement";
import FacilityManagement from "../components/FacilityManagement";
import BookingManagement from "../components/BookingManagement";
import ComplaintManagement from "../components/ComplaintManagement";
import AdminStatistics from "../components/AdminStatistics";
import AdminSettings from "../components/AdminSettings";
import "./AdminDashboard.css";

const API_BASE = "http://127.0.0.1:8000";

function AdminDashboard() {
  const adminName = localStorage.getItem("user_name") || "Administrator";
  const adminEmail = localStorage.getItem("user_email") || "admin@worksphere.com";

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [stats, setStats] = useState({
    total_employees: 0,
    total_facilities: 0,
    available_facilities: 0,
    total_bookings: 0,
    active_bookings: 0,
    pending_complaints: 0
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const fetchOverviewData = async () => {
    setLoadingOverview(true);
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, bookingsRes, complaintsRes, insightsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/admin/dashboard-stats`, { headers }),
        fetch(`${API_BASE}/admin/bookings`, { headers }),
        fetch(`${API_BASE}/admin/complaints`, { headers }),
        fetch(`${API_BASE}/admin/ai-insights`, { headers })
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        setStats(statsData);
      }

      if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
        const bookingsData = await bookingsRes.value.json();
        setRecentBookings(Array.isArray(bookingsData) ? bookingsData.slice(0, 5) : []);
      }

      if (complaintsRes.status === "fulfilled" && complaintsRes.value.ok) {
        const complaintsData = await complaintsRes.value.json();
        setRecentComplaints(Array.isArray(complaintsData) ? complaintsData.slice(0, 5) : []);
      }

      if (insightsRes.status === "fulfilled" && insightsRes.value.ok) {
        const insightsData = await insightsRes.value.json();
        setAiInsights(insightsData);
      }
    } catch (err) {
      console.error("Overview data fetch error:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const handleLogout = () => {
    ["access_token", "user_id", "user_name", "user_email", "user_role"].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.href = "/login";
  };

  const navItems = [
    { id: "Dashboard", label: "Dashboard", icon: "🏠" },
    { id: "Employees", label: "Employees", icon: "👥" },
    { id: "Facilities", label: "Facilities", icon: "🏢" },
    { id: "Bookings", label: "Bookings", icon: "📅" },
    { id: "Complaints", label: "Complaints", icon: "📝" },
    { id: "AI Insights", label: "AI Insights", icon: "💡" },
    { id: "Statistics", label: "Statistics", icon: "📊" },
    { id: "Settings", label: "Settings", icon: "⚙️" },
  ];

  const renderOverview = () => {
    const suggestions = aiInsights?.actionable_suggestions || [];
    const facilityUtilization = aiInsights?.facility_utilization || [];

    return (
      <div className="adm-page">
        {/* Welcome Banner */}
        <div className="adm-welcome-card">
          <div>
            <span className="adm-header-eyebrow">ENTERPRISE ADMINISTRATION</span>
            <h2>Welcome back, {adminName} 👋</h2>
            <p>
              WorkSphere AI centralized workplace command center. Monitor live occupancy,
              manage resources, and review AI-driven utilization forecasts.
            </p>
          </div>
          <div className="adm-welcome-orb" aria-hidden="true">
            <span>✦</span>
          </div>
        </div>

        {/* 6 Real-Time Metrics */}
        <div className="adm-stats-grid">
          <div className="adm-stat-card stat-blue">
            <div className="adm-stat-icon">👥</div>
            <div>
              <span>Total Employees</span>
              <strong>{stats.total_employees}</strong>
            </div>
          </div>

          <div className="adm-stat-card stat-purple">
            <div className="adm-stat-icon">🏢</div>
            <div>
              <span>Total Facilities</span>
              <strong>{stats.total_facilities}</strong>
            </div>
          </div>

          <div className="adm-stat-card stat-cyan">
            <div className="adm-stat-icon">✓</div>
            <div>
              <span>Available</span>
              <strong>{stats.available_facilities ?? stats.total_facilities}</strong>
            </div>
          </div>

          <div className="adm-stat-card stat-emerald">
            <div className="adm-stat-icon">📅</div>
            <div>
              <span>Total Bookings</span>
              <strong>{stats.total_bookings}</strong>
            </div>
          </div>

          <div className="adm-stat-card stat-amber">
            <div className="adm-stat-icon">⚡</div>
            <div>
              <span>Active Bookings</span>
              <strong>{stats.active_bookings ?? stats.total_bookings}</strong>
            </div>
          </div>

          <div className="adm-stat-card stat-rose">
            <div className="adm-stat-icon">📝</div>
            <div>
              <span>Pending Tickets</span>
              <strong>{stats.pending_complaints}</strong>
            </div>
          </div>
        </div>

        {/* 2-Column Section: AI-Generated Insights & Quick Management Actions */}
        <div className="adm-dashboard-grid">
          {/* AI-Generated Insights Section */}
          <div className="adm-panel">
            <div className="adm-panel-header">
              <h3 className="adm-panel-title">AI-Generated Workplace Insights</h3>
              <span className="adm-chip-ai">✦ Machine Intelligence</span>
            </div>

            <div className="adm-ai-insights-list">
              {suggestions.length === 0 ? (
                <p style={{ color: "var(--adm-muted)", fontSize: "13px" }}>
                  Analyzing historical workplace records...
                </p>
              ) : (
                suggestions.map((item, index) => (
                  <div key={index} className={`adm-insight-card priority-${item.priority || "Medium"}`}>
                    <div className="adm-insight-header">
                      <h4>{item.title}</h4>
                      <span className="adm-priority-pill">{item.priority} Priority</span>
                    </div>
                    <p>{item.description}</p>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="adm-btn-secondary"
              style={{ width: "100%", marginTop: "14px" }}
              onClick={() => setActiveMenu("AI Insights")}
            >
              Explore Full AI Intelligence Report →
            </button>
          </div>

          {/* Quick Management Actions & Facility Utilization */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="adm-panel">
              <div className="adm-panel-header">
                <h3 className="adm-panel-title">Quick Management Actions</h3>
              </div>

              <div className="adm-quick-actions-grid">
                <div className="adm-action-card" onClick={() => setActiveMenu("Employees")}>
                  <div className="adm-action-icon">👥</div>
                  <strong>Add Employee</strong>
                  <span>Onboard staff</span>
                </div>

                <div className="adm-action-card" onClick={() => setActiveMenu("Facilities")}>
                  <div className="adm-action-icon">🏢</div>
                  <strong>Add Facility</strong>
                  <span>Register space</span>
                </div>

                <div className="adm-action-card" onClick={() => setActiveMenu("Bookings")}>
                  <div className="adm-action-icon">📅</div>
                  <strong>Audit Slots</strong>
                  <span>Review schedule</span>
                </div>

                <div className="adm-action-card" onClick={() => setActiveMenu("Complaints")}>
                  <div className="adm-action-icon">📝</div>
                  <strong>Resolve Issues</strong>
                  <span>{stats.pending_complaints} pending</span>
                </div>
              </div>
            </div>

            {/* Mini Facility Utilization Overview */}
            <div className="adm-panel">
              <div className="adm-panel-header">
                <h3 className="adm-panel-title">Facility Utilization Overview</h3>
                <button
                  type="button"
                  className="adm-btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() => setActiveMenu("Statistics")}
                >
                  View All ↗
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {facilityUtilization.slice(0, 4).map((f) => (
                  <div key={f.facility_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "3px" }}>
                      <span>{f.name}</span>
                      <span>{f.booking_count} bookings ({f.utilization_share_pct}%)</span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "#f1f5f9", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.max(5, f.utilization_share_pct * 1.5))}%`,
                          borderRadius: "3px",
                          background: "linear-gradient(90deg, #2563eb, #6366f1)"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Section: Recent Bookings & Recent Complaints */}
        <div className="adm-dashboard-grid">
          {/* Recent Bookings */}
          <div className="adm-panel">
            <div className="adm-panel-header">
              <h3 className="adm-panel-title">Recent Employee Bookings</h3>
              <button
                type="button"
                className="adm-btn-secondary"
                style={{ padding: "4px 10px", fontSize: "11px" }}
                onClick={() => setActiveMenu("Bookings")}
              >
                All Bookings ↗
              </button>
            </div>

            {recentBookings.length === 0 ? (
              <div className="adm-empty-state" style={{ padding: "24px" }}>
                <p>No recent bookings recorded.</p>
              </div>
            ) : (
              <div className="adm-table-container">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Employee</th>
                      <th>Facility</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td><strong>#{b.id}</strong></td>
                        <td>{b.user_name || "Unknown"}</td>
                        <td>{b.facility_name}</td>
                        <td>{String(b.booking_date).slice(0, 10)}</td>
                        <td>
                          <span className={`adm-badge ${b.status === "Cancelled" ? "adm-badge-cancelled" : "adm-badge-booked"}`}>
                            {b.status || "Booked"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Complaints */}
          <div className="adm-panel">
            <div className="adm-panel-header">
              <h3 className="adm-panel-title">Recent Employee Complaints</h3>
              <button
                type="button"
                className="adm-btn-secondary"
                style={{ padding: "4px 10px", fontSize: "11px" }}
                onClick={() => setActiveMenu("Complaints")}
              >
                All Complaints ↗
              </button>
            </div>

            {recentComplaints.length === 0 ? (
              <div className="adm-empty-state" style={{ padding: "24px" }}>
                <p>No complaints reported.</p>
              </div>
            ) : (
              <div className="adm-table-container">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Employee</th>
                      <th>Category</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentComplaints.map((c) => (
                      <tr key={c.id}>
                        <td><strong>#{c.id}</strong></td>
                        <td>{c.user_name || "Unknown"}</td>
                        <td>{c.category}</td>
                        <td>
                          <span className={`adm-badge ${c.status === "Resolved" ? "adm-badge-resolved" : c.status === "In Progress" ? "adm-badge-in-progress" : "adm-badge-pending"}`}>
                            {c.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAiInsightsTab = () => {
    if (!aiInsights) {
      return (
        <div className="adm-page">
          <div className="adm-empty-state">
            <p>Loading AI Intelligence insights...</p>
          </div>
        </div>
      );
    }

    const { summary, trends, facility_utilization, actionable_suggestions } = aiInsights;

    return (
      <div className="adm-page">
        <div className="adm-header">
          <div>
            <span className="adm-header-eyebrow">INTELLIGENCE / MACHINE LEARNING INSIGHTS</span>
            <h1>WorkSphere AI Workplace Intelligence</h1>
            <p>Actionable resource allocation suggestions derived from real MySQL database patterns.</p>
          </div>
          <button type="button" className="adm-btn-secondary" onClick={fetchOverviewData}>
            ↻ Recalculate Insights
          </button>
        </div>

        {/* Highlight Insights Grid */}
        <div className="adm-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="adm-stat-card stat-blue">
            <div className="adm-stat-icon">🏢</div>
            <div>
              <span>Most Booked Facility</span>
              <strong style={{ fontSize: "18px" }}>{trends.most_booked_facility}</strong>
              <small style={{ color: "var(--adm-muted)", fontSize: "11px" }}>{trends.most_booked_facility_type}</small>
            </div>
          </div>

          <div className="adm-stat-card stat-cyan">
            <div className="adm-stat-icon">📅</div>
            <div>
              <span>Peak Demand Day</span>
              <strong style={{ fontSize: "18px" }}>{trends.most_popular_day}</strong>
              <small style={{ color: "var(--adm-muted)", fontSize: "11px" }}>Highest reservation velocity</small>
            </div>
          </div>

          <div className="adm-stat-card stat-purple">
            <div className="adm-stat-icon">⏰</div>
            <div>
              <span>Peak Demand Hours</span>
              <strong style={{ fontSize: "18px" }}>{trends.peak_booking_hour}</strong>
              <small style={{ color: "var(--adm-muted)", fontSize: "11px" }}>High occupancy window</small>
            </div>
          </div>
        </div>

        {/* Detailed Actionable Suggestions */}
        <div className="adm-panel" style={{ marginBottom: "24px" }}>
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Resource Allocation & Operational Suggestions</h3>
            <span className="adm-chip-ai">✦ ML Recommendations</span>
          </div>

          <div className="adm-ai-insights-list">
            {actionable_suggestions.map((item, idx) => (
              <div key={idx} className={`adm-insight-card priority-${item.priority || "Medium"}`} style={{ padding: "18px" }}>
                <div className="adm-insight-header">
                  <h4 style={{ fontSize: "15px" }}>{item.title}</h4>
                  <span className="adm-priority-pill">{item.priority} Priority</span>
                </div>
                <p style={{ fontSize: "13px", marginTop: "6px" }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Facility Share Breakdown */}
        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Facility Utilization Breakdown</h3>
          </div>

          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Total Reservations</th>
                  <th>Demand Share</th>
                  <th>Operational Status</th>
                </tr>
              </thead>
              <tbody>
                {facility_utilization.map((f) => (
                  <tr key={f.facility_id}>
                    <td><strong>{f.name}</strong></td>
                    <td>{f.type}</td>
                    <td>{f.capacity} persons</td>
                    <td><strong>{f.booking_count}</strong> bookings</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, f.utilization_share_pct)}%`, height: "100%", background: "#2563eb" }} />
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: "700" }}>{f.utilization_share_pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-badge ${f.available ? "adm-badge-available" : "adm-badge-unavailable"}`}>
                        {f.available ? "Active" : "Disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ws-admin-dashboard">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        {/* Brand */}
        <div className="adm-brand">
          <div className="adm-brand-icon">W</div>
          <div className="adm-brand-text">
            <span className="adm-brand-title">WorkSphere <span>AI</span></span>
            <span className="adm-brand-tag">ADMIN CONSOLE</span>
          </div>
        </div>

        {/* Admin Profile */}
        <div className="adm-profile-badge">
          <div className="adm-avatar">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="adm-profile-info">
            <h3>{adminName}</h3>
            <p>Super Administrator</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="adm-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`adm-nav-btn ${activeMenu === item.id ? "active" : ""}`}
              onClick={() => {
                setActiveMenu(item.id);
                if (item.id === "Dashboard") fetchOverviewData();
              }}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Logout */}
        <div className="adm-sidebar-footer">
          <button type="button" className="adm-logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="adm-main">
        {activeMenu === "Dashboard" && renderOverview()}
        {activeMenu === "Employees" && <EmployeeManagement />}
        {activeMenu === "Facilities" && <FacilityManagement />}
        {activeMenu === "Bookings" && <BookingManagement />}
        {activeMenu === "Complaints" && <ComplaintManagement />}
        {activeMenu === "AI Insights" && renderAiInsightsTab()}
        {activeMenu === "Statistics" && <AdminStatistics />}
        {activeMenu === "Settings" && <AdminSettings />}
      </main>
    </div>
  );
}

export default AdminDashboard;
