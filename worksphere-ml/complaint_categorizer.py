"""
WorkSphere AI - Complaint Categorization Engine.
Hybrid architecture:
1. Pre-trained TF-IDF Logistic Regression text classifier.
2. Rule-based / keyword fallback matcher for domain-specific workplace terms.
Transparently identifies classification method, confidence, and explanation.
"""

import os
import joblib

KEYWORD_MAP = {
    "Facility Issue": [
        "projector", "screen", "whiteboard", "hdmi", "monitor", "display",
        "audio", "microphone", "speaker", "camera", "smart board", "conference room setup"
    ],
    "Booking Issue": [
        "booking", "booked", "reservation", "reserving", "double booking",
        "overlap", "conflict", "cancel", "slot occupied", "calendar"
    ],
    "Cleanliness": [
        "clean", "dirty", "trash", "dust", "vacuum", "spill", "sanitiz",
        "restroom", "stain", "odor", "smell", "sink", "crumbs", "hygiene"
    ],
    "Maintenance": [
        "leak", "water", "ac", "air condition", "cooling", "heating", "hvac",
        "thermostat", "light", "flicker", "broken", "repair", "treadmill",
        "elevator", "socket", "spark", "hinge", "door jammed"
    ],
    "Parking Issue": [
        "parking", "parked", "car", "vehicle", "slot p-", "gate barrier",
        "rfid", "ev charger", "driveway", "underground", "ramp"
    ]
}

class ComplaintCategorizer:
    def __init__(self, model_path=None):
        if model_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(script_dir, "models", "complaint_classifier.joblib")
            
        self.model_path = model_path
        self.pipeline = None
        self.categories = [
            "Facility Issue",
            "Booking Issue",
            "Cleanliness",
            "Maintenance",
            "Parking Issue",
            "Other"
        ]
        self._load_model()

    def _load_model(self):
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.pipeline = data.get("pipeline")
                self.categories = data.get("categories", self.categories)
        except Exception as e:
            print(f"[ComplaintCategorizer] Warning: Could not load ML model ({e}). Using keyword fallback.")
            self.pipeline = None

    def _keyword_classify(self, text: str):
        text_lower = text.lower()
        scores = {}
        for cat, keywords in KEYWORD_MAP.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > 0:
                scores[cat] = count
                
        if scores:
            best_cat = max(scores, key=scores.get)
            confidence = min(0.95, 0.65 + 0.10 * scores[best_cat])
            return best_cat, confidence, "Keyword-based workplace heuristic match"
            
        return "Other", 0.50, "Default fallback category"

    def predict(self, subject: str, description: str):
        full_text = f"{subject.strip()} {description.strip()}".strip()
        if not full_text:
            return {
                "suggested_category": "Other",
                "confidence": 0.0,
                "method": "fallback",
                "explanation": "No description provided."
            }

        # 1. Try ML model if loaded
        if self.pipeline is not None:
            try:
                probs = self.pipeline.predict_proba([full_text])[0]
                classes = self.pipeline.classes_
                best_idx = probs.argmax()
                ml_cat = str(classes[best_idx])
                ml_conf = float(probs[best_idx])

                # If ML confidence is good (>= 0.40), use it
                if ml_conf >= 0.40:
                    return {
                        "suggested_category": ml_cat,
                        "confidence": round(ml_conf, 2),
                        "method": "ml_classifier",
                        "explanation": f"Predicted via TF-IDF + LogisticRegression text model ({int(ml_conf * 100)}% confidence)."
                    }
            except Exception:
                pass

        # 2. Transparent fallback to keyword heuristic
        kw_cat, kw_conf, kw_expl = self._keyword_classify(full_text)
        return {
            "suggested_category": kw_cat,
            "confidence": round(kw_conf, 2),
            "method": "keyword_heuristic",
            "explanation": f"{kw_expl} (transparent fallback)."
        }

if __name__ == "__main__":
    categorizer = ComplaintCategorizer()
    tests = [
        ("AC leaking", "Water is dripping from the air conditioner ceiling vent."),
        ("Double reservation", "Someone else is in Meeting Room A for my booked slot."),
        ("Spilled drink", "There is sticky coffee on the table and trash is full."),
        ("EV charger", "Car charging station in parking slot 12 is offline."),
        ("Question", "What is the policy for vendor lunch passes?"),
    ]
    for sub, desc in tests:
        res = categorizer.predict(sub, desc)
        print(f"'{sub}' -> {res['suggested_category']} ({res['method']}, conf: {res['confidence']})")
