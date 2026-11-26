from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    subject = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="Pending")
    admin_remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)