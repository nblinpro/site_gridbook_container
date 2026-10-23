# app/routes/auth_routes.py

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import bcrypt

from app.models.user import User
from app.models.password_reset import PasswordReset
from app.schemas.auth_schemas import LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.jwt_handler import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.utils.dependencies import get_current_user, get_db, COOKIE_NAME
from app.utils.rate_limit import RateLimiter
from app.utils.email import send_email
from app.services.cosmetics import equipped_cosmetics

RESET_TOKEN_TTL_MINUTES = 30

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
# Un compteur par action : un seul compteur partagé bloquait un utilisateur qui
# se trompait de mot de passe puis lançait un reset. Derrière Docker, tous les
# visiteurs peuvent partager la même IP vue par le backend : limites un peu larges.
login_rate_limit = RateLimiter(max_calls=10, window_seconds=60)
register_rate_limit = RateLimiter(max_calls=5, window_seconds=60)
forgot_rate_limit = RateLimiter(max_calls=3, window_seconds=60)
reset_rate_limit = RateLimiter(max_calls=5, window_seconds=60)

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes", "on"}


def _set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ----------------------------
# POST /auth/login
# ----------------------------
@router.post("/login", dependencies=[Depends(login_rate_limit)])
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_bytes = data.password.encode("utf-8")[:72]
    if not bcrypt.checkpw(password_bytes, user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Vérifié après le mot de passe pour ne pas révéler l'état d'un compte à un inconnu
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Ce compte a été désactivé par un administrateur.")

    token = create_access_token({
        "user_id": user.id,
        "role": user.role
    })
    _set_auth_cookie(response, token)

    return {
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role
    }


# ----------------------------
# POST /auth/logout
# ----------------------------
@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME)
    return {"message": "Déconnecté"}


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ----------------------------
# POST /auth/forgot-password
# ----------------------------
@router.post("/forgot-password", dependencies=[Depends(forgot_rate_limit)])
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    generic_response = {"message": "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé."}

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Même réponse que le cas succès : on ne révèle pas quels emails existent
        return generic_response

    raw_token = secrets.token_urlsafe(32)
    reset = PasswordReset(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
    )
    db.add(reset)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?token={raw_token}"
    send_email(
        user.email,
        "Réinitialisation de ton mot de passe GridBook",
        f"Clique sur ce lien pour réinitialiser ton mot de passe (valable {RESET_TOKEN_TTL_MINUTES} minutes) :\n{reset_link}\n\nSi tu n'es pas à l'origine de cette demande, ignore cet email.",
    )
    return generic_response


# ----------------------------
# POST /auth/reset-password
# ----------------------------
@router.post("/reset-password", dependencies=[Depends(reset_rate_limit)])
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = _hash_token(data.token)
    reset = db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.used == False,  # noqa: E712
    ).first()

    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    password_bytes = data.new_password.encode("utf-8")[:72]
    user.password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")
    reset.used = True
    db.commit()

    return {"message": "Mot de passe mis à jour, tu peux te reconnecter."}


# ----------------------------
# GET /auth/me
# ----------------------------
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "cosmetics": equipped_cosmetics(db, [current_user.id])[current_user.id],
        "id": current_user.id,
        "username": current_user.username,  # <-- C'EST CETTE LIGNE LA PLUS IMPORTANTE
        "email": current_user.email,
        "wallet": current_user.wallet,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

# ----------------------------
# POST /auth/register
# ----------------------------
from app.schemas.auth_schemas import RegisterRequest
from datetime import datetime

@router.post("/register", dependencies=[Depends(register_rate_limit)])
def register(data: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash du mot de passe
    password_bytes = data.password.encode("utf-8")[:72]
    hashed_password = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")

    # Création utilisateur
    new_user = User(
        username=data.username,  # <--- AJOUTE CETTE LIGNE ICI
        email=data.email,
        password_hash=hashed_password,
        role="user",
        is_active=True,
        created_at=datetime.utcnow()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "user_id": new_user.id,
        "role": new_user.role
    })
    _set_auth_cookie(response, token)

    return {
        "token_type": "bearer",
        "id": new_user.id,
        "username": new_user.username, # <--- ET ICI
        "email": new_user.email,
        "role": new_user.role
    }

# ----------------------------
# GET /auth/leaderboard
# (Note : On le laisse dans auth car ton router a le prefix /auth)
# ----------------------------
@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    # On récupère les utilisateurs actifs triés par wallet
    users = db.query(User).filter(User.is_active == True).order_by(User.wallet.desc()).all()

    logger.debug("%d utilisateurs trouvés pour le leaderboard", len(users))

    cosmetics = equipped_cosmetics(db, [u.id for u in users])
    leaderboard_data = []
    for i, u in enumerate(users):
        leaderboard_data.append({
            "rank": i + 1,
            "username": u.username or "Anonyme",
            "wallet": float(u.wallet) if u.wallet else 0.0,
            "avatar_letter": u.username[0].upper() if u.username else "U",
            "cosmetics": cosmetics[u.id],
        })

    return leaderboard_data
