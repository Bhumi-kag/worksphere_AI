import { useEffect, useState, useMemo } from "react";
import ConfirmModal from "./ConfirmModal";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function BookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Session expired. Please log in again.");

      const response = await fetch(`${API_BASE_URL}/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load bookings.");
      }

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "An error occurred while loading bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = (booking) => {
    if (booking.status === "Cancelled") return;

    setConfirmDialog({
      icon: "📅",
      title: "Cancel Employee Booking",
      message: `Are you sure you want to cancel booking #${booking.id} for ${booking.user_name}?`,
      cancelLabel: "Keep Booking",
      confirmLabel: "Cancel Booking",
      onConfirm: async () => {
        setCancellingId(booking.id);
        setError("");
        setMessage("");

        try {
          const token = localStorage.getItem("access_token");
          const response = await fetch(`${API_BASE_URL}/admin/bookings/${booking.id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.detail || "Unable to cancel this booking.");
          }

          setMessage(`Booking #${booking.id} cancelled successfully.`);
          await fetchBookings();
        } catch (err) {
          setError(err.message || "Unable to cancel booking.");
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  const formatDate = (val) => {
    if (!val) return "—";
    const d = new Date(`${String(val).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString();
  };

  const formatTime = (val) => {
    if (!val) return "—";
    const parts = String(val).split(":");
    if (parts.length < 2) return val;
    const d = new Date();
    d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesSearch =
        !q ||
        String(b.id).includes(q) ||
        (b.user_name || "").toLowerCase().includes(q) ||
        (b.user_email || "").toLowerCase().includes(q) ||
        (b.facility_name || "").toLowerCase().includes(q) ||
        (b.facility_type || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || b.status === statusFilter;
      const matchesDate = !dateFilter || String(b.booking_date).slice(0, 10) === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, search, statusFilter, dateFilter]);

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => b.status === "Booked").length;
  const cancelledBookings = bookings.filter((b) => b.status === "Cancelled").length;

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <span className="adm-header-eyebrow">ADMINISTRATION / BOOKINGS</span>
          <h1>Booking Management</h1>
          <p>Monitor, audit, and manage facility reservations made by employees.</p>
        </div>
        <button
          type="button"
          className="adm-btn-secondary"
          onClick={fetchBookings}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh Bookings"}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="adm-stat-card stat-blue">
          <div className="adm-stat-icon">📅</div>
          <div>
            <span>Total Reservations</span>
            <strong>{totalBookings}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-emerald">
          <div className="adm-stat-icon">✓</div>
          <div>
            <span>Active Confirmed</span>
            <strong>{activeBookings}</strong>
          </div>
        </div>

        <div className="adm-stat-card stat-rose">
          <div className="adm-stat-icon">✕</div>
          <div>
            <span>Cancelled</span>
            <strong>{cancelledBookings}</strong>
          </div>
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-filter-bar">
          <input
            type="search"
            className="adm-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, facility, or booking ID..."
          />

          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Booked">Booked (Active)</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            className="adm-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by booking date"
          />

          {dateFilter && (
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={() => setDateFilter("")}
              style={{ padding: "8px 12px" }}
            >
              Clear Date
            </button>
          )}

          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--adm-muted)", marginLeft: "auto" }}>
            {filteredBookings.length} {filteredBookings.length === 1 ? "Booking" : "Bookings"}
          </span>
        </div>

        {loading ? (
          <div className="adm-empty-state">
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-icon">📅</div>
            <h3>No Bookings Found</h3>
            <p>
              {bookings.length === 0
                ? "No workplace reservations have been recorded yet."
                : "No reservations match your search or filter settings."}
            </p>
          </div>
        ) : (
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Employee</th>
                  <th>Facility</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>#{b.id}</strong>
                    </td>
                    <td>
                      <div>
                        <strong>{b.user_name || "Unknown"}</strong>
                        {b.user_email && (
                          <div style={{ fontSize: "11px", color: "var(--adm-muted)" }}>{b.user_email}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{b.facility_name}</strong>
                        <div style={{ fontSize: "11px", color: "var(--adm-muted)" }}>{b.facility_type}</div>
                      </div>
                    </td>
                    <td>{formatDate(b.booking_date)}</td>
                    <td>
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </td>
                    <td>
                      <span className={`adm-badge ${b.status === "Cancelled" ? "adm-badge-cancelled" : "adm-badge-booked"}`}>
                        {b.status || "Booked"}
                      </span>
                    </td>
                    <td>
                      {b.status !== "Cancelled" ? (
                        <button
                          type="button"
                          className="adm-btn-danger"
                          onClick={() => handleCancelBooking(b)}
                          disabled={cancellingId === b.id}
                        >
                          {cancellingId === b.id ? "Cancelling..." : "Cancel"}
                        </button>
                      ) : (
                        <span style={{ color: "var(--adm-muted)", fontSize: "12px" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}

export default BookingManagement;
