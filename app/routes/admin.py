import bcrypt
import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from app.utils.dependencies import get_db, get_current_admin
from app.services.settlement import settle_race
from app.services.sync import ADAPTERS, run_sync
from app.models import Race, Bet, User, Driver, TokenTransaction

router = APIRouter(prefix="/admin", tags=["Admin"])

SEASON_BET_TYPES = ("season_driver", "season_team")


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field("user", pattern="^(user|admin)$")

# --- GESTION DES COURSES (RÉSULTATS & CLÔTURE) ---

@router.post("/close_race/{race_id}")
def close_race(
    race_id: int, 
    winner_id: int = Query(...), 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    """Clôture la course, calcule la côte finale du pool et distribue les gains."""
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race or race.status == "finished":
        raise HTTPException(status_code=400, detail="Course non trouvable ou déjà clôturée")

    winner = db.query(Driver).filter(Driver.id == winner_id).first()
    if not winner or not race.season or winner.discipline_id != race.season.discipline_id:
        raise HTTPException(status_code=400, detail="Ce vainqueur ne participe pas à cette épreuve")

    result = settle_race(db, race, winner)
    db.commit()
    return {
        "message": f"Résultats validés. Côte finale : {result['final_odds']}",
        "final_odds": result["final_odds"],
    }

@router.post("/reset_race/{race_id}")
def reset_race(race_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Annule les résultats d'une course et retire les gains distribués."""
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race or race.status != "finished":
        raise HTTPException(status_code=400, detail="Seule une course terminée peut être reset")

    bets = db.query(Bet).filter(Bet.race_id == race_id).all()
    for bet in bets:
        if bet.status == "won":
            user = db.query(User).filter(User.id == bet.user_id).with_for_update().first()
            if user:
                user.wallet = float(user.wallet) - (float(bet.amount) * float(bet.odds))
        bet.status = "pending"
        bet.odds = 0.0
    
    race.status = "upcoming"
    race.is_open = True
    race.winner_driver_id = None
    db.commit()
    return {"message": "Course réinitialisée, les soldes ont été ajustés"}

@router.post("/resolve_season/{season_id}")
def resolve_season(
    season_id: int,
    bet_type: str = Query(...),
    winner_id: int = Query(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Clôture un classement de fin de saison (pilotes ou écuries) et distribue les gains."""
    if bet_type not in SEASON_BET_TYPES:
        raise HTTPException(status_code=400, detail="Type de pari invalide")

    pending_bets = db.query(Bet).filter(
        Bet.season_id == season_id,
        Bet.bet_type == bet_type,
        Bet.race_id.is_(None),
        Bet.status == "pending",
    ).all()

    if not pending_bets:
        raise HTTPException(status_code=400, detail="Aucun pari en attente sur ce classement (déjà résolu ou inexistant)")

    total_pool = sum(float(bet.amount) for bet in pending_bets)
    winning_pool = sum(float(bet.amount) for bet in pending_bets if bet.selection_id == winner_id)
    final_odds = round(total_pool / winning_pool, 2) if winning_pool > 0 else 0

    winners_count = 0
    for bet in pending_bets:
        bet.odds = final_odds
        if bet.selection_id == winner_id:
            bet.status = "won"
            user = db.query(User).filter(User.id == bet.user_id).with_for_update().first()
            if user:
                user.wallet = float(user.wallet) + float(bet.amount) * float(final_odds)
            winners_count += 1
        else:
            bet.status = "lost"

    db.commit()
    return {
        "message": f"Classement résolu. {winners_count} gagnants payés.",
        "final_odds": final_odds,
        "total_distributed": total_pool,
    }


@router.patch("/races/{race_id}/toggle-status")
def toggle_race_status(race_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    race.is_open = not race.is_open
    db.commit()
    return {"id": race.id, "is_open": race.is_open}

# --- SYNCHRONISATION ---

# --- SYNCHRONISATION AVEC LES API DES SPORTS ---

@router.post("/sync/{discipline}")
def sync_discipline(discipline: str, admin: User = Depends(get_current_admin)):
    """Importe calendrier, engagés et résultats depuis l'API du sport ; règle les paris des courses terminées."""
    if discipline not in ADAPTERS:
        raise HTTPException(status_code=404, detail=f"Discipline inconnue : {discipline}")
    try:
        return run_sync(discipline)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"L'API source de {discipline} est injoignable : {exc.__class__.__name__}")


# --- USERS ---

@router.get("/users")
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "wallet": u.wallet,
            "created_at": u.created_at,
        }
        for u in users
    ]

@router.post("/users", status_code=201)
def create_user(data: AdminCreateUserRequest, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Crée un compte directement depuis le panel admin, avec le rôle de son choix."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")

    password_bytes = data.password.encode("utf-8")[:72]
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")

    new_user = User(
        username=data.username,
        email=data.email,
        password_hash=hashed_password,
        role=data.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "wallet": new_user.wallet,
    }

@router.patch("/users/{user_id}/toggle-status")
def toggle_user_status(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Tu ne peux pas désactiver ton propre compte.")
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_active = not user.is_active
        db.commit()
    return {"message": "Success"}

@router.patch("/users/{user_id}/promote")
def promote_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Tu ne peux pas modifier tes propres droits admin.")
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.role = "admin" if user.role == "user" else "user"
        db.commit()
    return {"message": "Success"}

@router.patch("/users/{user_id}/adjust-wallet")
def adjust_wallet(
    user_id: int,
    amount: float = Body(..., embed=True),
    reason: str = Body(..., embed=True, min_length=3, max_length=255),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Crédite (amount > 0) ou débite (amount < 0) manuellement le solde d'un compte, avec traçabilité."""
    if amount == 0:
        raise HTTPException(status_code=400, detail="Le montant ne peut pas être nul")

    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    new_balance = float(user.wallet) + float(amount)
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Le solde ne peut pas devenir négatif")

    user.wallet = new_balance
    db.add(TokenTransaction(
        user_id=user.id,
        amount=int(abs(amount)),
        type="credit" if amount > 0 else "debit",
        reason=f"{reason} (par {admin.username or admin.email})",
    ))
    db.commit()
    return {"message": "Solde ajusté", "new_wallet_balance": user.wallet}

@router.get("/users/{user_id}/transactions")
def get_user_transactions(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    transactions = db.query(TokenTransaction).filter(
        TokenTransaction.user_id == user_id
    ).order_by(TokenTransaction.created_at.desc()).all()
    return [
        {"id": t.id, "amount": t.amount, "type": t.type, "reason": t.reason, "created_at": t.created_at}
        for t in transactions
    ]
