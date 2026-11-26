from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional


ComplaintCategory = Literal[
    "Facility Issue",
    "Booking Issue",
    "Cleanliness",
    "Maintenance",
    "Parking Issue",
    "Other"
]


class ComplaintCreate(BaseModel):
    category: ComplaintCategory
    subject: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=2000)


class ComplaintStatusUpdate(BaseModel):
    status: Literal["Pending", "In Progress", "Resolved"]
    admin_remark: Optional[str] = Field(default=None, max_length=2000)


class ComplaintSuggestionRequest(BaseModel):
    subject: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=2000)


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    category: str
    subject: str
    description: str
    status: str
    admin_remark: Optional[str] = None
