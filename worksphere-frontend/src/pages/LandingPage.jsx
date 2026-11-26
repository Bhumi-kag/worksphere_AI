import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const DEFAULT_FACILITIES = [
  {
    type: "Meeting Room",
    name: "Meeting Rooms",
    icon: "🏢",
    description: "Collaborative team rooms, boardrooms & AV suites with smart displays and whiteboard facilities.",
    capacity: "Up to 25 attendees",
    available: true,
  },
  {
    type: "Gym",
    name: "Gym & Fitness",
    icon: "🏋️",
    description: "Corporate fitness centers, workout slots, and wellness spaces with off-peak booking guidance.",
    capacity: "Up to 30 slots",
    available: true,
  },
  {
    type: "Cafeteria",
    name: "Cafeteria Dining",
    icon: "🍽️",
    description: "Reserved dining tables, team lunch areas, and catering zones with staggered scheduling.",
    capacity: "Up to 50 seats",
    available: true,
  },
  {
    type: "Parking",
    name: "Reserved Parking",
    icon: "🚗",
    description: "Designated employee stalls, visitor bays, and EV charging stations with license tracking.",
    capacity: "Up to 30 stalls",
    available: true,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [facilities, setFacilities] = useState(DEFAULT_FACILITIES);

  // Fetch live facilities from backend if available, preserving actual API data
  useEffect(() => {
    let active = true;
    async function loadFacilities() {
      try {
        const res = await fetch(`${API_BASE}/facilities`);
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data) && data.length > 0) {
            // Group or map by standard categories
            const categoryMap = {
              "Meeting Room": { icon: "🏢", desc: "Collaborative conference rooms, smart boards & presentation suites." },
              "Gym": { icon: "🏋️", desc: "Workplace fitness facilities, wellness gear, and off-peak training slots." },
              "Cafeteria": { icon: "🍽️", desc: "Cafeteria tables, team lunch areas, and catering arrangements." },
              "Parking": { icon: "🚗", desc: "Reserved basement stalls, visitor bays, and EV vehicle chargers." },
            };

            const mapped = data.map((item) => ({
              type: item.type,
              name: item.name,
              icon: categoryMap[item.type]?.icon || "🏬",
              description: categoryMap[item.type]?.desc || "Workplace facility equipped for employee utility.",
              capacity: `Capacity: ${item.capacity} ${item.type === "Parking" ? "stalls" : "persons"}`,
              available: Boolean(item.available),
            }));

            // If we have items, use them (or default 4 if less than 4)
            if (mapped.length >= 4) {
              setFacilities(mapped.slice(0, 4));
            } else {
              setFacilities(DEFAULT_FACILITIES);
            }
          }
        }
      } catch {
        // Graceful fallback to default 4 workplace categories
      }
    }
    loadFacilities();
    return () => { active = false; };
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="ws-lp-root" id="top">
      {/* =========================================================
          STICKY NAVIGATION BAR
          ========================================================= */}
      <nav className="ws-lp-navbar">
        <Link to="/" className="ws-lp-logo">
          <div className="ws-lp-logo-badge">W</div>
          <span className="ws-lp-logo-text">WorkSphere <span>AI</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <ul className="ws-lp-nav-links">
          <li>
            <a href="#top" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("top"); }}>
              Home
            </a>
          </li>
          <li>
            <a href="#features" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}>
              Features
            </a>
          </li>
          <li>
            <a href="#facilities" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("facilities"); }}>
              Facilities
            </a>
          </li>
          <li>
            <a href="#how-it-works" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}>
              How It Works
            </a>
          </li>
          <li>
            <a href="#about" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("about"); }}>
              About
            </a>
          </li>
        </ul>

        {/* Action Button & Mobile Toggle */}
        <div className="ws-lp-nav-actions">
          <Link to="/login" className="ws-lp-btn-nav-login">
            <span>Sign In</span>
            <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            className="ws-lp-mobile-toggle"
            aria-label="Toggle mobile menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            background: "#0a1128",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            position: "sticky",
            top: "64px",
            zIndex: 99,
          }}
        >
          <a href="#top" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("top"); }}>Home</a>
          <a href="#features" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}>Features</a>
          <a href="#facilities" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("facilities"); }}>Facilities</a>
          <a href="#how-it-works" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}>How It Works</a>
          <a href="#about" className="ws-lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("about"); }}>About</a>
          <Link to="/login" className="ws-lp-btn-primary" style={{ textAlign: "center", justifyContent: "center" }}>
            Sign In to WorkSphere
          </Link>
        </div>
      )}

      {/* =========================================================
          HERO SECTION (COMPACT & BALANCED)
          ========================================================= */}
      <section className="ws-lp-hero">
        <div className="ws-lp-hero-content">
          <div className="ws-lp-hero-badge">
            <span className="ws-lp-hero-badge-dot"></span>
            <span>AI-Powered Workplace Resource Booking Platform</span>
          </div>

          <h1 className="ws-lp-hero-title">
            Smart Workplace.
            <br />
            <span className="ws-lp-gradient-text">Smarter Resource Management.</span>
          </h1>

          <p className="ws-lp-hero-desc">
            Book meeting rooms, gym facilities, cafeteria spaces and parking slots with
            intelligent recommendations powered by Artificial Intelligence and Machine Learning.
          </p>

          <div className="ws-lp-hero-ctas">
            <Link to="/login?tab=register" className="ws-lp-btn-primary">
              <span>Get Started</span>
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#features"
              className="ws-lp-btn-secondary"
              onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}
            >
              <span>Explore Features</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="ws-lp-hero-metrics">
            <div className="ws-lp-hero-metric-item">
              <span className="icon">✓</span>
              <span>Zero Double-Bookings</span>
            </div>
            <div className="ws-lp-hero-metric-item">
              <span className="icon">✦</span>
              <span>Scikit-learn Random Forest ML</span>
            </div>
            <div className="ws-lp-hero-metric-item">
              <span className="icon">🔒</span>
              <span>Enterprise JWT Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FEATURES SECTION
          ========================================================= */}
      <section className="ws-lp-section" id="features">
        <div className="ws-lp-section-header">
          <span className="ws-lp-eyebrow">INTELLIGENT WORKPLACE CAPABILITIES</span>
          <h2 className="ws-lp-section-title">Engineered for Modern Enterprise Operations</h2>
          <p className="ws-lp-section-sub">
            Powerful scheduling algorithms, natural language copilot, and data analytics unified
            into a seamless workplace resource platform.
          </p>
        </div>

        <div className="ws-lp-features-grid">
          {/* Card 1 */}
          <div className="ws-lp-feature-card">
            <div className="ws-lp-feature-icon-box">🤖</div>
            <div className="ws-lp-feature-header">
              <h3 className="ws-lp-feature-title">Smart Slot Recommendation</h3>
              <span className="ws-lp-feature-tag">Scikit-learn</span>
            </div>
            <p className="ws-lp-feature-desc">
              Trained Random Forest regressor predicts workplace demand patterns to recommend the optimal,
              least-congested, capacity-matched time slot.
            </p>
          </div>

          {/* Card 2 */}
          <div className="ws-lp-feature-card">
            <div className="ws-lp-feature-icon-box">💬</div>
            <div className="ws-lp-feature-header">
              <h3 className="ws-lp-feature-title">AI Workplace Copilot</h3>
              <span className="ws-lp-feature-tag">Natural Language</span>
            </div>
            <p className="ws-lp-feature-desc">
              Conversational assistant that understands everyday language, validates attendee size,
              and prepares verified conflict-free bookings in seconds.
            </p>
          </div>

          {/* Card 3 */}
          <div className="ws-lp-feature-card">
            <div className="ws-lp-feature-icon-box">🏢</div>
            <div className="ws-lp-feature-header">
              <h3 className="ws-lp-feature-title">Facility Management</h3>
              <span className="ws-lp-feature-tag">Centralized</span>
            </div>
            <p className="ws-lp-feature-desc">
              Granular controls to add, edit, set capacity, and toggle availability across meeting rooms,
              fitness spaces, cafeterias, and parking stalls.
            </p>
          </div>

          {/* Card 4 */}
          <div className="ws-lp-feature-card">
            <div className="ws-lp-feature-icon-box">📅</div>
            <div className="ws-lp-feature-header">
              <h3 className="ws-lp-feature-title">Easy Booking Management</h3>
              <span className="ws-lp-feature-tag">Conflict-Free</span>
            </div>
            <p className="ws-lp-feature-desc">
              Strict transactional overlap prevention, past-date validation, and self-service reservation
              cancellation with live MySQL synchronization.
            </p>
          </div>

          {/* Card 5 */}
          <div className="ws-lp-feature-card">
            <div className="ws-lp-feature-icon-box">📝</div>
            <div className="ws-lp-feature-header">
              <h3 className="ws-lp-feature-title">Complaint Management</h3>
              <span className="ws-lp-feature-tag">NLP Classifier</span>
            </div>
            <p className="ws-lp-feature-desc">
              AI text classification suggests categories automatically for maintenance, cleanliness,
              or parking issues, complete with administrative remark tracking.
            </p>
          </div>

          {/* Card 6 */}
          <div className="ws-lp-feature-card">
            <div className="ws-lp-feature-icon-box">📊</div>
            <div className="ws-lp-feature-header">
              <h3 className="ws-lp-feature-title">Admin Analytics & Insights</h3>
              <span className="ws-lp-feature-tag">Data-Driven</span>
            </div>
            <p className="ws-lp-feature-desc">
              Calculates peak booking days, busiest hours, and facility utilization share directly
              from real database records to guide facility scaling.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          AVAILABLE FACILITIES SECTION (1 ROW OF 4 ON DESKTOP)
          ========================================================= */}
      <section className="ws-lp-section ws-lp-facilities-section" id="facilities">
        <div className="ws-lp-section-header">
          <span className="ws-lp-eyebrow">WORKPLACE RESOURCES</span>
          <h2 className="ws-lp-section-title">Available Facilities</h2>
          <p className="ws-lp-section-sub">
            Four core corporate resource categories ready for on-demand reservation.
          </p>
        </div>

        <div className="ws-lp-facilities-grid">
          {facilities.map((fac, idx) => (
            <div key={idx} className="ws-lp-facility-card">
              <div className="ws-lp-facility-icon-wrap">{fac.icon}</div>
              <h3 className="ws-lp-facility-title">{fac.name}</h3>
              <p className="ws-lp-facility-desc">{fac.description}</p>
              <div className="ws-lp-facility-meta">
                <span className="ws-lp-facility-cap">{fac.capacity}</span>
                <span className="ws-lp-facility-status">
                  {fac.available ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS (3-STEP WORKFLOW)
          ========================================================= */}
      <section className="ws-lp-section" id="how-it-works">
        <div className="ws-lp-section-header">
          <span className="ws-lp-eyebrow">SIMPLE 3-STEP PROCESS</span>
          <h2 className="ws-lp-section-title">How WorkSphere AI Works</h2>
          <p className="ws-lp-section-sub">
            Effortless workplace resource reservations in under sixty seconds.
          </p>
        </div>

        <div className="ws-lp-workflow-grid">
          <div className="ws-lp-step-card">
            <div className="ws-lp-step-number">01</div>
            <h3>Login to WorkSphere AI</h3>
            <p>
              Sign in with your authorized company email to access your personal dashboard
              with real-time schedule and facility status.
            </p>
          </div>

          <div className="ws-lp-step-card">
            <div className="ws-lp-step-number">02</div>
            <h3>Select Facility & Get Recommendations</h3>
            <p>
              Choose your resource type and preferred time. Our Scikit-learn Random Forest model
              ranks optimal slots with zero double-booking conflicts.
            </p>
          </div>

          <div className="ws-lp-step-card">
            <div className="ws-lp-step-number">03</div>
            <h3>Confirm Your Reservation</h3>
            <p>
              Review your slot details, verify attendee limits, and instantly confirm.
              Track your reservation or cancel anytime from My Bookings.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          ABOUT SECTION
          ========================================================= */}
      <section className="ws-lp-section" id="about">
        <div className="ws-lp-about-box">
          <div className="ws-lp-about-text">
            <span className="ws-lp-eyebrow" style={{ color: "var(--ws-cyan-400)" }}>
              ABOUT WORKSPHERE AI
            </span>
            <h3>Intelligent Workplace Resource Management</h3>
            <p>
              WorkSphere AI is an enterprise-grade resource scheduling platform engineered to eliminate
              room contention, optimize physical workspace utilization, and give facilities teams
              predictive insight into facility demand.
            </p>
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>
              Developed with FastAPI, React, MySQL, and Scikit-learn, the system integrates ML-powered
              demand forecasting with transactional database safeguards for 100% reliable reservations.
            </p>
            <Link to="/login" className="ws-lp-btn-primary" style={{ marginTop: "10px" }}>
              Access Employee Portal →
            </Link>
          </div>

          <div className="ws-lp-about-pillars">
            <div className="ws-lp-pillar">
              <strong>✦ Predictive ML Models</strong>
              <span>Random Forest regressor trained on occupancy patterns.</span>
            </div>
            <div className="ws-lp-pillar">
              <strong>✦ 100% Overlap Guard</strong>
              <span>Transactional database locking prevents double-bookings.</span>
            </div>
            <div className="ws-lp-pillar">
              <strong>✦ Role-Based Security</strong>
              <span>Separate JWT-authenticated access for staff and admins.</span>
            </div>
            <div className="ws-lp-pillar">
              <strong>✦ Real-Time Telemetry</strong>
              <span>Live analytics computed directly from MySQL records.</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          COMPACT FOOTER
          ========================================================= */}
      <footer className="ws-lp-footer">
        <div className="ws-lp-footer-content">
          <div className="ws-lp-footer-brand">
            <div className="ws-lp-logo-badge" style={{ width: "28px", height: "28px", fontSize: "14px" }}>W</div>
            <strong style={{ color: "#ffffff", fontSize: "15px" }}>WorkSphere AI</strong>
            <span style={{ fontSize: "12px", color: "#64748b" }}>· Intelligent Workplace Management</span>
          </div>

          <ul className="ws-lp-footer-links">
            <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}>Features</a></li>
            <li><a href="#facilities" onClick={(e) => { e.preventDefault(); scrollToSection("facilities"); }}>Facilities</a></li>
            <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}>Workflow</a></li>
            <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection("about"); }}>About</a></li>
            <li><Link to="/login" style={{ color: "#ffffff", fontWeight: "600" }}>Sign In</Link></li>
            <li><Link to="/login?tab=register" style={{ color: "var(--ws-cyan-400)", fontWeight: "700" }}>Register</Link></li>
          </ul>
        </div>

        <div className="ws-lp-footer-copy">
          © 2026 WorkSphere AI. All rights reserved. Authorized company users only.
        </div>
      </footer>
    </div>
  );
}
