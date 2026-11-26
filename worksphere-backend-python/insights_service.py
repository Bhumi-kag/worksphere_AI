"""
WorkSphere AI - Admin AI Insights Service.
Calculates workplace utilization, booking behaviors, and complaint patterns
strictly from actual database records, generating actionable management insights.
"""

from collections import Counter
from datetime import datetime, date, timedelta, time
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from models import Facility
from booking_model import Booking
from complaint_model import Complaint
from user_model import User

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def generate_admin_insights(db: Session) -> Dict[str, Any]:
    # 1. Fetch raw records
    employees = db.query(User).filter(User.role == "EMPLOYEE").all()
    facilities = db.query(Facility).all()
    bookings = db.query(Booking).all()
    complaints = db.query(Complaint).all()

    total_employees = len(employees)
    total_facilities = len(facilities)
    total_bookings = len(bookings)
    total_complaints = len(complaints)

    active_bookings = [b for b in bookings if b.status != "Cancelled"]
    cancelled_bookings = [b for b in bookings if b.status == "Cancelled"]
    pending_complaints = [c for c in complaints if c.status == "Pending"]
    in_progress_complaints = [c for c in complaints if c.status == "In Progress"]
    resolved_complaints = [c for c in complaints if c.status == "Resolved"]

    facility_dict = {f.id: f for f in facilities}

    # 2. Facility booking distribution
    facility_booking_counts = Counter([b.facility_id for b in bookings])
    facility_utilization_list = []

    for f in facilities:
        booked_count = facility_booking_counts.get(f.id, 0)
        # Approximate utilization index based on total active bookings
        util_pct = round((booked_count / max(1, total_bookings)) * 100, 1) if total_bookings > 0 else 0.0
        facility_utilization_list.append({
            "facility_id": f.id,
            "name": f.name,
            "type": f.type,
            "capacity": f.capacity,
            "available": bool(f.available),
            "booking_count": booked_count,
            "utilization_share_pct": util_pct
        })

    # Sort by booking count descending
    facility_utilization_list.sort(key=lambda x: x["booking_count"], reverse=True)

    most_booked_facility = facility_utilization_list[0] if facility_utilization_list and facility_utilization_list[0]["booking_count"] > 0 else None
    least_booked_facility = facility_utilization_list[-1] if facility_utilization_list and len(facility_utilization_list) > 1 else None

    # 3. Peak booking days
    day_counts = Counter()
    for b in bookings:
        if b.booking_date:
            d = b.booking_date if isinstance(b.booking_date, (date, datetime)) else datetime.strptime(str(b.booking_date)[:10], "%Y-%m-%d").date()
            day_name = DAYS_OF_WEEK[d.weekday()]
            day_counts[day_name] += 1

    most_popular_day = day_counts.most_common(1)[0][0] if day_counts else "No booking records yet"
    day_distribution = [{"day": day, "count": day_counts.get(day, 0)} for day in DAYS_OF_WEEK]

    # 4. Peak booking hours
    hour_counts = Counter()
    for b in bookings:
        if b.start_time:
            if isinstance(b.start_time, (time, datetime)):
                h = b.start_time.hour
            elif isinstance(b.start_time, timedelta):
                h = int(b.start_time.total_seconds()) // 3600
            else:
                parts = str(b.start_time).split(":")
                h = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 10
            hour_counts[h] += 1

    peak_hour = None
    if hour_counts:
        top_hour = hour_counts.most_common(1)[0][0]
        peak_hour = f"{top_hour:02d}:00 – {(top_hour + 1):02d}:00"
    else:
        peak_hour = "No booking records yet"

    # 5. Complaint categories distribution
    complaint_cat_counts = Counter([c.category for c in complaints])
    top_complaint_category = complaint_cat_counts.most_common(1)[0][0] if complaint_cat_counts else "None"
    complaint_distribution = [
        {"category": cat, "count": count} for cat, count in complaint_cat_counts.items()
    ]

    # 6. Actionable AI Recommendations derived from actual numbers
    actionable_suggestions = []

    if most_booked_facility and most_booked_facility["booking_count"] > 0:
        pct = most_booked_facility["utilization_share_pct"]
        actionable_suggestions.append({
            "type": "facility_demand",
            "priority": "High" if pct >= 50 else "Medium",
            "title": f"High Demand on {most_booked_facility['name']}",
            "description": f"{most_booked_facility['name']} accounts for {pct}% of all workplace bookings. Consider adding an additional {most_booked_facility['type'].lower()} resource to relieve peak-time congestion."
        })

    if least_booked_facility and least_booked_facility["booking_count"] == 0:
        actionable_suggestions.append({
            "type": "underutilized_resource",
            "priority": "Low",
            "title": f"Underutilized Resource: {least_booked_facility['name']}",
            "description": f"{least_booked_facility['name']} has zero recorded bookings. Review whether employees need access awareness or if space can be repurposed."
        })

    if len(pending_complaints) > 0:
        actionable_suggestions.append({
            "type": "unresolved_complaints",
            "priority": "High",
            "title": f"{len(pending_complaints)} Pending Complaint(s) Require Action",
            "description": f"There are currently {len(pending_complaints)} open employee complaints. The top category is '{top_complaint_category}'. Review remarks to improve workplace satisfaction."
        })

    if day_counts:
        actionable_suggestions.append({
            "type": "schedule_pattern",
            "priority": "Medium",
            "title": f"Peak Workplace Traffic on {most_popular_day}s",
            "description": f"{most_popular_day} experiences the highest booking volume. Facility maintenance and deep-cleaning should be scheduled on lower-demand days."
        })

    if not actionable_suggestions:
        actionable_suggestions.append({
            "type": "system_notice",
            "priority": "Low",
            "title": "System Active & Initializing Pattern Tracking",
            "description": "Baseline workplace data is loaded. As more employee bookings occur, pattern resolution and precision will continue to scale."
        })

    return {
        "summary": {
            "total_employees": total_employees,
            "total_facilities": total_facilities,
            "total_bookings": total_bookings,
            "active_bookings": len(active_bookings),
            "cancelled_bookings": len(cancelled_bookings),
            "total_complaints": total_complaints,
            "pending_complaints": len(pending_complaints),
            "in_progress_complaints": len(in_progress_complaints),
            "resolved_complaints": len(resolved_complaints),
            "available_facilities": sum(1 for f in facilities if f.available)
        },
        "trends": {
            "most_booked_facility": most_booked_facility["name"] if most_booked_facility else "None",
            "most_booked_facility_type": most_booked_facility["type"] if most_booked_facility else "None",
            "most_popular_day": most_popular_day,
            "peak_booking_hour": peak_hour,
            "top_complaint_category": top_complaint_category
        },
        "facility_utilization": facility_utilization_list,
        "day_distribution": day_distribution,
        "complaint_distribution": complaint_distribution,
        "actionable_suggestions": actionable_suggestions
    }
