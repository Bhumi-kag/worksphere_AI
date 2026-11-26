import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkSphereCopilot from "../components/WorkSphereCopilot";
import "./EmployeeDashboard.css";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const CATEGORIES = ["Facility Issue", "Booking Issue", "Cleanliness", "Maintenance", "Parking Issue", "Other"];
const FACILITY_TYPES = ["Meeting Room", "Gym", "Cafeteria", "Parking"];

const TrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
  </svg>
);

function EmployeeDashboard() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Booking Form State
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [saving, setSaving] = useState(false);

  // Complaint Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestionDetail, setAiSuggestionDetail] = useState(null);

  // AI Slot Recommendation State
  const [recFacilityType, setRecFacilityType] = useState(FACILITY_TYPES[0]);
  const [recDate, setRecDate] = useState("");
  const [recWindow, setRecWindow] = useState("any");
  const [recDuration, setRecDuration] = useState(60);
  const [recAttendees, setRecAttendees] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");
  const recResultRef = useRef(null);

  useEffect(() => {
    if (recommendations.length > 0 || recError) {
      const timer = setTimeout(() => {
        recResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [recommendations, recError]);

  const [profileUser, setProfileUser] = useState({
    name: localStorage.getItem("user_name") || "Employee",
    email: localStorage.getItem("user_email") || "",
    phone: "",
  });
  const userName = profileUser.name || "Employee";
  const userEmail = profileUser.email || "";

  // Profile Header Dropdown & Profile Modal State
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("view"); // "view" | "edit" | "password"
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Local YYYY-MM-DD string
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  const handleLogout = () => {
    ["access_token", "user_id", "user_name", "user_email", "user_role"].forEach((key) =>
      localStorage.removeItem(key)
    );
    window.location.href = "/login";
  };

  const request = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Your session has expired. Please log in again.");
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg || JSON.stringify(item)).join("; ")
        : typeof detail === "string"
          ? detail
          : `Request failed (${response.status}).`;
      throw new Error(message);
    }
    return data;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const tasks = await Promise.allSettled([
      request("/facilities"),
      request("/bookings"),
      request("/complaints"),
      request("/auth/me"),
    ]);
    const setters = [setFacilities, setBookings, setComplaints];
    const labels = ["Facilities", "Bookings", "Complaints"];
    const failures = [];
    tasks.slice(0, 3).forEach((result, i) => {
      if (result.status === "fulfilled") setters[i](Array.isArray(result.value) ? result.value : []);
      else failures.push(`${labels[i]}: ${result.reason?.message || "Could not load"}`);
    });
    if (tasks[3].status === "fulfilled" && tasks[3].value) {
      const me = tasks[3].value;
      setProfileUser({
        name: me.name || "Employee",
        email: me.email || "",
        phone: me.phone || "",
      });
      if (me.name) localStorage.setItem("user_name", me.name);
      if (me.email) localStorage.setItem("user_email", me.email);
    }
    if (failures.length) setError(failures.join(" | "));
    setLoading(false);
  }, [request]);

  const openProfileModal = (initialTab = "view") => {
    setProfileDropdownOpen(false);
    setProfileTab(initialTab);
    setEditName(profileUser.name || "");
    setEditEmail(profileUser.email || "");
    setEditPhone(profileUser.phone || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setProfileError("");
    setProfileSuccess("");
    setProfileModalOpen(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!editName.trim() || editName.trim().length < 2) {
      setProfileError("Full name must be at least 2 characters.");
      return;
    }
    if (!editEmail.trim()) {
      setProfileError("Company email is required.");
      return;
    }
    const cleanPhone = editPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setProfileError("Mobile phone number must be exactly 10 digits.");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await request("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: cleanPhone,
        }),
      });
      const updated = res?.user || {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: cleanPhone,
      };
      setProfileUser((prev) => ({
        ...prev,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      }));
      localStorage.setItem("user_name", updated.name);
      localStorage.setItem("user_email", updated.email);
      setProfileSuccess(res?.message || "Profile updated successfully!");
      setProfileTab("view");
    } catch (err) {
      setProfileError(err.message || "Could not update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!currentPassword) {
      setProfileError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setProfileError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setProfileError("New password and confirmation do not match.");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmNewPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setProfileSuccess(res?.message || "Password changed successfully!");
      setProfileTab("view");
    } catch (err) {
      setProfileError(err.message || "Could not change password.");
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    loadData();
    setRecDate(today);
  }, [loadData, today]);

  const availableFacilities = useMemo(
    () => facilities.filter((f) => f.available !== false),
    [facilities]
  );

  const openBooking = (facility) => {
    setSelectedFacility(facility);
    setDate("");
    setStartTime("10:00");
    setEndTime("11:00");
    setActiveMenu("Book Facility");
    setError("");
    setNotice("");
  };

  const handleCopilotReview = ({ facility, bookingDate, bookingStartTime, bookingEndTime }) => {
    setSelectedFacility(facility);
    setDate(bookingDate);
    setStartTime(bookingStartTime);
    setEndTime(bookingEndTime);
    setActiveMenu("Book Facility");
    setError("");
    setNotice("WorkSphere Copilot prepared your booking. Review and confirm to submit.");
  };

  const createBooking = async (event) => {
    event.preventDefault();
    if (!selectedFacility) {
      setError("Please choose a facility before booking.");
      return;
    }
    if (!date) {
      setError("Please select a booking date.");
      return;
    }
    if (date < today) {
      setError("Booking date cannot be in the past.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please select both start and end times.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be later than start time.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request("/bookings", {
        method: "POST",
        body: JSON.stringify({
          user_name: userName,
          facility_id: selectedFacility.id,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
        }),
      });
      setNotice(result?.message || "Booking created successfully.");
      setSelectedFacility(null);
      setActiveMenu("My Bookings");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not create booking.");
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = (booking) => {
    setConfirmDialog({
      icon: "📅",
      title: "Cancel Booking",
      message: `Are you sure you want to cancel booking #${booking.id}${booking.facility_name ? ` for ${booking.facility_name}` : ""}?`,
      cancelLabel: "Keep Booking",
      confirmLabel: "Yes, Cancel Booking",
      onConfirm: async () => {
        setError("");
        setNotice("");
        try {
          const result = await request(`/bookings/${booking.id}`, { method: "DELETE" });
          setNotice(result?.message || "Booking cancelled.");
          await loadData();
        } catch (err) {
          setError(err.message || "Could not cancel booking.");
        }
      },
    });
  };

  const deleteBooking = (booking) => {
    setConfirmDialog({
      icon: "🗑️",
      title: "Delete Booking",
      message: `Are you sure you want to permanently delete booking #${booking.id}${booking.facility_name ? ` (${booking.facility_name})` : ""}? This action cannot be undone.`,
      cancelLabel: "Cancel",
      confirmLabel: "Delete Booking",
      onConfirm: async () => {
        setError("");
        setNotice("");
        try {
          const result = await request(`/bookings/${booking.id}?permanent=true`, { method: "DELETE" });
          setNotice(result?.message || "Booking deleted permanently.");
          await loadData();
        } catch (err) {
          setError(err.message || "Could not delete booking.");
        }
      },
    });
  };

  // AI Complaint Categorization
  const handleAiSuggestCategory = async () => {
    if (!subject.trim() && !description.trim()) {
      setError("Please enter a subject or description first so AI can suggest a category.");
      return;
    }

    setAiSuggesting(true);
    setError("");
    try {
      const res = await request("/ai/categorize-complaint", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      if (res?.suggested_category) {
        setCategory(res.suggested_category);
        setAiSuggestionDetail(
          `AI Suggestion: ${res.suggested_category} (${Math.round((res.confidence || 0.6) * 100)}% confidence) — ${res.explanation}`
        );
      }
    } catch (err) {
      setError("Could not suggest category: " + (err.message || ""));
    } finally {
      setAiSuggesting(false);
    }
  };

  const createComplaint = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request("/complaints", {
        method: "POST",
        body: JSON.stringify({ category, subject: subject.trim(), description: description.trim() }),
      });
      setNotice(result?.message || "Complaint submitted successfully.");
      setSubject("");
      setDescription("");
      setAiSuggestionDetail(null);
      setActiveMenu("Complaints");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not submit complaint.");
    } finally {
      setSaving(false);
    }
  };

  const deleteComplaint = (complaint) => {
    const complaintId = typeof complaint === "object" ? complaint.id : complaint;
    const subjectText = typeof complaint === "object" && complaint.subject ? ` ("${complaint.subject}")` : "";
    setConfirmDialog({
      icon: "🗑️",
      title: "Delete Complaint",
      message: `Are you sure you want to delete complaint #${complaintId}${subjectText}? This action cannot be undone.`,
      cancelLabel: "Cancel",
      confirmLabel: "Delete Complaint",
      onConfirm: async () => {
        setError("");
        setNotice("");
        try {
          const result = await request(`/complaints/${complaintId}`, { method: "DELETE" });
          setNotice(result?.message || "Complaint deleted successfully.");
          await loadData();
        } catch (err) {
          setError(err.message || "Could not delete complaint.");
        }
      },
    });
  };

  // AI Smart Slot Recommendation
  const fetchSmartRecommendations = async (e) => {
    if (e) e.preventDefault();
    setRecLoading(true);
    setRecError("");
    setRecommendations([]);

    try {
      const data = await request("/recommendations/smart-slots", {
        method: "POST",
        body: JSON.stringify({
          facility_type: recFacilityType,
          booking_date: recDate || today,
          attendees: Number(recAttendees) || 1,
          duration_minutes: Number(recDuration) || 60,
          preferred_window: recWindow,
        }),
      });

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        if (data.recommendations.length === 0) {
          setRecError("No suitable available slots found for the requested criteria. Try adjusting the date, time window, or duration.");
        }
      }
    } catch (err) {
      setRecError(err.message || "Could not generate recommendations.");
    } finally {
      setRecLoading(false);
    }
  };

  const handleBookRecommendedSlot = (rec) => {
    const targetFacility = facilities.find((f) => f.id === rec.facility_id) || {
      id: rec.facility_id,
      name: rec.facility_name,
      type: rec.facility_type,
      capacity: rec.capacity,
      available: true,
    };

    setSelectedFacility(targetFacility);
    setDate(rec.booking_date);
    setStartTime(rec.start_time);
    setEndTime(rec.end_time);
    setActiveMenu("Book Facility");
    setError("");
    setNotice(`Slot ${rec.start_time}–${rec.end_time} loaded from AI Recommendations. Review details and confirm your reservation.`);
  };

  const dateLabel = (value) => {
    if (!value) return "—";
    const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  };

  const timeLabel = (value) => {
    if (!value) return "—";
    const [h, m] = String(value).split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const timeToMinutes = (value) => {
    if (!value || !String(value).includes(":")) return null;
    const [h, m] = String(value).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const addMinutesToTime = (value, mins) => {
    const base = timeToMinutes(value);
    if (base === null) return value;
    const total = Math.min(base + mins, 23 * 60 + 59);
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    return `${h}:${m}`;
  };

  const getDurationInfo = (start, end) => {
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);
    if (s === null || e === null) return { minutes: 0, label: "—", valid: false };
    const diff = e - s;
    if (diff <= 0) return { minutes: diff, label: "End time must be after start time", valid: false };
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} ${hrs === 1 ? "hr" : "hrs"}`);
    if (mins > 0) parts.push(`${mins} ${mins === 1 ? "min" : "mins"}`);
    return { minutes: diff, label: parts.join(" "), valid: true };
  };

  const statusClass = (value) =>
    `employee-status employee-status-${String(value || "unknown").toLowerCase().replace(/\s+/g, "-")}`;

  const facilityCards = () => {
    if (loading && facilities.length === 0) return <p>Loading facilities...</p>;
    if (!facilities.length) return <div className="employee-empty-state"><h3>No facilities found</h3><p>Ask the administrator to add facilities.</p></div>;
    const icons = { "Meeting Room": "🏢", Gym: "🏋️", Cafeteria: "🍽️", Parking: "🚗" };
    return <div className="dashboard-facilities">
      {facilities.map((f) => (
        <article className="dashboard-facility-card" key={f.id}>
          <div className="facility-large-icon">{icons[f.type] || "🏬"}</div>
          <h3>{f.name}</h3>
          <p>{f.type}</p>
          <p>Capacity: {f.capacity} persons/slots</p>
          <p><span className={statusClass(f.available ? "Available" : "Unavailable")}>{f.available ? "Available" : "Unavailable"}</span></p>
          <button type="button" disabled={!f.available} onClick={() => openBooking(f)}>
            {f.available ? "Book this Facility" : "Unavailable"}
          </button>
        </article>
      ))}
    </div>;
  };

  const renderBookings = () => (
    <section className="employee-data-section">
      <div className="employee-section-heading">
        <div>
          <h2>My Bookings</h2>
          <p>View and manage your active and past reservations.</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading}>↻ Refresh</button>
      </div>
      {!bookings.length ? (
        <div className="employee-empty-state">
          <h3>No bookings yet</h3>
          <p>Choose a facility to make your first reservation.</p>
          <button type="button" onClick={() => { setSelectedFacility(null); setActiveMenu("Book Facility"); }}>
            Book a Facility
          </button>
        </div>
      ) : (
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Facility Name</th>
                <th>Type</th>
                <th>Booking Date</th>
                <th>Time Slot</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td><strong>{b.facility_name}</strong></td>
                  <td>{b.facility_type}</td>
                  <td>{dateLabel(b.booking_date)}</td>
                  <td>{timeLabel(b.start_time)} – {timeLabel(b.end_time)}</td>
                  <td><span className={statusClass(b.status)}>{b.status || "Booked"}</span></td>
                  <td>
                    {b.status !== "Cancelled" ? (
                      <button type="button" className="employee-cancel-button" onClick={() => cancelBooking(b)}>
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="employee-icon-delete-button"
                        onClick={() => deleteBooking(b)}
                        title="Delete booking"
                        aria-label={`Delete booking #${b.id}`}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderComplaints = () => (
    <section className="employee-data-section">
      <div className="employee-section-heading">
        <div>
          <h2>My Complaints</h2>
          <p>Track your reported workplace issues and administrator remarks.</p>
        </div>
        <button type="button" onClick={() => setActiveMenu("Submit Complaint")}>+ Submit Complaint</button>
      </div>
      {!complaints.length ? (
        <div className="employee-empty-state">
          <h3>No complaints submitted</h3>
          <p>Submit a complaint if you have any workplace issues.</p>
        </div>
      ) : (
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Subject & Description</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Admin Remark</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td><strong>{c.category}</strong></td>
                  <td>
                    <strong>{c.subject}</strong>
                    <small className="employee-cell-description">{c.description}</small>
                  </td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                  <td><span className={statusClass(c.status)}>{c.status}</span></td>
                  <td>{c.admin_remark || "No response yet"}</td>
                  <td>
                    <button
                      type="button"
                      className="employee-icon-delete-button"
                      onClick={() => deleteComplaint(c)}
                      title="Delete complaint"
                      aria-label={`Delete complaint #${c.id}`}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderBookingForm = () => {
    const durationInfo = getDurationInfo(startTime, endTime);
    const quickDurations = [
      { label: "30 mins", mins: 30 },
      { label: "1 hr", mins: 60 },
      { label: "1.5 hrs", mins: 90 },
      { label: "2 hrs", mins: 120 },
      { label: "3 hrs", mins: 180 },
      { label: "4 hrs", mins: 240 },
    ];

    const handleStartTimeChange = (newStart) => {
      const currentMins = durationInfo.valid ? durationInfo.minutes : 60;
      setStartTime(newStart);
      if (newStart) {
        setEndTime(addMinutesToTime(newStart, currentMins));
      }
    };

    return (
    <section className="employee-data-section">
      <h2>Book a Facility</h2>
      <p>Select an available facility, set your date and timing, and confirm reservation.</p>
      {selectedFacility ? (
        <form className="employee-form" onSubmit={createBooking}>
          <h3>{selectedFacility.name} <small>({selectedFacility.type} · Capacity: {selectedFacility.capacity})</small></h3>
          <label>
            Booking date
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
          </label>

          {/* Quick Duration Selector */}
          <div className="ws-duration-bar">
            <span className="ws-duration-title">Quick Duration:</span>
            <div className="ws-duration-pills">
              {quickDurations.map((d) => (
                <button
                  type="button"
                  key={d.mins}
                  className={`ws-duration-pill ${durationInfo.valid && durationInfo.minutes === d.mins ? "active" : ""}`}
                  onClick={() => setEndTime(addMinutesToTime(startTime || "09:00", d.mins))}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="employee-time-fields">
            <label>
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </label>
            <label>
              End time
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </label>
          </div>

          {/* Live Slot Duration Summary */}
          <div className={`ws-slot-summary ${durationInfo.valid ? "valid" : "invalid"}`}>
            {durationInfo.valid ? (
              <>
                <span>🕒 Selected Slot: <strong>{timeLabel(startTime)} – {timeLabel(endTime)}</strong></span>
                <span className="ws-slot-duration-badge">Duration: {durationInfo.label}</span>
              </>
            ) : (
              <span>⚠️ {durationInfo.label}</span>
            )}
          </div>

          <div className="employee-form-actions">
            <button type="button" className="employee-secondary-button" onClick={() => setSelectedFacility(null)}>
              Choose another facility
            </button>
            <button type="submit" disabled={saving || !durationInfo.valid}>
              {saving ? "Confirming..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      ) : (
        facilityCards()
      )}
    </section>
    );
  };

  const renderComplaintForm = () => (
    <section className="employee-data-section">
      <h2>Submit a Workplace Complaint</h2>
      <p>Report an issue for administrator review. Our AI assistant can automatically suggest the best category.</p>

      {aiSuggestionDetail && (
        <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "12px", marginBottom: "16px" }}>
          <strong>✦ {aiSuggestionDetail}</strong>
        </div>
      )}

      <form className="employee-form" onSubmit={createComplaint}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <label style={{ flex: 1 }}>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="employee-secondary-button"
            style={{ marginBottom: "15px", whiteSpace: "nowrap", padding: "10px 14px", fontSize: "12px" }}
            onClick={handleAiSuggestCategory}
            disabled={aiSuggesting}
          >
            {aiSuggesting ? "Analyzing text..." : "✦ Suggest Category with AI"}
          </button>
        </div>

        <label>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            minLength={3}
            maxLength={150}
            placeholder="Briefly describe the issue (e.g. Projector malfunctioning in Meeting Room 1)"
            required
          />
        </label>

        <label>
          Detailed Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={5}
            maxLength={2000}
            rows={5}
            placeholder="Provide specific details about the issue..."
            required
          />
        </label>

        <div className="employee-form-actions">
          <button type="button" className="employee-secondary-button" onClick={() => setActiveMenu("Complaints")}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      </form>
    </section>
  );

  // Full Interactive AI Slot Recommendation View
  const renderAiRecommendation = () => (
    <section className="employee-data-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <h2>Smart Slot Recommendation Engine</h2>
          <p>
            Powered by Scikit-learn Random Forest regression. Recommends verified available slots ranked by
            optimal capacity fit, demand prediction, and low congestion.
          </p>
        </div>
        <span className="ws-ai-chip" style={{ fontSize: "11px", padding: "6px 12px" }}>✦ ML Model Active</span>
      </div>

      <form onSubmit={fetchSmartRecommendations} style={{ background: "#f8fafc", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
              Facility Type
            </label>
            <select
              value={recFacilityType}
              onChange={(e) => setRecFacilityType(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              {FACILITY_TYPES.map((t) => (
                <option value={t} key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
              Booking Date
            </label>
            <input
              type="date"
              value={recDate}
              min={today}
              onChange={(e) => setRecDate(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
              Time Window
            </label>
            <select
              value={recWindow}
              onChange={(e) => setRecWindow(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value="any">Any Time (08:00 – 20:00)</option>
              <option value="morning">Morning (08:00 – 12:00)</option>
              <option value="afternoon">Afternoon (12:00 – 17:00)</option>
              <option value="evening">Evening (17:00 – 21:00)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
              Duration
            </label>
            <select
              value={recDuration}
              onChange={(e) => setRecDuration(Number(e.target.value))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes (1 Hour)</option>
              <option value={90}>90 Minutes (1.5 Hours)</option>
              <option value={120}>120 Minutes (2 Hours)</option>
              <option value={180}>180 Minutes (3 Hours)</option>
              <option value={240}>240 Minutes (4 Hours)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
              Attendees
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={recAttendees}
              onChange={(e) => setRecAttendees(Number(e.target.value))}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="ws-primary-button"
          style={{ marginTop: "16px", padding: "12px" }}
          disabled={recLoading}
        >
          {recLoading ? "Analyzing Workplace Demands..." : "✦ Get Smart Slot Recommendations"}
        </button>
      </form>

      <div ref={recResultRef} style={{ scrollMarginTop: "24px" }}>
        {recError && (
          <div className="employee-alert employee-alert-error" role="alert">
            {recError}
          </div>
        )}

        {recommendations.length > 0 && (
          <div>
          <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "14px", color: "var(--ws-ink)" }}>
            Top Recommended Slots for {recFacilityType} on {recDate}:
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  padding: "18px",
                  borderRadius: "14px",
                  border: idx === 0 ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  background: idx === 0 ? "#eff6ff" : "#ffffff",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase" }}>
                    Rank #{idx + 1} Best Match
                  </span>
                  <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "12px" }}>
                    {rec.recommendation_score}% Score
                  </span>
                </div>

                <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "800" }}>{rec.facility_name}</h4>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                  🕒 {rec.start_time} – {rec.end_time} ({rec.duration_minutes} mins)
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                  Capacity: {rec.capacity} · Attendees: {rec.attendees} · Demand: <strong>{rec.demand_level}</strong>
                </div>

                <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                  {rec.explanation}
                </p>

                <button
                  type="button"
                  className="ws-primary-button"
                  onClick={() => handleBookRecommendedSlot(rec)}
                  style={{ width: "100%", padding: "10px" }}
                >
                  Book This Slot →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );

  const renderDashboard = () => {
    // Chronologically sorted upcoming bookings strictly >= today and not cancelled
    const upcomingBookings = [...bookings]
      .filter(
        (b) =>
          String(b.status || "").toLowerCase() !== "cancelled" &&
          String(b.booking_date).slice(0, 10) >= today
      )
      .sort((a, b) => `${a.booking_date} ${a.start_time}`.localeCompare(`${b.booking_date} ${b.start_time}`));

    const upcomingBooking = upcomingBookings[0] || null;

    const pendingComplaints = complaints.filter((item) =>
      ["pending", "open", "in progress", "in_progress"].includes(String(item.status || "").toLowerCase())
    ).length;

    const recentBookings = [...bookings].slice(0, 4);
    const recentComplaints = [...complaints].slice(0, 3);
    const facilityIcons = { "Meeting Room": "🏢", Gym: "🏋️", Cafeteria: "🍽️", Parking: "🚗" };

    return (
      <div className="ws-dashboard-content">
        <section className="ws-welcome-banner">
          <div>
            <span className="ws-eyebrow">EMPLOYEE WORKSPACE</span>
            <h2>Welcome back, {userName} <span>👋</span></h2>
            <p>Your workplace resources, intelligent slot recommendations, and active reservations.</p>
          </div>
          <div className="ws-welcome-orb" aria-hidden="true"><span>✦</span></div>
        </section>

        <section className="ws-stat-grid" aria-label="Workspace summary">
          <article className="ws-stat-card ws-stat-blue">
            <div className="ws-stat-icon">▣</div>
            <div>
              <span>Total bookings</span>
              <strong>{bookings.length}</strong>
              <small>All reservations</small>
            </div>
          </article>

          <article className="ws-stat-card ws-stat-green">
            <div className="ws-stat-icon">⌂</div>
            <div>
              <span>Available facilities</span>
              <strong>{availableFacilities.length}</strong>
              <small>Ready to reserve</small>
            </div>
          </article>

          <article className="ws-stat-card ws-stat-violet">
            <div className="ws-stat-icon">✧</div>
            <div>
              <span>AI recommendations</span>
              <strong>Smart</strong>
              <small>Random Forest Slot Ranking</small>
            </div>
          </article>

          <article className="ws-stat-card ws-stat-amber">
            <div className="ws-stat-icon">!</div>
            <div>
              <span>Open complaints</span>
              <strong>{pendingComplaints}</strong>
              <small>{complaints.length} total tickets</small>
            </div>
          </article>
        </section>

        <div className="ws-dashboard-grid">
          {/* Next Booking Panel */}
          <section className="ws-panel ws-next-booking">
            <div className="ws-panel-heading">
              <div>
                <span className="ws-eyebrow">YOUR SCHEDULE</span>
                <h3>Next upcoming booking</h3>
              </div>
              <button type="button" className="ws-text-button" onClick={() => setActiveMenu("My Bookings")}>
                View all ↗
              </button>
            </div>

            {upcomingBooking ? (
              <div className="ws-booking-preview">
                <div className="ws-booking-art">{facilityIcons[upcomingBooking.facility_type] || "🏢"}</div>
                <div className="ws-booking-info">
                  <h4>{upcomingBooking.facility_name}</h4>
                  <p>📅 {dateLabel(upcomingBooking.booking_date)}</p>
                  <p>◷ {timeLabel(upcomingBooking.start_time)} – {timeLabel(upcomingBooking.end_time)}</p>
                  <span className={statusClass(upcomingBooking.status || "Booked")}>{upcomingBooking.status || "Booked"}</span>
                </div>
              </div>
            ) : (
              <div className="ws-inline-empty">
                <span>📅</span>
                <div>
                  <strong>No upcoming bookings</strong>
                  <p>Schedule a facility when you need it.</p>
                </div>
              </div>
            )}
            <button
              type="button"
              className="ws-primary-button"
              onClick={() => { setSelectedFacility(null); setActiveMenu("Book Facility"); }}
            >
              ＋ Book a facility
            </button>
          </section>

          {/* AI Slot Recommendations Teaser Panel */}
          <section className="ws-panel ws-ai-panel">
            <div className="ws-panel-heading">
              <div>
                <span className="ws-eyebrow">WORKSPHERE INTELLIGENCE</span>
                <h3>AI slot recommendations</h3>
              </div>
              <span className="ws-ai-chip">✦ AI Model</span>
            </div>
            <p className="ws-panel-description">
              Find optimal meeting slots, gym hours, or parking spaces backed by real workplace demand analytics.
            </p>
            <div className="ws-recommendation-item">
              <span className="ws-recommendation-icon">◷</span>
              <div>
                <strong>Smart Slot Optimization</strong>
                <small>Trained on occupancy & utilization patterns</small>
              </div>
              <span className="ws-recommendation-tag">Scikit-learn</span>
            </div>
            <div className="ws-recommendation-item">
              <span className="ws-recommendation-icon">⌂</span>
              <div>
                <strong>{availableFacilities.length} facilities verified available</strong>
                <small>Instant conflict-free reservation</small>
              </div>
              <span className="ws-recommendation-tag">Live MySQL</span>
            </div>
            <button type="button" className="ws-outline-button" onClick={() => setActiveMenu("AI Recommendation")}>
              Open Smart Slot Recommender →
            </button>
          </section>

          {/* Quick Actions Panel */}
          <section className="ws-panel ws-quick-panel">
            <div className="ws-panel-heading">
              <div>
                <span className="ws-eyebrow">GET THINGS DONE</span>
                <h3>Quick actions</h3>
              </div>
            </div>
            <button type="button" className="ws-action-button ws-action-primary" onClick={() => { setSelectedFacility(null); setActiveMenu("Book Facility"); }}>
              <span>▦</span><span>Book a facility</span><b>→</b>
            </button>
            <button type="button" className="ws-action-button" onClick={() => setActiveMenu("AI Recommendation")}>
              <span>🤖</span><span>Smart slot recommendations</span><b>→</b>
            </button>
            <button type="button" className="ws-action-button" onClick={() => setActiveMenu("My Bookings")}>
              <span>▤</span><span>View my bookings</span><b>→</b>
            </button>
            <button type="button" className="ws-action-button" onClick={() => setActiveMenu("Submit Complaint")}>
              <span>✎</span><span>Submit a complaint</span><b>→</b>
            </button>
            <button type="button" className="ws-action-button" onClick={() => setActiveMenu("Chat Assistant")}>
              <span>✧</span><span>Ask WorkSphere Copilot</span><b>→</b>
            </button>
          </section>

          {/* Activity Panel */}
          <section className="ws-panel ws-activity-panel">
            <div className="ws-panel-heading">
              <div>
                <span className="ws-eyebrow">LATEST UPDATES</span>
                <h3>Recent activity</h3>
              </div>
              <button type="button" className="ws-text-button" onClick={() => setActiveMenu("My Bookings")}>
                All activity ↗
              </button>
            </div>
            {recentBookings.length || recentComplaints.length ? (
              <div className="ws-activity-list">
                {recentBookings.map((item) => (
                  <div className="ws-activity-row" key={`booking-${item.id}`}>
                    <span className="ws-activity-dot booking-dot">▣</span>
                    <div>
                      <strong>Reservation #{item.id}: {item.facility_name}</strong>
                      <small>{dateLabel(item.booking_date)} · {timeLabel(item.start_time)} to {timeLabel(item.end_time)}</small>
                    </div>
                    <span className={statusClass(item.status || "Booked")}>{item.status || "Booked"}</span>
                  </div>
                ))}
                {recentComplaints.map((item) => (
                  <div className="ws-activity-row" key={`complaint-${item.id}`}>
                    <span className="ws-activity-dot complaint-dot">✎</span>
                    <div>
                      <strong>Ticket #{item.id}: {item.subject}</strong>
                      <small>{item.category} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recently"}</small>
                    </div>
                    <span className={statusClass(item.status || "Pending")}>{item.status || "Pending"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ws-inline-empty">
                <span>✦</span>
                <div>
                  <strong>You're all caught up</strong>
                  <p>Your recent bookings and complaints will appear here.</p>
                </div>
              </div>
            )}
          </section>

          {/* Facilities Panel */}
          <section className="ws-panel ws-facilities-panel">
            <div className="ws-panel-heading">
              <div>
                <span className="ws-eyebrow">YOUR WORKPLACE</span>
                <h3>Explore facilities</h3>
              </div>
              <button type="button" className="ws-text-button" onClick={() => { setSelectedFacility(null); setActiveMenu("Book Facility"); }}>
                View all ↗
              </button>
            </div>
            {facilities.length ? (
              <div className="ws-mini-facility-grid">
                {facilities.slice(0, 4).map((facility) => (
                  <button
                    type="button"
                    className="ws-mini-facility"
                    key={facility.id}
                    disabled={!facility.available}
                    onClick={() => openBooking(facility)}
                  >
                    <span>{facilityIcons[facility.type] || "🏬"}</span>
                    <strong>{facility.name}</strong>
                    <small>{facility.type} · Cap: {facility.capacity}</small>
                    <em>{facility.available ? "Available" : "Unavailable"}</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="ws-panel-description">No facilities have been registered yet.</p>
            )}
          </section>
        </div>
      </div>
    );
  };

  const menus = [
    ["Dashboard", "🏠"],
    ["Book Facility", "📅"],
    ["My Bookings", "📋"],
    ["AI Recommendation", "🤖"],
    ["Complaints", "📝"],
    ["Chat Assistant", "💬"]
  ];

  return (
    <div className="employee-dashboard ws-employee-dashboard">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <span className="ws-brand-mark">W</span>
          <span>WorkSphere <b>AI</b></span>
        </div>
        <div className="employee-profile">
          <div className="profile-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <h3>{userName}</h3>
            <p>Authorized Employee</p>
          </div>
        </div>
        <nav className="dashboard-nav">
          {menus.map(([menu, icon]) => (
            <button
              type="button"
              key={menu}
              className={activeMenu === menu || (activeMenu === "Submit Complaint" && menu === "Complaints") ? "active" : ""}
              onClick={() => {
                setActiveMenu(menu);
                setError("");
                setNotice("");
                if (menu === "Book Facility") setSelectedFacility(null);
              }}
            >
              {icon} {menu}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="ws-eyebrow">WORKSPACE / {activeMenu.toUpperCase()}</span>
            <h1>{activeMenu === "Submit Complaint" ? "Complaints" : activeMenu}</h1>
            <p>Workplace resource reservations and intelligent scheduling.</p>
          </div>

          {/* Profile Dropdown Trigger */}
          <div className="ws-user-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="header-user ws-header-user-btn"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
            >
              <span className="ws-header-avatar">{userName.charAt(0).toUpperCase()}</span>
              <span>{userName}</span>
              <svg
                className={`ws-chevron ${profileDropdownOpen ? "open" : ""}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="ws-profile-dropdown-menu">
                <div className="ws-dropdown-header">
                  <div className="ws-dropdown-avatar">{userName.charAt(0).toUpperCase()}</div>
                  <div className="ws-dropdown-user-info">
                    <strong>{userName}</strong>
                    <small>{userEmail || "employee@worksphere.com"}</small>
                    <span className="ws-dropdown-role-chip">Authorized Employee</span>
                  </div>
                </div>

                <div className="ws-dropdown-divider"></div>

                <button
                  type="button"
                  className="ws-dropdown-item"
                  onClick={() => openProfileModal("view")}
                >
                  <span className="ws-dropdown-item-icon">👤</span>
                  <div className="ws-dropdown-item-text">
                    <strong>My Profile</strong>
                    <small>View & edit your account details</small>
                  </div>
                </button>

                <div className="ws-dropdown-divider"></div>

                <button
                  type="button"
                  className="ws-dropdown-item ws-dropdown-item-logout"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <span className="ws-dropdown-item-icon">🚪</span>
                  <div className="ws-dropdown-item-text">
                    <strong>Logout</strong>
                    <small>End your active session securely</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        </header>

        {error && <div className="employee-alert employee-alert-error" role="alert">{error}</div>}
        {notice && <div className="employee-alert employee-alert-success" role="status">{notice}</div>}

        {activeMenu === "Dashboard" && renderDashboard()}
        {activeMenu === "Book Facility" && renderBookingForm()}
        {activeMenu === "My Bookings" && renderBookings()}
        {activeMenu === "Complaints" && renderComplaints()}
        {activeMenu === "Submit Complaint" && renderComplaintForm()}
        {activeMenu === "AI Recommendation" && renderAiRecommendation()}
        {activeMenu === "Chat Assistant" && (
          <WorkSphereCopilot
            facilities={availableFacilities}
            bookings={bookings}
            complaints={complaints}
            onReviewBooking={handleCopilotReview}
            onNavigate={(dest) => {
              if (dest === "Book Facility") {
                setSelectedFacility(null);
                setActiveMenu("Book Facility");
              } else if (dest === "Submit Complaint") {
                setActiveMenu("Submit Complaint");
              } else if (dest === "My Bookings") {
                setActiveMenu("My Bookings");
              }
              setError("");
              setNotice("");
            }}
          />
        )}

        {/* My Profile Modal */}
        {profileModalOpen && (
          <div className="ws-modal-overlay" onClick={() => setProfileModalOpen(false)}>
            <div className="ws-profile-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="ws-profile-modal-header">
                <div className="ws-profile-modal-title">
                  <div className="ws-profile-modal-avatar">{userName.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3>My Profile</h3>
                    <p>WorkSphere AI Employee Account</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ws-modal-close-btn"
                  onClick={() => setProfileModalOpen(false)}
                  aria-label="Close Profile"
                >
                  ✕
                </button>
              </div>

              {/* Profile Modal Tabs */}
              <div className="ws-profile-tabs">
                <button
                  type="button"
                  className={`ws-profile-tab ${profileTab === "view" ? "active" : ""}`}
                  onClick={() => {
                    setProfileTab("view");
                    setProfileError("");
                    setProfileSuccess("");
                  }}
                >
                  👤 Overview
                </button>
                <button
                  type="button"
                  className={`ws-profile-tab ${profileTab === "edit" ? "active" : ""}`}
                  onClick={() => {
                    setProfileTab("edit");
                    setEditName(profileUser.name || "");
                    setEditEmail(profileUser.email || "");
                    setEditPhone(profileUser.phone || "");
                    setProfileError("");
                    setProfileSuccess("");
                  }}
                >
                  ✏️ Edit Profile
                </button>
                <button
                  type="button"
                  className={`ws-profile-tab ${profileTab === "password" ? "active" : ""}`}
                  onClick={() => {
                    setProfileTab("password");
                    setProfileError("");
                    setProfileSuccess("");
                  }}
                >
                  🔒 Password
                </button>
              </div>

              <div className="ws-profile-modal-body">
                {profileError && (
                  <div className="employee-alert employee-alert-error" style={{ marginBottom: "14px", fontSize: "12.5px" }} role="alert">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="employee-alert employee-alert-success" style={{ marginBottom: "14px", fontSize: "12.5px" }} role="status">
                    {profileSuccess}
                  </div>
                )}

                {profileTab === "view" && (
                  <>
                    <div className="ws-profile-info-grid">
                      <div className="ws-profile-field">
                        <span className="ws-profile-label">Full Name</span>
                        <div className="ws-profile-value">{userName}</div>
                      </div>

                      <div className="ws-profile-field">
                        <span className="ws-profile-label">Company Email</span>
                        <div className="ws-profile-value">{userEmail || "Not specified"}</div>
                      </div>

                      <div className="ws-profile-field">
                        <span className="ws-profile-label">Mobile Phone</span>
                        <div className="ws-profile-value">{profileUser.phone || "Not specified"}</div>
                      </div>

                      <div className="ws-profile-field">
                        <span className="ws-profile-label">System Role</span>
                        <div className="ws-profile-value">
                          <span className="ws-role-badge">Authorized Employee</span>
                        </div>
                      </div>
                    </div>

                    <div className="ws-profile-quick-stats">
                      <div className="ws-profile-stat-box">
                        <strong>{bookings.length}</strong>
                        <small>Total Bookings</small>
                      </div>
                      <div className="ws-profile-stat-box">
                        <strong>{complaints.length}</strong>
                        <small>Complaints Filed</small>
                      </div>
                    </div>
                  </>
                )}

                {profileTab === "edit" && (
                  <form id="ws-edit-profile-form" className="ws-profile-edit-form" onSubmit={handleProfileUpdate}>
                    <label className="ws-profile-input-label">
                      <span>Full Name</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </label>

                    <label className="ws-profile-input-label">
                      <span>Company Email</span>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="name@worksphere.com"
                        required
                      />
                    </label>

                    <label className="ws-profile-input-label">
                      <span>Mobile Phone (10 digits)</span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        required
                      />
                    </label>
                  </form>
                )}

                {profileTab === "password" && (
                  <form id="ws-change-password-form" className="ws-profile-edit-form" onSubmit={handlePasswordChange}>
                    <label className="ws-profile-input-label">
                      <span>Current Password</span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                      />
                    </label>

                    <label className="ws-profile-input-label">
                      <span>New Password (8+ chars, upper, lower, digit, special)</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new strong password"
                        required
                      />
                    </label>

                    <label className="ws-profile-input-label">
                      <span>Confirm New Password</span>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                    </label>
                  </form>
                )}
              </div>

              <div className="ws-profile-modal-footer">
                {profileTab === "view" && (
                  <>
                    <button
                      type="button"
                      className="ws-modal-secondary-btn"
                      onClick={() => setProfileModalOpen(false)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="ws-modal-primary-btn"
                      onClick={() => {
                        setProfileTab("edit");
                        setEditName(profileUser.name || "");
                        setEditEmail(profileUser.email || "");
                        setEditPhone(profileUser.phone || "");
                        setProfileError("");
                        setProfileSuccess("");
                      }}
                    >
                      ✏️ Edit Profile
                    </button>
                    <button
                      type="button"
                      className="ws-modal-logout-btn"
                      onClick={handleLogout}
                    >
                      🚪 Logout
                    </button>
                  </>
                )}

                {profileTab === "edit" && (
                  <>
                    <button
                      type="button"
                      className="ws-modal-secondary-btn"
                      disabled={profileSaving}
                      onClick={() => {
                        setProfileTab("view");
                        setProfileError("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="ws-edit-profile-form"
                      className="ws-modal-primary-btn"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}

                {profileTab === "password" && (
                  <>
                    <button
                      type="button"
                      className="ws-modal-secondary-btn"
                      disabled={profileSaving}
                      onClick={() => {
                        setProfileTab("view");
                        setProfileError("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="ws-change-password-form"
                      className="ws-modal-primary-btn"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Updating..." : "Update Password"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmDialog && (
          <div
            className="ws-modal-overlay"
            onClick={() => !confirmBusy && setConfirmDialog(null)}
          >
            <div
              className="ws-confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="ws-confirm-modal-body">
                <div className="ws-confirm-icon">{confirmDialog.icon || "⚠️"}</div>
                <h3>{confirmDialog.title}</h3>
                <p>{confirmDialog.message}</p>
              </div>
              <div className="ws-confirm-modal-footer">
                <button
                  type="button"
                  className="ws-modal-secondary-btn"
                  disabled={confirmBusy}
                  onClick={() => setConfirmDialog(null)}
                >
                  {confirmDialog.cancelLabel || "Cancel"}
                </button>
                <button
                  type="button"
                  className="ws-confirm-danger-btn"
                  disabled={confirmBusy}
                  onClick={async () => {
                    setConfirmBusy(true);
                    try {
                      await confirmDialog.onConfirm?.();
                    } finally {
                      setConfirmBusy(false);
                      setConfirmDialog(null);
                    }
                  }}
                >
                  {confirmBusy ? "Processing..." : confirmDialog.confirmLabel || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default EmployeeDashboard;
