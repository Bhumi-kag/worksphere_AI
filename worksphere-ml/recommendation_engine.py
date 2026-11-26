"""
WorkSphere AI - Smart Slot Recommendation Engine.
Integrates live database facility records & booking constraints with
the trained Scikit-learn Random Forest model to predict slot demand,
filter conflicts, rank optimal slots, and generate explainable recommendations.
"""

import os
import joblib
import numpy as np
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional

TYPE_MAP = {
    "Meeting Room": 0,
    "Gym": 1,
    "Cafeteria": 2,
    "Parking": 3
}

TIME_WINDOWS = {
    "morning": (time(8, 0), time(12, 0)),
    "afternoon": (time(12, 0), time(17, 0)),
    "evening": (time(17, 0), time(21, 0)),
    "any": (time(8, 0), time(20, 0))
}

class SmartSlotRecommender:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(script_dir, "models", "slot_demand_model.joblib")
            
        self.model_path = model_path
        self.model = None
        self.features = None
        self.metrics = {}
        self._load_model()

    def _load_model(self):
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.model = data.get("model")
                self.features = data.get("features")
                self.metrics = data.get("metrics", {})
        except Exception as e:
            print(f"[SmartSlotRecommender] Warning: Could not load ML model ({e}). Using rule-based fallback.")
            self.model = None

    def _is_slot_overlapping(self, slot_start: time, slot_end: time, existing_bookings: List[Any], facility_id: int) -> bool:
        for b in existing_bookings:
            # Check only active bookings for this facility
            b_status = getattr(b, "status", None) or b.get("status") if isinstance(b, dict) else "Booked"
            if b_status == "Cancelled":
                continue
            b_fid = getattr(b, "facility_id", None) if not isinstance(b, dict) else b.get("facility_id")
            if b_fid != facility_id:
                continue

            b_start = getattr(b, "start_time", None) if not isinstance(b, dict) else b.get("start_time")
            b_end = getattr(b, "end_time", None) if not isinstance(b, dict) else b.get("end_time")

            # Convert string or timedelta if needed
            if isinstance(b_start, timedelta):
                total_sec = int(b_start.total_seconds())
                b_start = time(total_sec // 3600, (total_sec % 3600) // 60)
            elif isinstance(b_start, str):
                parts = b_start.split(":")
                b_start = time(int(parts[0]), int(parts[1]))

            if isinstance(b_end, timedelta):
                total_sec = int(b_end.total_seconds())
                b_end = time(total_sec // 3600, (total_sec % 3600) // 60)
            elif isinstance(b_end, str):
                parts = b_end.split(":")
                b_end = time(int(parts[0]), int(parts[1]))

            if slot_start < b_end and slot_end > b_start:
                return True
        return False

    def recommend_slots(
        self,
        facilities: List[Any],
        existing_bookings: List[Any],
        facility_type: str,
        target_date: date,
        attendees: int = 1,
        duration_minutes: int = 60,
        preferred_window: str = "any",
        max_recommendations: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate ranked slot recommendations for the specified date and facility type.
        """
        # 1. Filter facilities by requested type and active status
        matching_facilities = []
        for f in facilities:
            f_type = getattr(f, "type", None) if not isinstance(f, dict) else f.get("type")
            f_avail = getattr(f, "available", True) if not isinstance(f, dict) else f.get("available", True)
            f_cap = getattr(f, "capacity", 1) if not isinstance(f, dict) else f.get("capacity", 1)

            if f_type and f_type.lower() == facility_type.lower() and f_avail:
                if f_cap >= attendees:
                    matching_facilities.append(f)

        if not matching_facilities:
            return []

        # 2. Determine time range boundaries
        window_lower = preferred_window.lower()
        if window_lower in TIME_WINDOWS:
            range_start, range_end = TIME_WINDOWS[window_lower]
        else:
            # Handle specific HH:MM start preference if supplied
            try:
                parts = preferred_window.split(":")
                h = int(parts[0])
                m = int(parts[1]) if len(parts) > 1 else 0
                range_start = time(max(8, min(19, h)), m)
                range_end = time(min(21, range_start.hour + 4), 0)
            except Exception:
                range_start, range_end = TIME_WINDOWS["any"]

        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        is_weekday = 1 if day_of_week < 5 else 0
        f_type_code = TYPE_MAP.get(facility_type, 0)

        # 3. Generate candidate slot intervals (step every 30 minutes)
        candidate_slots = []
        cur_minute = range_start.hour * 60 + range_start.minute
        end_minute = range_end.hour * 60 + range_end.minute

        while cur_minute + duration_minutes <= end_minute:
            s_time = time(cur_minute // 60, cur_minute % 60)
            e_minute = cur_minute + duration_minutes
            e_time = time(e_minute // 60, e_minute % 60)

            for fac in matching_facilities:
                f_id = getattr(fac, "id", None) if not isinstance(fac, dict) else fac.get("id")
                f_name = getattr(fac, "name", None) if not isinstance(fac, dict) else fac.get("name")
                f_cap = getattr(fac, "capacity", 1) if not isinstance(fac, dict) else fac.get("capacity", 1)

                # Hard constraint: strictly skip if overlapping booking exists
                if self._is_slot_overlapping(s_time, e_time, existing_bookings, f_id):
                    continue

                # Capacity fit score (1.0 = exact fit, penalizes excessive unused capacity)
                capacity_fit = min(1.0, attendees / max(1, f_cap))
                ratio = round(attendees / max(1, f_cap), 3)

                # Predict demand / utilization
                pred_utilization = 0.50
                method = "heuristic"

                if self.model is not None:
                    try:
                        feature_vector = np.array([[
                            f_type_code,
                            day_of_week,
                            is_weekday,
                            s_time.hour,
                            duration_minutes,
                            f_cap,
                            attendees,
                            ratio
                        ]], dtype=np.float32)
                        pred = float(self.model.predict(feature_vector)[0])
                        pred_utilization = float(np.clip(pred, 0.05, 0.95))
                        method = "random_forest_ml"
                    except Exception:
                        pass
                else:
                    # Heuristic demand calculation
                    if is_weekday and 10 <= s_time.hour <= 16:
                        pred_utilization = 0.65
                    else:
                        pred_utilization = 0.30

                # Recommendation score calculation (0 - 100):
                # Balances appropriate capacity match (50%) + availability / low congestion (50%)
                congestion_bonus = 1.0 - (pred_utilization * 0.5)
                score = round((0.45 * (0.6 + 0.4 * capacity_fit) + 0.55 * congestion_bonus) * 100, 1)

                # Congestion descriptor
                if pred_utilization < 0.35:
                    demand_level = "Low Demand"
                    tag = "Quiet & Highly Available"
                elif pred_utilization < 0.70:
                    demand_level = "Moderate Demand"
                    tag = "Optimal Balance"
                else:
                    demand_level = "High Demand"
                    tag = "Popular Peak Time"

                explanation = (
                    f"Recommended {f_name} (Capacity: {f_cap}) for {attendees} attendee(s). "
                    f"Predicted demand: {int(pred_utilization * 100)}% ({demand_level}). "
                    f"Slot is fully verified available."
                )

                candidate_slots.append({
                    "facility_id": f_id,
                    "facility_name": f_name,
                    "facility_type": facility_type,
                    "capacity": f_cap,
                    "booking_date": target_date.isoformat(),
                    "start_time": s_time.strftime("%H:%M"),
                    "end_time": e_time.strftime("%H:%M"),
                    "duration_minutes": duration_minutes,
                    "attendees": attendees,
                    "predicted_utilization": round(pred_utilization, 2),
                    "demand_level": demand_level,
                    "tag": tag,
                    "recommendation_score": score,
                    "explanation": explanation,
                    "ranking_method": method
                })

            cur_minute += 30

        # Sort candidate slots by recommendation score descending
        candidate_slots.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return candidate_slots[:max_recommendations]

if __name__ == "__main__":
    recommender = SmartSlotRecommender()
    dummy_facilities = [
        {"id": 1, "name": "Meeting Room 1", "type": "Meeting Room", "capacity": 10, "available": True},
        {"id": 2, "name": "Executive Boardroom", "type": "Meeting Room", "capacity": 25, "available": True},
        {"id": 3, "name": "Gym", "type": "Gym", "capacity": 30, "available": True},
    ]
    dummy_bookings = [
        {"id": 1, "facility_id": 1, "start_time": time(10, 0), "end_time": time(11, 0), "status": "Booked"}
    ]
    recs = recommender.recommend_slots(
        facilities=dummy_facilities,
        existing_bookings=dummy_bookings,
        facility_type="Meeting Room",
        target_date=date.today(),
        attendees=8,
        preferred_window="morning"
    )
    print(f"Generated {len(recs)} recommendations:")
    for r in recs:
        print(f" - {r['facility_name']} at {r['start_time']}-{r['end_time']}: Score {r['recommendation_score']} | {r['tag']}")
