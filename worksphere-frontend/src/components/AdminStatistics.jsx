import { useEffect, useState } from "react";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function AdminStatistics() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Please log in as an administrator.");

      const res = await fetch(`${API}/admin/ai-insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Unable to load analytics.");

      setInsights(data);
    } catch (err) {
      setError(err.message || "Failed to load statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-empty-state">
          <p>Calculating workplace resource analytics from live database...</p>
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="adm-page">
        <div className="adm-alert adm-alert-error" role="alert">
          <span>⚠ {error || "Unable to display statistics."}</span>
          <button type="button" className="adm-btn-secondary" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  const { summary, trends, facility_utilization, day_distribution, complaint_distribution } = insights;

  const maxFacilityCount = Math.max(1, ...facility_utilization.map((f) => f.booking_count));
  const maxDayCount = Math.max(1, ...day_distribution.map((d) => d.count));
  const maxComplaintCount = Math.max(1, ...complaint_distribution.map((c) => c.count));

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <span className="adm-header-eyebrow">ANALYTICS / RESOURCE INTELLIGENCE</span>
          <h1>Workplace Utilization & Analytics</h1>
          <p>Real-time statistical distributions and booking metrics computed from MySQL records.</p>
        </div>
        <button type="button" className="adm-btn-secondary" onClick={loadData}>
          ↻ Refresh Analytics
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card stat-blue">
          <div className="adm-stat-icon">👥</div>
          <div>
            <span>Employees</span>
            <strong>{summary.total_employees}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-purple">
          <div className="adm-stat-icon">🏢</div>
          <div>
            <span>Facilities</span>
            <strong>{summary.total_facilities}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-cyan">
          <div className="adm-stat-icon">📅</div>
          <div>
            <span>Total Bookings</span>
            <strong>{summary.total_bookings}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-emerald">
          <div className="adm-stat-icon">✓</div>
          <div>
            <span>Active Confirmed</span>
            <strong>{summary.active_bookings}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-amber">
          <div className="adm-stat-icon">📝</div>
          <div>
            <span>Open Tickets</span>
            <strong>{summary.pending_complaints + summary.in_progress_complaints}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-rose">
          <div className="adm-stat-icon">⚡</div>
          <div>
            <span>Peak Time</span>
            <strong style={{ fontSize: "14px", marginTop: "6px" }}>{trends.peak_booking_hour}</strong>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Distribution */}
      <div className="adm-dashboard-grid">
        {/* Facility Utilization Share */}
        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Facility Utilization & Booking Share</h3>
            <span style={{ fontSize: "11px", color: "var(--adm-muted)", fontWeight: "600" }}>Live Database Records</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {facility_utilization.map((f) => (
              <div key={f.facility_id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                  <span>{f.name} <small style={{ color: "var(--adm-muted)" }}>({f.type})</small></span>
                  <span>{f.booking_count} bookings ({f.utilization_share_pct}%)</span>
                </div>
                <div style={{ height: "10px", borderRadius: "5px", background: "#f1f5f9", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(f.booking_count / maxFacilityCount) * 100}%`,
                      borderRadius: "5px",
                      background: "linear-gradient(90deg, #3b82f6, #6366f1)",
                      transition: "width 0.4s ease"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookings by Day of Week */}
        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Weekly Demand Pattern</h3>
            <span className="adm-chip-ai">Top: {trends.most_popular_day}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {day_distribution.map((d) => (
              <div key={d.day}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  <span>{d.day}</span>
                  <span style={{ color: d.count > 0 ? "var(--adm-ink)" : "var(--adm-muted)" }}>{d.count} bookings</span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "#f1f5f9", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(d.count / maxDayCount) * 100}%`,
                      borderRadius: "4px",
                      background: d.count === maxDayCount && d.count > 0 ? "linear-gradient(90deg, #10b981, #059669)" : "#94a3b8",
                      transition: "width 0.4s ease"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complaint Distribution & Key Trends */}
      <div className="adm-dashboard-grid">
        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Complaint Distribution by Category</h3>
            <span style={{ fontSize: "11px", color: "var(--adm-muted)", fontWeight: "600" }}>Total: {summary.total_complaints}</span>
          </div>

          {complaint_distribution.length === 0 ? (
            <p style={{ color: "var(--adm-muted)", fontSize: "13px" }}>No employee complaints submitted yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {complaint_distribution.map((c) => (
                <div key={c.category}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                    <span>{c.category}</span>
                    <span>{c.count} tickets</span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "4px", background: "#f1f5f9", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(c.count / maxComplaintCount) * 100}%`,
                        borderRadius: "4px",
                        background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="adm-panel">
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">Behavioral Highlights & Trends</h3>
            <span className="adm-chip-ai">✦ Insight</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            <div style={{ padding: "12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--adm-line)" }}>
              <span style={{ color: "var(--adm-muted)", fontSize: "11px", fontWeight: "700", display: "block" }}>MOST REQUESTED RESOURCE</span>
              <strong>{trends.most_booked_facility}</strong> ({trends.most_booked_facility_type})
            </div>

            <div style={{ padding: "12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--adm-line)" }}>
              <span style={{ color: "var(--adm-muted)", fontSize: "11px", fontWeight: "700", display: "block" }}>BUSIEST DAY OF THE WEEK</span>
              <strong>{trends.most_popular_day}</strong> (Highest scheduling density)
            </div>

            <div style={{ padding: "12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--adm-line)" }}>
              <span style={{ color: "var(--adm-muted)", fontSize: "11px", fontWeight: "700", display: "block" }}>TOP COMPLAINT DRIVER</span>
              <strong>{trends.top_complaint_category}</strong> (Priority for workplace operations)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminStatistics;
