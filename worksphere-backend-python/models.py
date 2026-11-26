from sqlalchemy import Column, Integer, String, Boolean
from database import Base


class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)
    available = Column(Boolean, default=True)