from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    user_name = Column(String(100), nullable=False)

    facility_id = Column(
        Integer,
        ForeignKey("facilities.id"),
        nullable=False
    )

    booking_date = Column(Date, nullable=False)

    start_time = Column(Time, nullable=False)

    end_time = Column(Time, nullable=False)

    status = Column(String(20), default="Booked")