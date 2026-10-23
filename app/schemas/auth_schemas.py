# app/schemas/auth_schemas.py
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime  # <--- AJOUTE CETTE LIGNE
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50) # Ajoute cette ligne
    email: EmailStr
    password: str  = Field(
        min_length=8,
        description="Password must be at least 8 characters long"
    )

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, description="Password must be at least 8 characters long")

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
