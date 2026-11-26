"""
WorkSphere AI - Complete System Test Suite.
Validates Authentication, Booking Constraints, ML Slot Recommendations,
NLP Complaint Categorization, Admin Insights, and Database Integrity.
"""

import sys
import os
from datetime import date, time, timedelta

# Add backend and ML to path
base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(base_dir, "worksphere-backend-python")
ml_dir = os.path.join(base_dir, "worksphere-ml")
sys.path.insert(0, backend_dir)
sys.path.insert(0, ml_dir)

import bcrypt
from fastapi import HTTPException
from database import SessionLocal
import main
from booking_schema import BookingCreate, SlotRecommendationRequest
from complaint_schema import ComplaintCreate, ComplaintStatusUpdate, ComplaintSuggestionRequest
from login_schema import LoginRequest
from user_schema import UserRegister, EmployeeUpdate, PasswordChangeRequest

def run_tests():
    print("=" * 70)
    print("         WORKSPHERE AI - SYSTEM INTEGRATION & VERIFICATION TEST")
    print("=" * 70)

    db = SessionLocal()
    passed = 0
    failed = 0

    def assert_test(condition, name, detail=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"[PASS] {name} {f'({detail})' if detail else ''}")
        else:
            failed += 1
            print(f"[FAIL] {name} {f'({detail})' if detail else ''}")

    # ---------------------------------------------------------
    # 1. DATABASE & USERS TEST
    # ---------------------------------------------------------
    print("\n--- 1. Database & User Records Verification ---")
    admin_user = db.query(main.User).filter(main.User.role == "ADMIN").first()
    assert_test(admin_user is not None, "Admin user exists in database", f"Admin: {admin_user.email if admin_user else 'None'}")

    emp_user = db.query(main.User).filter(main.User.role == "EMPLOYEE").first()
    assert_test(emp_user is not None, "Employee user exists in database", f"Employee: {emp_user.email if emp_user else 'None'}")

    facilities = db.query(main.Facility).all()
    assert_test(len(facilities) >= 4, "All standard workplace facility types present", f"Count: {len(facilities)}")

    # ---------------------------------------------------------
    # 2. AUTHENTICATION & ROLE-BASED ACCESS CONTROL
    # ---------------------------------------------------------
    print("\n--- 2. Authentication & Access Control Tests ---")
    # Test valid employee login
    try:
        # Check password hash for admin or employee
        login_res = main.login_user(LoginRequest(email=admin_user.email, password="wrongpassword"), db=db)
        assert_test(False, "Invalid login should fail")
    except HTTPException as e:
        assert_test(e.status_code == 401, "Invalid password rejected with HTTP 401")

    # Verify admin role check
    try:
        main.get_current_admin(current_user=emp_user)
        assert_test(False, "Employee should not pass admin role check")
    except HTTPException as e:
        assert_test(e.status_code == 403, "Employee blocked from admin route with HTTP 403")

    admin_verified = main.get_current_admin(current_user=admin_user)
    assert_test(admin_verified.id == admin_user.id, "Admin passed admin role check")

    # ---------------------------------------------------------
    # 3. BOOKING CONSTRAINTS & RELIABILITY TESTS
    # ---------------------------------------------------------
    print("\n--- 3. Booking Reliability & Validation Tests ---")
    today = date.today()
    future_date = today + timedelta(days=7)

    # Test A: End time earlier than start time
    try:
        main.create_booking(
            BookingCreate(facility_id=1, booking_date=future_date, start_time=time(14, 0), end_time=time(13, 0)),
            current_user=emp_user,
            db=db
        )
        assert_test(False, "End time earlier than start time should fail")
    except HTTPException as e:
        assert_test(e.status_code == 400, "Inverted time window rejected with HTTP 400")

    # Test B: Past booking date
    try:
        main.create_booking(
            BookingCreate(facility_id=1, booking_date=date(2021, 5, 1), start_time=time(10, 0), end_time=time(11, 0)),
            current_user=emp_user,
            db=db
        )
        assert_test(False, "Past date should fail")
    except HTTPException as e:
        assert_test(e.status_code == 400, "Past date rejected with HTTP 400")

    # Test C: Exceeding facility capacity
    fac1 = db.query(main.Facility).filter(main.Facility.id == 1).first()
    max_cap = fac1.capacity if fac1 else 10
    try:
        main.create_booking(
            BookingCreate(facility_id=1, booking_date=future_date, start_time=time(10, 0), end_time=time(11, 0), attendees=max_cap + 100),
            current_user=emp_user,
            db=db
        )
        assert_test(False, "Capacity violation should fail")
    except HTTPException as e:
        assert_test(e.status_code == 400, "Capacity violation rejected with HTTP 400")

    # Test D: Clean booking creation & Overlap prevention
    # First, cancel any leftover test booking for that exact slot
    db.query(main.Booking).filter(
        main.Booking.facility_id == 1,
        main.Booking.booking_date == future_date,
        main.Booking.start_time == time(11, 0),
        main.Booking.end_time == time(12, 0)
    ).delete()
    db.commit()

    # Create new booking
    book_res = main.create_booking(
        BookingCreate(facility_id=1, booking_date=future_date, start_time=time(11, 0), end_time=time(12, 0), attendees=4),
        current_user=emp_user,
        db=db
    )
    b_id = book_res["booking_id"]
    assert_test(b_id > 0, "Booking created successfully", f"Booking #{b_id}")

    # Attempt overlapping booking for the same facility and date
    try:
        main.create_booking(
            BookingCreate(facility_id=1, booking_date=future_date, start_time=time(11, 30), end_time=time(12, 30), attendees=2),
            current_user=emp_user,
            db=db
        )
        assert_test(False, "Overlapping booking should fail")
    except HTTPException as e:
        assert_test(e.status_code == 409, "Overlapping reservation blocked with HTTP 409 Conflict")

    # Cancel the test booking
    cancel_res = main.cancel_booking(booking_id=b_id, current_user=emp_user, db=db)
    assert_test(cancel_res["booking_id"] == b_id, "Employee cancelled booking successfully")

    # ---------------------------------------------------------
    # 4. SMART SLOT RECOMMENDATION (AI / ML) TESTS
    # ---------------------------------------------------------
    print("\n--- 4. AI/ML Smart Slot Recommendation Tests ---")
    rec_req = SlotRecommendationRequest(
        facility_type="Meeting Room",
        booking_date=future_date,
        attendees=6,
        duration_minutes=60,
        preferred_window="morning"
    )
    rec_res = main.recommend_smart_slots(payload=rec_req, current_user=emp_user, db=db)
    assert_test(len(rec_res["recommendations"]) > 0, "Smart recommendations generated", f"Found {len(rec_res['recommendations'])} slots")

    top_slot = rec_res["recommendations"][0]
    assert_test("recommendation_score" in top_slot, "Slot includes ML recommendation score", f"Score: {top_slot['recommendation_score']}%")
    assert_test("explanation" in top_slot, "Slot includes explainable reasoning", f"Explanation: {top_slot['explanation'][:55]}...")
    assert_test(top_slot["ranking_method"] == "random_forest_ml", "Ranked using trained Random Forest ML model")

    # ---------------------------------------------------------
    # 5. NLP COMPLAINT CATEGORIZATION TESTS
    # ---------------------------------------------------------
    print("\n--- 5. AI NLP Complaint Categorization Tests ---")
    cat1 = main.categorize_complaint(
        ComplaintSuggestionRequest(subject="AC not cooling", description="Room temperature is too hot and HVAC is leaking water."),
        current_user=emp_user
    )
    assert_test(cat1["suggested_category"] == "Maintenance", "Identified Maintenance issue", f"Category: {cat1['suggested_category']}")

    cat2 = main.categorize_complaint(
        ComplaintSuggestionRequest(subject="Trash and coffee spills", description="Pantry tables are sticky and trash is overflowing."),
        current_user=emp_user
    )
    assert_test(cat2["suggested_category"] == "Cleanliness", "Identified Cleanliness issue", f"Category: {cat2['suggested_category']}")

    # ---------------------------------------------------------
    # 6. ADMIN AI INSIGHTS TESTS
    # ---------------------------------------------------------
    print("\n--- 6. Admin AI Insights & Data-Driven Metrics Tests ---")
    insights = main.get_admin_ai_insights(admin=admin_user, db=db)
    summary = insights["summary"]
    trends = insights["trends"]
    suggestions = insights["actionable_suggestions"]

    assert_test(summary["total_employees"] > 0, "Real employee count computed", f"{summary['total_employees']} employees")
    assert_test(summary["total_facilities"] >= 4, "Real facility count computed", f"{summary['total_facilities']} facilities")
    assert_test(trends["most_popular_day"] != "", "Peak booking day identified", f"Peak: {trends['most_popular_day']}")
    assert_test(len(suggestions) > 0, "Actionable workplace suggestions generated", f"{len(suggestions)} recommendations")

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------
    db.close()
    print("\n" + "=" * 70)
    print(f"TEST RESULTS: {passed} PASSED, {failed} FAILED.")
    print("=" * 70)
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
