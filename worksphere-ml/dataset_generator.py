"""
Dataset generator for WorkSphere AI Smart Slot Demand Model.
Synthesizes historical workplace resource utilization patterns
using NumPy and standard Python structures (no pandas dependency).
"""

import numpy as np

FEATURE_NAMES = [
    "facility_type_code",
    "day_of_week",
    "is_weekday",
    "hour_of_day",
    "duration_minutes",
    "capacity",
    "attendees",
    "attendee_capacity_ratio"
]

def generate_historical_booking_data(n_samples: int = 1500, random_state: int = 42):
    rng = np.random.RandomState(random_state)
    
    facility_types = ["Meeting Room", "Gym", "Cafeteria", "Parking"]
    type_map = {name: i for i, name in enumerate(facility_types)}
    
    X_rows = []
    y_values = []
    
    for _ in range(n_samples):
        f_type = rng.choice(facility_types)
        f_type_code = type_map[f_type]
        day_of_week = int(rng.randint(0, 7))  # 0=Mon, 6=Sun
        hour = int(rng.randint(8, 20))        # 8 AM to 7 PM
        duration = int(rng.choice([30, 60, 90, 120]))
        
        # Capacities per facility type
        if f_type == "Meeting Room":
            capacity = int(rng.choice([8, 10, 15, 20]))
            attendees = int(rng.randint(2, capacity + 1))
        elif f_type == "Gym":
            capacity = 30
            attendees = int(rng.randint(1, 15))
        elif f_type == "Cafeteria":
            capacity = 50
            attendees = int(rng.randint(5, 40))
        else:  # Parking
            capacity = 30
            attendees = 1
            
        ratio = attendees / capacity
        is_weekday = 1 if day_of_week < 5 else 0
        base_demand = 0.20
        
        if f_type == "Meeting Room":
            if is_weekday:
                if 10 <= hour <= 12 or 14 <= hour <= 16:
                    base_demand += 0.55
                elif 9 <= hour <= 17:
                    base_demand += 0.35
            else:
                base_demand = 0.08
        elif f_type == "Gym":
            if 17 <= hour <= 19 or 8 <= hour <= 9:
                base_demand += 0.50
            elif 12 <= hour <= 14:
                base_demand += 0.25
        elif f_type == "Cafeteria":
            if 12 <= hour <= 14:
                base_demand += 0.65
            elif 11 <= hour <= 15:
                base_demand += 0.30
        elif f_type == "Parking":
            if is_weekday:
                if 8 <= hour <= 10 or 16 <= hour <= 18:
                    base_demand += 0.60
                elif 10 <= hour <= 16:
                    base_demand += 0.40
            else:
                base_demand = 0.10
                
        if duration >= 90:
            base_demand += 0.05
            
        noise = float(rng.normal(0, 0.04))
        utilization = float(np.clip(base_demand + noise, 0.05, 0.98))
        
        features = [
            f_type_code,
            day_of_week,
            is_weekday,
            hour,
            duration,
            capacity,
            attendees,
            round(ratio, 3)
        ]
        
        X_rows.append(features)
        y_values.append(round(utilization, 3))
        
    X = np.array(X_rows, dtype=np.float32)
    y = np.array(y_values, dtype=np.float32)
    return X, y

if __name__ == "__main__":
    X, y = generate_historical_booking_data()
    print(f"Generated X shape: {X.shape}, y shape: {y.shape}")
    print(f"Sample row: {X[0]}, target utilization: {y[0]}")
