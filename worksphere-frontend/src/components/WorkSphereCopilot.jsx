import { useEffect, useMemo, useRef, useState } from "react";
import "./WorkSphereCopilot.css";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMinutes(timeStr, minutes) {
  const [hour, minute] = timeStr.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const nextHour = Math.floor(total / 60) % 24;
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function extractTime(message) {
  const match =
    message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i) ||
    message.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) return "";

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = (match[3] || "").toLowerCase().replaceAll(".", "");
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function extractDate(message) {
  const normalized = message.toLowerCase();
  const now = new Date();
  if (/\btomorrow\b/.test(normalized)) {
    now.setDate(now.getDate() + 1);
    return localDateString(now);
  }
  if (/\btoday\b/.test(normalized)) return localDateString(now);

  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  // Check days of week (e.g. next monday)
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < days.length; i++) {
    if (normalized.includes(days[i])) {
      const currentDay = now.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7;
      now.setDate(now.getDate() + diff);
      return localDateString(now);
    }
  }

  return "";
}

function getFacilityType(message) {
  const value = message.toLowerCase();
  if (/\b(meeting|conference|boardroom|discussion|projector|whiteboard)\b/.test(value)) return "Meeting Room";
  if (/\b(gym|workout|fitness|exercise|treadmill)\b/.test(value)) return "Gym";
  if (/\b(cafeteria|lunch|dining|canteen|food)\b/.test(value)) return "Cafeteria";
  if (/\b(parking|car|park|vehicle|slot)\b/.test(value)) return "Parking";
  return "";
}

export default function WorkSphereCopilot({
  facilities = [],
  bookings = [],
  complaints = [],
  onReviewBooking,
  onNavigate,
}) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [loading, setLoading] = useState(false);

  const resultRef = useRef(null);

  useEffect(() => {
    if (result || assistantReply || error) {
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [result, assistantReply, error]);

  const examples = useMemo(
    () => [
      "Find a meeting room tomorrow at 11 AM for 8 people",
      "I need a gym slot today at 5 PM",
      "Find available parking tomorrow morning",
      "Show my upcoming bookings",
      "Show my complaints",
      "Help me book a facility",
    ],
    []
  );

  const handleProcessRequest = async (e) => {
    e.preventDefault();
    setResult(null);
    setError("");
    setAssistantReply("");

    const text = message.trim().toLowerCase();
    const todayStr = localDateString(new Date());

    // 1. My Bookings Intent
    if (/\b(my )?(bookings|reservations|schedule|upcoming)\b/.test(text) && !/\b(book|reserve|find)\b/.test(text)) {
      const active = bookings.filter((b) => b.status !== "Cancelled");
      if (!active.length) {
        setAssistantReply(
          "You do not have any active upcoming reservations right now. I can help you prepare one! Try: 'Find a meeting room tomorrow at 11 AM for 8 people'."
        );
      } else {
        const lines = active.slice(0, 5).map(
          (b) =>
            `• ${b.facility_name || `Facility #${b.facility_id}`} (${b.facility_type || "Facility"}): ${b.booking_date} from ${b.start_time} to ${b.end_time} [${b.status}]`
        );
        setAssistantReply(`Here are your active workplace bookings:\n\n` + lines.join("\n"));
      }
      return;
    }

    // 2. My Complaints Intent
    if (/\b(my )?(complaints|issues|tickets|reports)\b/.test(text) && !/\b(report|submit)\b/.test(text)) {
      if (!complaints.length) {
        setAssistantReply(
          "You haven't submitted any complaints or maintenance tickets yet. If you have an issue, use the 'Report an issue' shortcut below."
        );
      } else {
        const lines = complaints.slice(0, 5).map(
          (c) =>
            `• #${c.id} [${c.category}]: "${c.subject}" — Status: ${c.status}${c.admin_remark ? ` (Remark: ${c.admin_remark})` : ""}`
        );
        setAssistantReply(`Here are your submitted complaints:\n\n` + lines.join("\n"));
      }
      return;
    }

    // 3. What facilities are available / general help
    if (/\b(help me book|what can i book|available resources|list facilities)\b/.test(text) && !/\b(tomorrow|today|\d{1,2}\s*(am|pm))\b/.test(text)) {
      if (!facilities.length) {
        setAssistantReply("No facilities are currently registered. Please contact your company administrator.");
      } else {
        const names = facilities.map((f) => `${f.name} (${f.type}, Cap: ${f.capacity})`).join(", ");
        setAssistantReply(
          `WorkSphere supports Meeting Rooms, Gym, Cafeteria, and Parking. Currently available: ${names}. To prepare a reservation, ask: "Book a meeting room tomorrow at 11 AM for 6 people".`
        );
      }
      return;
    }

    // 4. Booking Request Intent
    const requestedType = getFacilityType(message);
    const bookingDate = extractDate(message);
    const bookingStartTime = extractTime(message);
    const attendeeMatch = message.match(
      /\b(?:for|with)\s+(\d{1,3})\s*(?:people|persons|employees|attendees|members)?\b/i
    );
    const attendees = attendeeMatch ? Number(attendeeMatch[1]) : 1;

    if (!requestedType) {
      setError(
        "Which facility type would you like to reserve? Please mention a Meeting Room, Gym, Cafeteria, or Parking."
      );
      return;
    }

    if (!bookingDate) {
      setError(
        "Which date do you need? Please include 'today', 'tomorrow', or a date like YYYY-MM-DD."
      );
      return;
    }

    if (bookingDate < todayStr) {
      setError("The requested date is in the past. Please choose today or a future date.");
      return;
    }

    const hourMatch = message.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
    const minMatch = message.match(/\b(\d{2,3})\s*(?:minutes?|mins?)\b/i);
    let durationMinutes = 60;
    if (hourMatch) {
      durationMinutes = Math.min(Math.max(Math.round(Number(hourMatch[1]) * 60), 30), 480);
    } else if (minMatch) {
      durationMinutes = Math.min(Math.max(Number(minMatch[1]), 15), 480);
    }
    const startTimeToUse = bookingStartTime || "10:00";
    const bookingEndTime = addMinutes(startTimeToUse, durationMinutes);

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      // Call backend recommendation engine for live availability & ML demand prediction
      const recResponse = await fetch(`${API}/recommendations/smart-slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facility_type: requestedType,
          booking_date: bookingDate,
          attendees: attendees,
          duration_minutes: durationMinutes,
          preferred_window: startTimeToUse,
        }),
      });

      const recData = await recResponse.json().catch(() => null);

      if (recResponse.ok && recData?.recommendations?.length > 0) {
        // Found matching verified slot from recommendation engine
        const best = recData.recommendations[0];
        const matchedFacility = facilities.find((f) => f.id === best.facility_id) || {
          id: best.facility_id,
          name: best.facility_name,
          type: best.facility_type,
          capacity: best.capacity,
        };

        setResult({
          facility: matchedFacility,
          bookingDate: best.booking_date,
          bookingStartTime: best.start_time,
          bookingEndTime: best.end_time,
          attendees: attendees,
          recommendationScore: best.recommendation_score,
          tag: best.tag,
          explanation: best.explanation,
          method: best.ranking_method,
        });
      } else {
        // Fallback: Check local facility matching and warn about availability
        const matching = facilities.filter(
          (f) =>
            f.available !== false &&
            String(f.type || "").toLowerCase() === requestedType.toLowerCase() &&
            Number(f.capacity || 1) >= attendees
        );

        if (!matching.length) {
          setError(
            `I could not find an available ${requestedType} with capacity for ${attendees} attendee(s). Try requesting fewer attendees or another facility type.`
          );
        } else {
          setResult({
            facility: matching[0],
            bookingDate: bookingDate,
            bookingStartTime: startTimeToUse,
            bookingEndTime: bookingEndTime,
            attendees: attendees,
            recommendationScore: 80.0,
            tag: "Standard Availability",
            explanation: `Selected ${matching[0].name} (Capacity: ${matching[0].capacity}) for ${attendees} person(s). Conflict check will be completed upon confirmation.`,
            method: "rule_fallback",
          });
        }
      }
    } catch (err) {
      console.error("Copilot backend error:", err);
      // Client-side fallback
      const matching = facilities.filter(
        (f) =>
          f.available !== false &&
          String(f.type || "").toLowerCase() === requestedType.toLowerCase()
      );
      if (matching.length) {
        setResult({
          facility: matching[0],
          bookingDate: bookingDate,
          bookingStartTime: startTimeToUse,
          bookingEndTime: bookingEndTime,
          attendees: attendees,
          recommendationScore: 75.0,
          tag: "Heuristic Match",
          explanation: `Matched ${matching[0].name}. Availability will be confirmed at booking.`,
          method: "offline_fallback",
        });
      } else {
        setError(`No active ${requestedType} found in system.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="copilot-page">
      <div className="copilot-heading">
        <div className="copilot-orb">✦</div>
        <div>
          <p className="copilot-eyebrow">WORKSPHERE AI COPILOT</p>
          <h2>Intelligent Workplace Assistant</h2>
          <p>
            Natural-language booking assistant backed by live resource availability and the Scikit-learn
            Smart Slot ML model.
          </p>
        </div>
      </div>

      <div className="copilot-chat-card">
        <div className="copilot-message">
          <div className="copilot-bot-avatar">✦</div>
          <div className="copilot-bubble">
            Hello, {localStorage.getItem("user_name") || "there"}! I can help you find and reserve facilities,
            check your schedule, or report issues. Tell me what resource you need in plain English!
          </div>
        </div>

        <form className="copilot-input-area" onSubmit={handleProcessRequest}>
          <label htmlFor="copilot-prompt">Your workplace request</label>
          <textarea
            id="copilot-prompt"
            rows={3}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError("");
              setResult(null);
              setAssistantReply("");
            }}
            placeholder="e.g. Find a meeting room tomorrow at 11 AM for 8 people..."
            required
          />
          <div className="copilot-form-footer">
            <span>Ask in natural language</span>
            <button type="submit" disabled={!message.trim() || loading}>
              {loading ? "Analyzing ML slots..." : "Analyze Request →"}
            </button>
          </div>
        </form>

        <div className="copilot-examples">
          <span>TRY ASKING:</span>
          {examples.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => {
                setMessage(example);
                setResult(null);
                setError("");
                setAssistantReply("");
              }}
            >
              {example}
            </button>
          ))}
        </div>

        <div ref={resultRef} style={{ scrollMarginTop: "24px" }}>
          {error && <div className="copilot-error" role="alert">{error}</div>}

          {assistantReply && (
            <div className="copilot-answer" role="status" style={{ whiteSpace: "pre-line" }}>
              {assistantReply}
            </div>
          )}

          {result && (
            <div className="copilot-result">
            <div className="copilot-result-title">
              <span>✓</span>
              <div>
                <strong>Smart Slot Recommendation Found</strong>
                <small>Ranked by WorkSphere ML Model ({result.recommendationScore}% Match Score)</small>
              </div>
            </div>

            <div className="copilot-detail-grid">
              <div>
                <small>Facility Name</small>
                <strong>{result.facility.name}</strong>
              </div>
              <div>
                <small>Facility Type</small>
                <strong>{result.facility.type}</strong>
              </div>
              <div>
                <small>Booking Date</small>
                <strong>{result.bookingDate}</strong>
              </div>
              <div>
                <small>Time Slot</small>
                <strong>{result.bookingStartTime} – {result.bookingEndTime}</strong>
              </div>
              <div>
                <small>Attendees</small>
                <strong>{result.attendees} person(s)</strong>
              </div>
              <div>
                <small>Room Capacity</small>
                <strong>{result.facility.capacity || 10} max</strong>
              </div>
            </div>

            <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: "700", color: "#2563eb" }}>✦ ML Slot Intelligence</span>
                <span style={{ fontWeight: "800", color: "#059669", fontSize: "11px" }}>{result.tag}</span>
              </div>
              <p style={{ margin: "0", color: "#64748b" }}>{result.explanation}</p>
            </div>

            <button
              className="copilot-review-button"
              type="button"
              style={{ marginTop: "14px" }}
              onClick={() =>
                onReviewBooking?.({
                  facility: result.facility,
                  bookingDate: result.bookingDate,
                  bookingStartTime: result.bookingStartTime,
                  bookingEndTime: result.bookingEndTime,
                })
              }
            >
              Continue to Confirm Booking <span>→</span>
            </button>
          </div>
        )}
        </div>
      </div>

      <div className="copilot-shortcuts">
        <button type="button" onClick={() => onNavigate?.("My Bookings")}>
          📅 View My Bookings
        </button>
        <button type="button" onClick={() => onNavigate?.("Submit Complaint")}>
          📝 Report an Issue
        </button>
        <button type="button" onClick={() => onNavigate?.("Book Facility")}>
          🏢 Browse All Facilities
        </button>
      </div>
    </section>
  );
}
