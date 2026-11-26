from database import SessionLocal
from models import Facility


db = SessionLocal()

facilities = [
    Facility(
        name="Meeting Room A",
        type="Meeting Room",
        capacity=10,
        available=True
    ),
    Facility(
        name="Gym",
        type="Gym",
        capacity=20,
        available=True
    ),
    Facility(
        name="Cafeteria",
        type="Cafeteria",
        capacity=50,
        available=True
    ),
    Facility(
        name="Parking Area",
        type="Parking",
        capacity=30,
        available=True
    )
]

db.add_all(facilities)
db.commit()

print("Facilities added successfully!")

db.close()