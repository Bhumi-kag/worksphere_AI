import { useEffect, useState, useMemo } from "react";
import ConfirmModal from "../components/ConfirmModal";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  // Add / Edit Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const getToken = () => localStorage.getItem("access_token");

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to load employees.");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setShowAddForm(true);
    setError("");
    setNotice("");
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone);
    setShowAddForm(true);
    setError("");
    setNotice("");
  };

  const closeModal = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    if (!editingEmployee && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const token = getToken();

    try {
      if (editingEmployee) {
        // Edit existing employee
        const res = await fetch(`${API_BASE}/admin/employees/${editingEmployee.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name, email, phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Unable to update employee.");
        setNotice(`Employee ${name} updated successfully!`);
      } else {
        // Create new employee
        const res = await fetch(`${API_BASE}/admin/employees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
            confirm_password: confirmPassword
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Unable to create employee.");
        setNotice(`Employee account created successfully for ${data.name}!`);
      }

      closeModal();
      await fetchEmployees();
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = (emp) => {
    setConfirmDialog({
      icon: "👤",
      title: "Remove Employee",
      message: `Are you sure you want to remove employee "${emp.name}" (${emp.email})? This action cannot be undone.`,
      cancelLabel: "Cancel",
      confirmLabel: "Remove Employee",
      onConfirm: async () => {
        setError("");
        setNotice("");
        try {
          const token = getToken();
          const res = await fetch(`${API_BASE}/admin/employees/${emp.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "Unable to delete employee.");
          setNotice(data.message || `Employee ${emp.name} removed.`);
          await fetchEmployees();
        } catch (err) {
          setError(err.message || "Failed to delete employee.");
        }
      },
    });
  };

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.phone || "").includes(q)
    );
  }, [employees, search]);

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <span className="adm-header-eyebrow">ADMINISTRATION / EMPLOYEES</span>
          <h1>Employee Management</h1>
          <p>Register, update, and manage authorized corporate employees.</p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={openAddModal}>
          <span>➕</span> Add Employee
        </button>
      </div>

      {notice && (
        <div className="adm-alert adm-alert-success" role="status">
          <span>✓ {notice}</span>
          <button type="button" className="adm-btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setNotice("")}>✕</button>
        </div>
      )}

      {error && (
        <div className="adm-alert adm-alert-error" role="alert">
          <span>⚠ {error}</span>
          <button type="button" className="adm-btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <div className="adm-panel" style={{ marginBottom: "24px", border: "1px solid #bfdbfe", background: "#f8fafc" }}>
          <div className="adm-panel-header">
            <h3 className="adm-panel-title">
              {editingEmployee ? `Edit Employee: ${editingEmployee.name}` : "Create New Employee Account"}
            </h3>
            <button type="button" className="adm-btn-secondary" onClick={closeModal}>
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveEmployee}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Company Email *
                </label>
                <input
                  type="email"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  placeholder="employee@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                  Phone Number (10 digits) *
                </label>
                <input
                  type="text"
                  className="adm-search-input"
                  style={{ width: "100%" }}
                  placeholder="9876543210"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    if (/^\d{0,10}$/.test(e.target.value)) setPhone(e.target.value);
                  }}
                  required
                />
              </div>

              {!editingEmployee && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      className="adm-search-input"
                      style={{ width: "100%" }}
                      placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "var(--adm-ink)" }}>
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      className="adm-search-input"
                      style={{ width: "100%" }}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="adm-btn-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="adm-btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : editingEmployee ? "Update Employee" : "Create Account"}
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
            placeholder="Search by name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--adm-muted)", marginLeft: "auto" }}>
            {filteredEmployees.length} {filteredEmployees.length === 1 ? "Employee" : "Employees"} Found
          </span>
        </div>

        {loading ? (
          <div className="adm-empty-state">
            <p>Loading authorized employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-icon">👥</div>
            <h3>No Employees Found</h3>
            <p>
              {employees.length === 0
                ? "No employee accounts are registered yet. Use the 'Add Employee' button to create one."
                : "No employees match your search query."}
            </p>
          </div>
        ) : (
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee Name</th>
                  <th>Company Email</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>#{emp.id}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: "800",
                            fontSize: "12px"
                          }}
                        >
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>{emp.name}</strong>
                      </div>
                    </td>
                    <td>{emp.email}</td>
                    <td>{emp.phone}</td>
                    <td>
                      <span className="adm-badge adm-badge-booked">
                        {emp.role}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-edit"
                        onClick={() => openEditModal(emp)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="adm-btn-danger"
                        onClick={() => handleDeleteEmployee(emp)}
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

export default EmployeeManagement;
