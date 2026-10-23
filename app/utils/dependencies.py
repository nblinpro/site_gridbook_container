import os
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.config import SessionLocal
from app.models.user import User
from app.utils.jwt_handler import verify_access_token

# Nom configurable : deux instances sur le même hôte (ports différents) partageraient sinon le cookie
COOKIE_NAME = os.getenv("COOKIE_NAME", "access_token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # 401 (et non 403) pour que le front déclenche la déconnexion d'une session déjà ouverte
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Ce compte a été désactivé.")
    return user

def get_current_admin(current_user: User = Depends(get_current_user)): # <-- Renommé ici
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user
