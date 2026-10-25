from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

# Pseudo : 3 à 30 caractères, lettres (accents compris), chiffres, espace, point, tiret, tiret bas.
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=30, pattern=r"^[\w][\w .\-]*[\w]$")]
# Mot de passe : 128 caractères maximum (bcrypt n'en utilise que 72 octets ; au-delà,
# une chaîne géante ne sert qu'à faire travailler le serveur pour rien).
NewPassword = Annotated[str, StringConstraints(min_length=8, max_length=128)]
AnyPassword = Annotated[str, StringConstraints(min_length=1, max_length=128)]


class LoginRequest(BaseModel):
    email: EmailStr
    password: AnyPassword


class RegisterRequest(BaseModel):
    username: Username
    email: EmailStr
    password: NewPassword


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: Annotated[str, StringConstraints(min_length=16, max_length=256)]
    new_password: NewPassword


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
