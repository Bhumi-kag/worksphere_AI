"""
WorkSphere AI - Backend ML Service Integration.
Bridges FastAPI request handlers with the SmartSlotRecommender and ComplaintCategorizer.
"""

import sys
import os

# Add worksphere-ml to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_dir = os.path.abspath(os.path.join(current_dir, "..", "worksphere-ml"))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

try:
    from recommendation_engine import SmartSlotRecommender
    from complaint_categorizer import ComplaintCategorizer

    slot_recommender = SmartSlotRecommender()
    complaint_categorizer = ComplaintCategorizer()
    print("[ML Service] Smart Slot Recommender and Complaint Categorizer initialized successfully.")
except Exception as e:
    print(f"[ML Service] Error initializing ML components: {e}")
    slot_recommender = None
    complaint_categorizer = None

def get_slot_recommendations(facilities, existing_bookings, facility_type, target_date, attendees, duration_minutes, preferred_window="any"):
    if slot_recommender is None:
        return []
    return slot_recommender.recommend_slots(
        facilities=facilities,
        existing_bookings=existing_bookings,
        facility_type=facility_type,
        target_date=target_date,
        attendees=attendees,
        duration_minutes=duration_minutes,
        preferred_window=preferred_window
    )

def suggest_complaint_category(subject: str, description: str):
    if complaint_categorizer is None:
        return {
            "suggested_category": "Other",
            "confidence": 0.5,
            "method": "fallback",
            "explanation": "ML service unavailable; defaulted to Other."
        }
    return complaint_categorizer.predict(subject, description)
