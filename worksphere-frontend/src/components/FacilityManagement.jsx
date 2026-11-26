import { useEffect, useState, useMemo } from "react";
import ConfirmModal from "./ConfirmModal";

const API_BASE_URL = "http://127.0.0.1:8000";

const initialForm = {
  name: "",
  type: "Meeting Room",
  capacity: 10,
  available: true,
};

function FacilityManagement() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const getToken = () => localStorage.getItem("access_token");

  const fetchFacilities = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/admin/facilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Failed to fetch facilities.");
      }
      setFacilities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load facilities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const openAddForm = () => {
    setEditingFacility(null);
    setForm(initialForm);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (facility) => {
    setEditingFacility(facility);
    setForm({
      name: facility.name || "",
      type: facility.type || "Meeting Room",
      capacity: facility.capacity || 10,
      available: Boolean(facility.available),
    });
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingFacility(null);
    setForm(initialForm);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : name === "capacity" ? value : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const capacity = Number(form.capacity);
    if (!form.name.trim()) {
      setError("Please enter a facility name.");
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const isEditing = Boolean(editingFacility);
      const url = isEditing
        ? `${API_BASE_URL}/admin/facilities/${editingFacility.id}`
        : `${API_BASE_URL}/admin/facilities`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          capacity,
          available: Boolean(form.available),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || `Failed to ${isEditing ? "update" : "add"} facility.`);
      }

      closeForm();
      setMessage(isEditing ? `Facility "${form.name}" updated successfully.` : `Facility "${form.name}" added successfully.`);
      await fetchFacilities();
    } catch (err) {
      setError(err.message || "Unable to save facility.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (facility) => {
    setConfirmDialog({
      icon: "🏢",
      title: "Delete Facility",
      message: `Are you sure you want to delete "${facility.name}"? This action cannot be undone.`,
      cancelLabel: "Cancel",
      confirmLabel: "Delete Facility",
      onConfirm: async () => {
        setError("");
        setMessage("");
        try {
          const token = getToken();
          const response = await fetch(`${API_BASE_URL}/admin/facilities/${facility.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.detail || "Failed to delete facility.");
          }

          setMessage(`Facility "${facility.name}" deleted successfully.`);
          await fetchFacilities();
        } catch (err) {
          setError(err.message || "Unable to delete facility.");
        }
      },
    });
  };

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facilities.filter((f) => {
      const matchesSearch = !q || (f.name || "").toLowerCase().includes(q) || (f.type || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "All" || f.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [facilities, search, typeFilter]);

  const facilityIcons = {
    "Meeting Room": "🏢",
    Gym: "🏋️",
    Cafeteria: "🍽️",
    Parking: "🚗"
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <span className="adm-header-eyebrow">ADMINISTRATION / FACILITIES</span>
          <h1>Facility Management</h1>
          <p>Register, inspect, and manage workplace facilities and capacities.</p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={openAddForm}>
          <span>➕</span> Add Facility
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

      {showForm && (
        <div className="adm-panel" style={{ marginBottom: "24px", border: "1px solid #bfdbfe", background: "#f8fafc" }}>
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">
              {editingFacility ? `Edit Facility: ${editingFacility.name}` : "Add New Facility"}
            </h3>
            <button type="button" className="adm-btn-secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Facility Name *
                </label>
                <input
                  name="name"
                  type="text"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Conference Room A"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Facility Type *
                </label>
                <select
                  name="type"
                  className="adm-select"
                  style={{ width: "100%" }}
                  value={form.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Meeting Room">Meeting Room</option>
                  <option value="Gym">Gym</option>
                  <option value="Cafeteria">Cafeteria</option>
                  <option value="Parking">Parking</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Maximum Capacity (persons/slots) *
                </label>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  value={form.capacity}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "24px" }}>
                <input
                  id="facility-available"
                  name="available"
                  type="checkbox"
                  checked={Boolean(form.available)}
                  onChange={handleInputChange}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="facility-available" style={{ fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  Active & Available for Booking
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="adm-btn-secondary" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="adm-btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingFacility ? "Save Changes" : "Create Facility"}
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
            placeholder="Search facility name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="adm-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Meeting Room">Meeting Room</option>
            <option value="Gym">Gym</option>
            <option value="Cafeteria">Cafeteria</option>
            <option value="Parking">Parking</option>
          </select>

          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--adm-muted)", marginLeft: "auto" }}>
            {filteredFacilities.length} {filteredFacilities.length === 1 ? "Facility" : "Facilities"} Found
          </span>
        </div>

        {loading ? (
          <div className="adm-empty-state">
            <p>Loading workplace facilities...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-icon">🏢</div>
            <h3>No Facilities Found</h3>
            <p>
              {facilities.length === 0
                ? "No workplace facilities are registered yet. Click 'Add Facility' to create one."
                : "No facilities match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacilities.map((fac) => (
                  <tr key={fac.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>
                          {facilityIcons[fac.type] || "🏬"}
                        </span>
                        <div>
                          <strong>{fac.name}</strong>
                          <div style={{ fontSize: "11px", color: "var(--adm-muted)" }}>ID #{fac.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{fac.type}</td>
                    <td>
                      <strong>{fac.capacity}</strong> <span style={{ color: "var(--adm-muted)", fontSize: "11px" }}>occupants/slots</span>
                    </td>
                    <td>
                      <span className={`adm-badge ${fac.available ? "adm-badge-available" : "adm-badge-unavailable"}`}>
                        {fac.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-edit"
                        onClick={() => openEditForm(fac)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="adm-btn-danger"
                        onClick={() => handleDelete(fac)}
                      >
                        Delete
                      </button>
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

export default FacilityManagement;
