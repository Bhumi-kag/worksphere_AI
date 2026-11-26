from pydantic import BaseModel, Field


class FacilityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    type: str = Field(min_length=2, max_length=50)
    capacity: int = Field(gt=0)
    available: bool = True


class FacilityUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    type: str = Field(min_length=2, max_length=50)
    capacity: int = Field(gt=0)
    available: bool