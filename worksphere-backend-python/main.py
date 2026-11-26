import os
from datetime import date, datetime
from typing import List

import bcrypt
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import Facility
from booking_model import Booking
from complaint_model import Complaint
from user_model import User

from booking_schema import BookingCreate, SlotRecommendationRequest
from complaint_schema import ComplaintCreate, ComplaintStatusUpdate, ComplaintSuggestionRequest
from facility_schema import FacilityCreate, FacilityUpdate
from login_schema import LoginRequest
from user_schema import UserRegister, EmployeeUpdate, PasswordChangeRequest

from auth import create_access_token, verify_access_token
import ml_service
import insights_service

# --------------------------------------------------
# CREATE DATABASE TABLES
# --------------------------------------------------
Base.metadata.create_all(bind=engine)

# --------------------------------------------------
# CREATE FASTAPI APPLICATION
# --------------------------------------------------
app = FastAPI(
    title="WorkSphere AI - Workplace Resource Management System",
    description="Intelligent workplace resource scheduling, facility management, complaint routing, and AI-driven utilization analytics.",
    version="2.0.0"
)

# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------
origins_env = os.getenv("CORS_ORIGINS", "")
if origins_env:
    allowed_origins = [orig.strip() for orig in origins_env.split(",") if orig.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# --------------------------------------------------
# AUTHENTICATION DEPENDENCIES
# --------------------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    user_id = verify_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user account does not exist."
        )
    return user

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource."
        )
    return current_user

# --------------------------------------------------
# HEALTH & BASE ROUTES
# --------------------------------------------------
@app.get("/")
def home():
    return {
        "status": "online",
        "app": "WorkSphere AI",
        "version": "2.0.0",
        "features": [
            "Smart Slot ML Recommendation",
            "Workplace Resource Management",
            "NLP Complaint Categorization",
            "Admin AI Insights"
        ]
    }

@app.get("/test-db")
def test_database(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "message": "MySQL database connection healthy and verified."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection error: {str(e)}"
        )

# --------------------------------------------------
# AUTHENTICATION ENDPOINTS
# --------------------------------------------------
@app.post("/login")
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    password_match = bcrypt.checkpw(
        login_data.password.encode("utf-8"),
        user.password.encode("utf-8")
    )

    if not password_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    access_token = create_access_token(user.id)
    return {
        "message": "Login successful!",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    # 1. Check if email already registered
    existing_email = db.query(User).filter(User.email == user_data.email.strip()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee account with this email address already exists. Please log in."
        )

    # 2. Check if phone already registered
    existing_phone = db.query(User).filter(User.phone == user_data.phone.strip()).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee account with this phone number already exists."
        )

    # 3. Hash password
    hashed_password = bcrypt.hashpw(
        user_data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # 4. Create new employee
    new_user = User(
        name=user_data.name.strip(),
        email=user_data.email.strip(),
        phone=user_data.phone.strip(),
        password=hashed_password,
        role="EMPLOYEE"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(new_user.id)
    return {
        "message": f"Account created successfully for {new_user.name}! Welcome to WorkSphere AI.",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role
    }

@app.post("/auth/change-password")
def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not bcrypt.checkpw(data.current_password.encode("utf-8"), current_user.password.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect."
        )

    # Hash new password
    hashed_new = bcrypt.hashpw(
        data.new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    current_user.password = hashed_new
    db.commit()

    return {
        "message": "Password changed successfully! Please keep your new credentials secure."
    }

@app.get("/auth/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role
    }

@app.put("/auth/profile")
def update_my_profile(
    data: EmployeeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email_exists = db.query(User).filter(
        User.email == data.email.strip(),
        User.id != current_user.id
    ).first()
    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already used by another account."
        )

    phone_exists = db.query(User).filter(
        User.phone == data.phone.strip(),
        User.id != current_user.id
    ).first()
    if phone_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is already used by another account."
        )

    current_user.name = data.name.strip()
    current_user.email = data.email.strip()
    current_user.phone = data.phone.strip()
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully!",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "role": current_user.role
        }
    }

# --------------------------------------------------
# FACILITIES ENDPOINTS (EMPLOYEE & PUBLIC)
# --------------------------------------------------
@app.get("/facilities")
def get_facilities(db: Session = Depends(get_db)):
    facilities = db.query(Facility).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "type": f.type,
            "capacity": f.capacity,
            "available": bool(f.available)
        }
        for f in facilities
    ]

# --------------------------------------------------
# BOOKINGS ENDPOINTS (EMPLOYEE)
# --------------------------------------------------
@app.post("/bookings", status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate booking time window
    if booking_data.start_time >= booking_data.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be later than start time."
        )

    # 2. Prevent past dates
    today = date.today()
    if booking_data.booking_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking date cannot be in the past."
        )

    # 3. Retrieve facility and check availability
    facility = db.query(Facility).filter(Facility.id == booking_data.facility_id).first()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected facility was not found."
        )

    if not facility.available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Facility '{facility.name}' is currently unavailable for reservations."
        )

    # 4. Check capacity
    attendees = booking_data.attendees or 1
    if attendees > facility.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested attendees ({attendees}) exceeds maximum capacity of {facility.name} ({facility.capacity})."
        )

    # 5. Concurrency & Overlap Prevention (Immediate check before commit)
    overlapping_booking = db.query(Booking).filter(
        Booking.facility_id == booking_data.facility_id,
        Booking.booking_date == booking_data.booking_date,
        Booking.start_time < booking_data.end_time,
        Booking.end_time > booking_data.start_time,
        Booking.status == "Booked"
    ).first()

    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This facility is already reserved by another employee for the selected time slot."
        )

    # 6. Save booking using authenticated user identity
    new_booking = Booking(
        user_id=current_user.id,
        user_name=current_user.name,
        facility_id=facility.id,
        booking_date=booking_data.booking_date,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        status="Booked"
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    return {
        "message": "Booking created successfully!",
        "booking_id": new_booking.id,
        "facility_name": facility.name,
        "booking_date": str(new_booking.booking_date),
        "start_time": str(new_booking.start_time),
        "end_time": str(new_booking.end_time),
        "status": new_booking.status
    }

@app.get("/bookings")
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Join with facility to include facility_name and facility_type
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.booking_date.desc(), Booking.start_time.desc())
        .all()
    )

    result = []
    for b in bookings:
        fac = db.query(Facility).filter(Facility.id == b.facility_id).first()
        result.append({
            "id": b.id,
            "user_id": b.user_id,
            "user_name": b.user_name,
            "facility_id": b.facility_id,
            "facility_name": fac.name if fac else f"Facility #{b.facility_id}",
            "facility_type": fac.type if fac else "Facility",
            "capacity": fac.capacity if fac else None,
            "booking_date": str(b.booking_date),
            "start_time": str(b.start_time),
            "end_time": str(b.end_time),
            "status": b.status
        })

    return result

@app.delete("/bookings/{booking_id}")
def cancel_booking(
    booking_id: int,
    permanent: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking record not found or unauthorized to modify."
        )

    if permanent:
        db.delete(booking)
        db.commit()
        return {
            "message": f"Booking #{booking_id} deleted permanently.",
            "booking_id": booking_id
        }

    if booking.status == "Cancelled":
        return {
            "message": "Booking is already cancelled.",
            "booking_id": booking.id
        }

    booking.status = "Cancelled"
    db.commit()

    return {
        "message": "Booking cancelled successfully!",
        "booking_id": booking.id
    }

# --------------------------------------------------
# SMART SLOT RECOMMENDATION (AI / ML)
# --------------------------------------------------
@app.post("/recommendations/smart-slots")
def recommend_smart_slots(
    payload: SlotRecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate date
    if payload.booking_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recommendation date cannot be in the past."
        )

    # 1. Fetch live facilities
    facilities = db.query(Facility).filter(Facility.available == True).all()
    
    # 2. Fetch existing active bookings for that date
    existing_bookings = db.query(Booking).filter(
        Booking.booking_date == payload.booking_date,
        Booking.status == "Booked"
    ).all()

    # 3. Call ML recommender service
    recommendations = ml_service.get_slot_recommendations(
        facilities=facilities,
        existing_bookings=existing_bookings,
        facility_type=payload.facility_type,
        target_date=payload.booking_date,
        attendees=payload.attendees or 1,
        duration_minutes=payload.duration_minutes or 60,
        preferred_window=payload.preferred_window or "any"
    )

    return {
        "facility_type": payload.facility_type,
        "booking_date": str(payload.booking_date),
        "attendees": payload.attendees,
        "count": len(recommendations),
        "recommendations": recommendations
    }

# --------------------------------------------------
# COMPLAINT CATEGORIZATION (AI / NLP)
# --------------------------------------------------
@app.post("/ai/categorize-complaint")
def categorize_complaint(
    payload: ComplaintSuggestionRequest,
    current_user: User = Depends(get_current_user)
):
    result = ml_service.suggest_complaint_category(
        subject=payload.subject,
        description=payload.description
    )
    return result

# --------------------------------------------------
# COMPLAINTS ENDPOINTS (EMPLOYEE)
# --------------------------------------------------
@app.post("/complaints", status_code=status.HTTP_201_CREATED)
def submit_complaint(
    complaint_data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = Complaint(
        user_id=current_user.id,
        user_name=current_user.name,
        category=complaint_data.category,
        subject=complaint_data.subject.strip(),
        description=complaint_data.description.strip(),
        status="Pending"
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    return {
        "message": "Complaint submitted successfully!",
        "complaint_id": complaint.id
    }

@app.get("/complaints")
def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaints = (
        db.query(Complaint)
        .filter(Complaint.user_id == current_user.id)
        .order_by(Complaint.id.desc())
        .all()
    )

    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "user_name": c.user_name,
            "category": c.category,
            "subject": c.subject,
            "description": c.description,
            "status": c.status,
            "admin_remark": c.admin_remark,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in complaints
    ]

@app.delete("/complaints/{complaint_id}")
def delete_my_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found."
        )

    if complaint.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own complaints."
        )

    db.delete(complaint)
    db.commit()
    return {"message": f"Complaint #{complaint_id} deleted successfully."}

# --------------------------------------------------
# ADMIN - DASHBOARD OVERVIEW & AI INSIGHTS
# --------------------------------------------------
@app.get("/admin/dashboard-stats")
def get_admin_dashboard_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_employees = db.query(User).filter(User.role == "EMPLOYEE").count()
    total_facilities = db.query(Facility).count()
    available_facilities = db.query(Facility).filter(Facility.available == True).count()
    total_bookings = db.query(Booking).count()
    active_bookings = db.query(Booking).filter(Booking.status == "Booked").count()
    pending_complaints = db.query(Complaint).filter(Complaint.status == "Pending").count()

    return {
        "total_employees": total_employees,
        "total_facilities": total_facilities,
        "available_facilities": available_facilities,
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "pending_complaints": pending_complaints
    }

@app.get("/admin/ai-insights")
def get_admin_ai_insights(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return insights_service.generate_admin_insights(db)

# --------------------------------------------------
# ADMIN - EMPLOYEE MANAGEMENT
# --------------------------------------------------
@app.get("/admin/employees")
def get_all_employees(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    employees = db.query(User).filter(User.role == "EMPLOYEE").order_by(User.id.desc()).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "phone": e.phone,
            "role": e.role
        }
        for e in employees
    ]

@app.post("/admin/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    user_data: UserRegister,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee account with this email already exists."
        )

    if db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee account with this phone number already exists."
        )

    hashed_password = bcrypt.hashpw(
        user_data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    new_emp = User(
        name=user_data.name.strip(),
        email=user_data.email.strip(),
        phone=user_data.phone.strip(),
        password=hashed_password,
        role="EMPLOYEE"
    )

    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)

    return {
        "message": f"Employee account created successfully for {new_emp.name}!",
        "employee_id": new_emp.id,
        "name": new_emp.name,
        "email": new_emp.email,
        "phone": new_emp.phone,
        "role": new_emp.role
    }

@app.put("/admin/employees/{employee_id}")
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    emp = db.query(User).filter(User.id == employee_id, User.role == "EMPLOYEE").first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Check email duplicate
    email_exists = db.query(User).filter(User.email == data.email, User.id != employee_id).first()
    if email_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already used by another account.")

    # Check phone duplicate
    phone_exists = db.query(User).filter(User.phone == data.phone, User.id != employee_id).first()
    if phone_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is already used by another account.")

    emp.name = data.name.strip()
    emp.email = data.email.strip()
    emp.phone = data.phone.strip()
    db.commit()

    return {
        "message": f"Employee details for {emp.name} updated successfully.",
        "employee_id": emp.id
    }

@app.delete("/admin/employees/{employee_id}")
def delete_employee(
    employee_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    emp = db.query(User).filter(User.id == employee_id, User.role == "EMPLOYEE").first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Prevent deleting admin or oneself
    if emp.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account.")

    # Check if employee has active bookings
    active_b = db.query(Booking).filter(Booking.user_id == employee_id, Booking.status == "Booked").first()
    if active_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete employee with active facility reservations. Please cancel their bookings first."
        )

    db.delete(emp)
    db.commit()

    return {
        "message": f"Employee account for {emp.name} removed successfully.",
        "employee_id": employee_id
    }

# --------------------------------------------------
# ADMIN - FACILITY MANAGEMENT
# --------------------------------------------------
@app.get("/admin/facilities")
def get_admin_facilities(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    facilities = db.query(Facility).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "type": f.type,
            "capacity": f.capacity,
            "available": bool(f.available)
        }
        for f in facilities
    ]

@app.post("/admin/facilities", status_code=status.HTTP_201_CREATED)
def create_facility(
    facility_data: FacilityCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_f = Facility(
        name=facility_data.name.strip(),
        type=facility_data.type.strip(),
        capacity=facility_data.capacity,
        available=facility_data.available
    )
    db.add(new_f)
    db.commit()
    db.refresh(new_f)

    return {
        "message": "Facility created successfully!",
        "facility_id": new_f.id
    }

@app.put("/admin/facilities/{facility_id}")
def update_facility(
    facility_id: int,
    facility_data: FacilityUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")

    facility.name = facility_data.name.strip()
    facility.type = facility_data.type.strip()
    facility.capacity = facility_data.capacity
    facility.available = facility_data.available

    db.commit()
    return {
        "message": "Facility updated successfully!",
        "facility_id": facility.id
    }

@app.delete("/admin/facilities/{facility_id}")
def delete_facility(
    facility_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")

    # Check active bookings
    active_b = db.query(Booking).filter(Booking.facility_id == facility_id, Booking.status == "Booked").first()
    if active_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete facility with active bookings. Please cancel or reassign existing reservations first."
        )

    db.delete(facility)
    db.commit()
    return {
        "message": "Facility deleted successfully!",
        "facility_id": facility_id
    }

# --------------------------------------------------
# ADMIN - BOOKING MANAGEMENT
# --------------------------------------------------
@app.get("/admin/bookings")
def get_all_bookings_admin(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).order_by(Booking.id.desc()).all()
    result = []
    for b in bookings:
        fac = db.query(Facility).filter(Facility.id == b.facility_id).first()
        emp = db.query(User).filter(User.id == b.user_id).first()
        result.append({
            "id": b.id,
            "user_id": b.user_id,
            "user_name": b.user_name or (emp.name if emp else "Unknown"),
            "user_email": emp.email if emp else None,
            "facility_id": b.facility_id,
            "facility_name": fac.name if fac else f"Facility #{b.facility_id}",
            "facility_type": fac.type if fac else "Facility",
            "booking_date": str(b.booking_date),
            "start_time": str(b.start_time),
            "end_time": str(b.end_time),
            "status": b.status
        })
    return result

@app.patch("/admin/bookings/{booking_id}/cancel")
def admin_cancel_booking(
    booking_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking record not found.")

    if booking.status == "Cancelled":
        return {
            "message": "Booking is already cancelled.",
            "booking_id": booking.id
        }

    booking.status = "Cancelled"
    db.commit()
    return {
        "message": f"Booking #{booking.id} cancelled successfully by administrator.",
        "booking_id": booking.id
    }

# --------------------------------------------------
# ADMIN - COMPLAINT MANAGEMENT
# --------------------------------------------------
@app.get("/admin/complaints")
def get_all_complaints_admin(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    complaints = db.query(Complaint).order_by(Complaint.id.desc()).all()
    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "user_name": c.user_name,
            "category": c.category,
            "subject": c.subject,
            "description": c.description,
            "status": c.status,
            "admin_remark": c.admin_remark,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in complaints
    ]

@app.patch("/admin/complaints/{complaint_id}")
def update_complaint_status_admin(
    complaint_id: int,
    data: ComplaintStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint record not found.")

    complaint.status = data.status
    complaint.admin_remark = data.admin_remark.strip() if data.admin_remark else None
    db.commit()

    return {
        "message": "Complaint updated successfully!",
        "complaint_id": complaint.id,
        "status": complaint.status
    }
