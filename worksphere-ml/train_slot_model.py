"""
Model Training Script for WorkSphere AI Smart Slot Demand Model.
Trains a RandomForestRegressor on historical workplace utilization features,
evaluates performance metrics (MAE, RMSE, R2), and exports the model via joblib.
"""

import os
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from dataset_generator import generate_historical_booking_data, FEATURE_NAMES

def train_and_evaluate_model():
    print("=" * 60)
    print("WorkSphere AI - Training Smart Slot Demand Prediction Model")
    print("=" * 60)
    
    # 1. Generate historical training dataset
    X, y = generate_historical_booking_data(n_samples=2000, random_state=42)
    print(f"[1/5] Dataset loaded: {X.shape[0]} records with {X.shape[1]} features.")
    
    # 2. Train-test split (80% train, 20% test) to prevent data leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"[2/5] Training split: {len(X_train)} samples, Test split: {len(X_test)} samples.")
    
    # 3. Fit Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    print("[3/5] Random Forest Regressor successfully trained.")
    
    # 4. Evaluate on unseen test set
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print("[4/5] Model Evaluation on Unseen Test Set:")
    print(f"      - Mean Absolute Error (MAE): {mae:.4f}")
    print(f"      - Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f"      - R-squared (R2 Score): {r2:.4f}")
    
    # 5. Persist model and metadata
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(script_dir, "models")
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "slot_demand_model.joblib")
    
    payload = {
        "model": model,
        "features": FEATURE_NAMES,
        "facility_types": ["Meeting Room", "Gym", "Cafeteria", "Parking"],
        "metrics": {
            "mae": round(float(mae), 4),
            "rmse": round(float(rmse), 4),
            "r2": round(float(r2), 4)
        }
    }
    
    joblib.dump(payload, model_path)
    print(f"[5/5] Model saved successfully to: {model_path}")
    print("=" * 60)
    return payload

if __name__ == "__main__":
    train_and_evaluate_model()
