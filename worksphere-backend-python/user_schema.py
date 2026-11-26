from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=10)
    password: str = Field(min_length=8, max_length=100)
    confirm_password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if not value.isdigit():
            raise ValueError("Phone number must contain only digits")
        if len(value) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", value):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must contain at least one special character")
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, value, info):
        if "password" in info.data and value != info.data["password"]:
            raise ValueError("Passwords do not match")
        return value


class EmployeeUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=10)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if not value.isdigit():
            raise ValueError("Phone number must contain only digits")
        if len(value) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return value


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=100)
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", value):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must contain at least one special character")
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, value, info):
        if "new_password" in info.data and value != info.data["new_password"]:
            raise ValueError("New passwords do not match")
        return value
