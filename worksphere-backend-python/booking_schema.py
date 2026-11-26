from pydantic import BaseModel, Field
from datetime import date, time
from typing import Optional

class BookingCreate(BaseModel):
    user_name: Optional[str] = None
    facility_id: int
    booking_date: date
    start_time: time
    end_time: time
    attendees: Optional[int] = Field(default=1, ge=1)

class SlotRecommendationRequest(BaseModel):
    facility_type: str = Field(min_length=2, max_length=50)
    booking_date: date
    attendees: Optional[int] = Field(default=1, ge=1, le=200)
    duration_minutes: Optional[int] = Field(default=60, ge=30, le=480)
    preferred_window: Optional[str] = Field(default="any")
