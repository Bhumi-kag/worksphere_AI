import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const STATUSES = ["Pending", "In Progress", "Resolved"];

function ComplaintManagement() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [editingComplaint, setEditingComplaint] = useState(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [adminRemark, setAdminRemark] = useState("");

  const getToken = () => localStorage.getItem("access_token");

  const fetchComplaints = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const response = await fetch(`${API_BASE_URL}/admin/complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load complaints.");
      }

      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const categories = useMemo(
    () => [...new Set(complaints.map((item) => item.category).filter(Boolean))],
    [complaints]
  );

  const filteredComplaints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((item) => {
      const matchesSearch =
        !q ||
        String(item.id).includes(q) ||
        (item.user_name || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.subject || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [complaints, search, statusFilter, categoryFilter]);

  const pendingCount = complaints.filter((item) => item.status === "Pending").length;
  const inProgressCount = complaints.filter((item) => item.status === "In Progress").length;
  const resolvedCount = complaints.filter((item) => item.status === "Resolved").length;

  const openEditor = (complaint) => {
    setEditingComplaint(complaint);
    setEditStatus(complaint.status || "Pending");
    setAdminRemark(complaint.admin_remark || "");
    setError("");
    setMessage("");
  };

  const closeEditor = () => {
    setEditingComplaint(null);
    setAdminRemark("");
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingComplaint) return;

    setSavingId(editingComplaint.id);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/admin/complaints/${editingComplaint.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: editStatus,
            admin_remark: adminRemark.trim() || null,
          }),
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to update complaint.");
      }

      closeEditor();
      setMessage(`Complaint #${editingComplaint.id} marked as "${editStatus}" with admin remark.`);
      await fetchComplaints();
    } catch (err) {
      setError(err.message || "Unable to update complaint.");
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (val) => {
    if (!val) return "—";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <span className="adm-header-eyebrow">ADMINISTRATION / TICKETS</span>
          <h1>Complaint Management</h1>
          <p>Review employee workplace complaints, assign resolutions, and record remarks.</p>
        </div>
        <button
          type="button"
          className="adm-btn-secondary"
          onClick={fetchComplaints}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh Complaints"}
        </button>
      </div>

      {message && (
        <div className="adm-alert adm-alert-success" role="status">
          <span>✓ {message}</span>
          <button type="button" className="adm-btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setMessage("")}>✕</button>
        </div>
      )}

      {error && (
        <div className="adm-alert adm-alert-error" role="alert">
          <span>⚠ {error}</span>
          <button type="button" className="adm-btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Mini Stats Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="adm-stat-card stat-purple">
          <div className="adm-stat-icon">📝</div>
          <div>
            <span>Total Tickets</span>
            <strong>{complaints.length}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-rose">
          <div className="adm-stat-icon">!</div>
          <div>
            <span>Pending Review</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-amber">
          <div className="adm-stat-icon">⚙</div>
          <div>
            <span>In Progress</span>
            <strong>{inProgressCount}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-emerald">
          <div className="adm-stat-icon">✓</div>
          <div>
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Update Complaint Modal / Panel */}
      {editingComplaint && (
        <div className="adm-panel" style={{ marginBottom: "24px", border: "1px solid #bfdbfe", background: "#f8fafc" }}>
          <div className="adm-panel-header">
            <div>
              <h3 className="adm-panel-title">
                Update Complaint #{editingComplaint.id}: {editingComplaint.subject}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--adm-muted)" }}>
                Submitted by <strong>{editingComplaint.user_name}</strong> · Category: <strong>{editingComplaint.category}</strong>
              </p>
            </div>
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={closeEditor}
              disabled={savingId !== null}
            >
              Cancel
            </button>
          </div>

          <div style={{ padding: "12px 14px", borderRadius: "10px", background: "#ffffff", border: "1px solid var(--adm-line)", marginBottom: "16px", fontSize: "13px" }}>
            <span style={{ fontWeight: "700", color: "var(--adm-muted)", fontSize: "11px", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
              Employee Description
            </span>
            {editingComplaint.description}
          </div>

          <form onSubmit={handleUpdate}>
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Resolution Status *
                </label>
                <select
                  className="adm-select"
                  style={{ width: "100%" }}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  required
                >
                  {STATUSES.map((s) => (
                    <option value={s} key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Admin Remark / Resolution Feedback
                </label>
                <input
                  type="text"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  placeholder="e.g. Maintenance technician dispatched / Issue resolved."
                  maxLength={1000}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="adm-btn-secondary"
                onClick={closeEditor}
                disabled={savingId !== null}
              >
                Close
              </button>
              <button
                type="submit"
                className="adm-btn-primary"
                disabled={savingId !== null}
              >
                {savingId === editingComplaint.id ? "Saving..." : "Save Resolution"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="adm-panel">
        <div className="adm-filter-bar">
          <input
            type="search"
            className="adm-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search complaint by employee, subject, or description..."
          />

          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => (
              <option value={s} key={s}>{s}</option>
            ))}
          </select>

          <select
            className="adm-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option value={c} key={c}>{c}</option>
            ))}
          </select>

          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--adm-muted)", marginLeft: "auto" }}>
            {filteredComplaints.length} {filteredComplaints.length === 1 ? "Complaint" : "Complaints"}
          </span>
        </div>

        {loading ? (
          <div className="adm-empty-state">
            <p>Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-icon">📝</div>
            <h3>No Complaints Found</h3>
            <p>
              {complaints.length === 0
                ? "No complaints have been reported yet."
                : "No complaints match your search or filter settings."}
            </p>
          </div>
        ) : (
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Subject & Details</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Admin Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>#{c.id}</strong>
                    </td>
                    <td>{c.user_name || "Unknown"}</td>
                    <td>
                      <span className="adm-badge adm-badge-booked" style={{ background: "#f1f5f9", color: "#334155" }}>
                        {c.category}
                      </span>
                    </td>
                    <td style={{ maxWidth: "300px" }}>
                      <strong>{c.subject}</strong>
                      <div style={{ fontSize: "11px", color: "var(--adm-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.description}
                      </div>
                    </td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <span className={`adm-badge ${c.status === "Resolved" ? "adm-badge-resolved" : c.status === "In Progress" ? "adm-badge-in-progress" : "adm-badge-pending"}`}>
                        {c.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: c.admin_remark ? "var(--adm-ink)" : "var(--adm-muted)" }}>
                      {c.admin_remark || "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-edit"
                        onClick={() => openEditor(c)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplaintManagement;
