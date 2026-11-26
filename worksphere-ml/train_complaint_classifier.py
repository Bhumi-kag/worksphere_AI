"""
Model Training Script for WorkSphere AI Complaint Categorization.
Trains a TF-IDF + LogisticRegression text classifier on workplace complaints,
evaluates performance metrics, and exports the model via joblib.
"""

import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

TRAINING_DATA = [
    # Facility Issue
    ("Projector not working in meeting room", "Facility Issue"),
    ("Conference room display monitor keeps flickering and turns off", "Facility Issue"),
    ("Whiteboard markers are missing and screen won't connect", "Facility Issue"),
    ("The smart board in meeting room B is unresponsive to touch", "Facility Issue"),
    ("HDMI cable damaged in boardroom and no adapter available", "Facility Issue"),
    ("Microphone and speaker system has loud audio static", "Facility Issue"),
    ("Video conferencing camera not detected during client call", "Facility Issue"),
    ("Meeting room A audio system does not connect via Bluetooth", "Facility Issue"),
    ("Door lock on conference room 3 is jammed shut", "Facility Issue"),
    ("Power outlets at the meeting table are not providing power", "Facility Issue"),

    # Booking Issue
    ("Double booking for meeting room at 10 AM", "Booking Issue"),
    ("My reservation was overwritten by another team", "Booking Issue"),
    ("Cannot cancel booking on the portal despite being in advance", "Booking Issue"),
    ("Booking calendar shows slot occupied but room is empty", "Booking Issue"),
    ("Conflict in schedule for cafeteria reservation", "Booking Issue"),
    ("Unable to book gym slot for tomorrow evening", "Booking Issue"),
    ("System gave booking confirmation but slot does not appear in My Bookings", "Booking Issue"),
    ("Incorrect date displayed on booking confirmation receipt", "Booking Issue"),
    ("Two different employees assigned the same parking spot today", "Booking Issue"),
    ("Cannot reserve slot due to session timeout error", "Booking Issue"),

    # Cleanliness
    ("Cafeteria tables are dirty and sticky after lunch", "Cleanliness"),
    ("Dust on desks and meeting room chairs need vacuuming", "Cleanliness"),
    ("Trash bins in pantry are overflowing and smell bad", "Cleanliness"),
    ("Spilled coffee on conference room carpet not cleaned up", "Cleanliness"),
    ("Restroom on second floor requires immediate sanitization", "Cleanliness"),
    ("Pantry sink is blocked with food waste", "Cleanliness"),
    ("Gym mats are not disinfected and have bad odor", "Cleanliness"),
    ("Food crumbs and stains on boardroom table", "Cleanliness"),
    ("Drinking water dispenser tray is dirty and overflowing", "Cleanliness"),
    ("Window blinds in office corner are very dusty", "Cleanliness"),

    # Maintenance
    ("Air conditioning unit is leaking water on the floor", "Maintenance"),
    ("Room temperature is too hot, HVAC AC cooling is not working", "Maintenance"),
    ("Ceiling light is flickering constantly causing eye strain", "Maintenance"),
    ("Water leakage in ceiling above workspace desk 14", "Maintenance"),
    ("Gym treadmill display error and belt is slipping", "Maintenance"),
    ("Elevator 2 making grinding noise and stopping unevenly", "Maintenance"),
    ("Door hinge is broken and makes loud squeaking noise", "Maintenance"),
    ("Electrical socket sparking when plug inserted", "Maintenance"),
    ("Water pressure in pantry tap is extremely low", "Maintenance"),
    ("Thermostat panel broken and cannot adjust heating", "Maintenance"),

    # Parking Issue
    ("Someone parked in my reserved parking spot P-14", "Parking Issue"),
    ("Parking gate barrier arm not opening with RFID card", "Parking Issue"),
    ("No visitor parking spaces available in basement", "Parking Issue"),
    ("Vehicle blocking the exit ramp in underground parking lot", "Parking Issue"),
    ("Parking sensor indicator light showing green when occupied", "Parking Issue"),
    ("Electric vehicle EV charging station not charging car", "Parking Issue"),
    ("Pothole near the parking entrance basement driveway", "Parking Issue"),
    ("Parking ticket machine out of receipt paper", "Parking Issue"),
    ("Unauthorized car parked in designated management slot", "Parking Issue"),
    ("Lighting is out in parking section B making it dangerous", "Parking Issue"),

    # Other
    ("Request for additional office stationery and sticky notes", "Other"),
    ("Inquiry regarding upcoming office relocation schedule", "Other"),
    ("General feedback about office coffee quality in pantry", "Other"),
    ("Requesting visitor pass policy clarification for vendors", "Other"),
    ("Noise levels from neighboring construction site", "Other"),
    ("Lost my access badge somewhere in office lobby", "Other"),
    ("Suggestion for plants and ergonomics in collaborative area", "Other"),
    ("Question about cafeteria lunch menu schedule", "Other"),
    ("Lost property blue jacket left in cafeteria yesterday", "Other"),
    ("Feedback on workplace temperature policy", "Other"),
]

def train_and_evaluate_complaint_classifier():
    print("=" * 60)
    print("WorkSphere AI - Training Complaint Categorization NLP Classifier")
    print("=" * 60)

    texts = [item[0] for item in TRAINING_DATA]
    labels = [item[1] for item in TRAINING_DATA]

    print(f"[1/4] Loaded {len(texts)} annotated complaint descriptions.")
    
    # Train / test split with stratify to keep class distribution
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.25, random_state=42, stratify=labels
    )
    
    # Pipeline: TF-IDF n-grams + Logistic Regression
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ("clf", LogisticRegression(C=5.0, max_iter=200, random_state=42))
    ])
    
    print("[2/4] Fitting TF-IDF Vectorizer and Logistic Regression...")
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[3/4] Evaluation on Held-out Test Set:")
    print(f"      - Overall Accuracy: {acc * 100:.1f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    
    # Retrain on full dataset for maximum deployment coverage
    pipeline.fit(texts, labels)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(script_dir, "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "complaint_classifier.joblib")
    
    payload = {
        "pipeline": pipeline,
        "categories": [
            "Facility Issue",
            "Booking Issue",
            "Cleanliness",
            "Maintenance",
            "Parking Issue",
            "Other"
        ],
        "accuracy": round(float(acc), 4)
    }
    
    joblib.dump(payload, model_path)
    print(f"[4/4] Model saved successfully to: {model_path}")
    print("=" * 60)
    return payload

if __name__ == "__main__":
    train_and_evaluate_complaint_classifier()
