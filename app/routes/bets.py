import logging

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.utils.dependencies import get_db, get_current_user, get_current_admin
from app.models import Bet, User, Race, Driver, Team, Season
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bets", tags=["Bets"])

SEASON_BET_TYPES = {
    "season_driver": ("driver", "Classement Pilotes"),
    "season_team": ("team", "Classement Constructeurs"),
}

# ---------------------------------------------------
# GET /bets/pool/{race_id} : Récupérer l'état de la cagnotte
# ---------------------------------------------------
@router.get("/pool/{race_id}")
def get_race_pool(race_id: int, db: Session = Depends(get_db)):
    """Calcule la masse totale et les cotes probables en temps réel."""
    # 1. Masse totale misée sur la course
    total_pool = db.query(func.sum(Bet.amount)).filter(Bet.race_id == race_id).scalar() or 0
    
    # 2. Masse par pilote
    bets_by_driver = db.query(
        Bet.selection_id, 
        func.sum(Bet.amount).label("total_amount")
    ).filter(Bet.race_id == race_id).group_by(Bet.selection_id).all()

    driver_stats = {}
    for b in bets_by_driver:
        # Calcul de la cote mutuelle : Total / Mise sur le pilote
        # Si mise sur pilote = 10 et total = 100, cote = 10.0
        current_odds = total_pool / b.total_amount if b.total_amount > 0 else 0
        driver_stats[b.selection_id] = {
            "total_bet": b.total_amount,
            "probable_odds": round(current_odds, 2)
        }

    return {
        "race_id": race_id,
        "total_pool": total_pool,
        "stats": driver_stats
    }

# ---------------------------------------------------
# POST /bets/place : Placer un nouveau pari
# ---------------------------------------------------
@router.post("/place")
def place_bet(
    race_id: int = Body(..., embed=True),
    selection_id: int = Body(..., embed=True),
    amount: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """L'utilisateur parie sur un pilote avec triple vérification de sécurité."""
    
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Course non trouvée")

    # 1. Vérification du verrouillage manuel (le bouton Admin)
    if not race.is_open:
        raise HTTPException(status_code=403, detail="Les paris ont été fermés par la direction de course.")

    # 2. Vérification du statut de la course
    if race.status != "upcoming":
        raise HTTPException(status_code=400, detail="La course n'est plus ouverte aux paris.")

    # 3. Vérification de l'heure (Sécurité automatique si l'admin oublie de cliquer)
    # On utilise timezone-aware comparison pour éviter les erreurs de décalage
    now = datetime.now(timezone.utc)
    # On s'assure que start_datetime est traité en UTC pour la comparaison
    if race.start_datetime and race.start_datetime.replace(tzinfo=timezone.utc) < now:
        # On ferme la course automatiquement en BDD si on détecte qu'elle est commencée
        race.is_open = False
        db.commit()
        raise HTTPException(status_code=400, detail="La course a déjà commencé !")

    # 4. Vérification du montant
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être positif")

    # 5. Le pilote doit exister et courir dans la même discipline que l'épreuve
    season = db.query(Season).filter(Season.id == race.season_id).first()
    driver = db.query(Driver).filter(Driver.id == selection_id).first()
    if not driver or not season or driver.discipline_id != season.discipline_id:
        raise HTTPException(status_code=400, detail="Ce pilote ne participe pas à cette épreuve")

    # 5. Vérification du solde + verrouillage de la ligne pour éviter une
    # double dépense en cas de requêtes concurrentes sur le même compte
    locked_user = db.query(User).filter(User.id == user.id).with_for_update().one()
    if float(locked_user.wallet) < float(amount):
        raise HTTPException(status_code=400, detail="Solde insuffisant")

    # Déduction du solde
    locked_user.wallet = float(locked_user.wallet) - float(amount)

    new_bet = Bet(
        user_id=user.id,
        race_id=race_id,
        season_id=race.season_id,
        selection_id=selection_id,
        selection_type="driver",
        amount=amount,
        odds=0.0, 
        bet_type="race_win",
        status="pending"
    )

    try:
        db.add(new_bet)
        db.commit()
        db.refresh(new_bet)
        return {
            "message": "Pari enregistré avec succès",
            "new_wallet_balance": locked_user.wallet
        }
    except Exception as e:
        db.rollback()
        logger.exception("Erreur lors de l'enregistrement du pari")
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'enregistrement")



# ---------------------------------------------------
# GET /bets/season-pool/{season_id}/{bet_type} : Cagnotte d'un classement saison
# ---------------------------------------------------
@router.get("/season-pool/{season_id}/{bet_type}")
def get_season_pool(season_id: int, bet_type: str, db: Session = Depends(get_db)):
    if bet_type not in SEASON_BET_TYPES:
        raise HTTPException(status_code=400, detail="Type de pari invalide")

    base_filter = [Bet.season_id == season_id, Bet.bet_type == bet_type, Bet.race_id.is_(None)]
    total_pool = db.query(func.sum(Bet.amount)).filter(*base_filter).scalar() or 0

    by_selection = db.query(
        Bet.selection_id,
        func.sum(Bet.amount).label("total_amount")
    ).filter(*base_filter).group_by(Bet.selection_id).all()

    stats = {}
    for row in by_selection:
        odds = total_pool / row.total_amount if row.total_amount > 0 else 0
        stats[row.selection_id] = {"total_bet": row.total_amount, "probable_odds": round(odds, 2)}

    return {"season_id": season_id, "bet_type": bet_type, "total_pool": total_pool, "stats": stats}


# ---------------------------------------------------
# POST /bets/place-season : Parier sur un classement de fin de saison
# ---------------------------------------------------
@router.post("/place-season")
def place_season_bet(
    season_id: int = Body(..., embed=True),
    bet_type: str = Body(..., embed=True),
    selection_id: int = Body(..., embed=True),
    amount: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Pari sur le champion pilote/écurie de fin de saison (pas lié à une course précise)."""
    if bet_type not in SEASON_BET_TYPES:
        raise HTTPException(status_code=400, detail="Type de pari invalide")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être positif")

    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Saison introuvable")
    model = Team if bet_type == "season_team" else Driver
    selection = db.query(model).filter(model.id == selection_id).first()
    if not selection or selection.discipline_id != season.discipline_id:
        raise HTTPException(status_code=400, detail="Cette sélection n'appartient pas à ce championnat")

    # Un seul pari actif par type de classement et par saison
    existing = db.query(Bet).filter(
        Bet.user_id == user.id,
        Bet.season_id == season_id,
        Bet.bet_type == bet_type,
        Bet.race_id.is_(None),
        Bet.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tu as déjà un pari en attente sur ce classement pour cette saison")

    locked_user = db.query(User).filter(User.id == user.id).with_for_update().one()
    if float(locked_user.wallet) < float(amount):
        raise HTTPException(status_code=400, detail="Solde insuffisant")

    locked_user.wallet = float(locked_user.wallet) - float(amount)

    selection_type, _ = SEASON_BET_TYPES[bet_type]
    new_bet = Bet(
        user_id=user.id,
        season_id=season_id,
        race_id=None,
        selection_id=selection_id,
        selection_type=selection_type,
        amount=amount,
        odds=0.0,
        bet_type=bet_type,
        status="pending",
    )

    try:
        db.add(new_bet)
        db.commit()
        db.refresh(new_bet)
        return {"message": "Pari saison enregistré avec succès", "new_wallet_balance": locked_user.wallet}
    except Exception:
        db.rollback()
        logger.exception("Erreur lors de l'enregistrement du pari saison")
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'enregistrement")


# ---------------------------------------------------
# GET /bets/my_bets : Voir ses propres paris
# ---------------------------------------------------
@router.get("/my_bets")
def get_my_bets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bets = db.query(Bet).filter(Bet.user_id == user.id).order_by(Bet.id.desc()).all()

    result = []
    for bet in bets:
        is_season_bet = bet.race_id is None

        if is_season_bet:
            if bet.selection_type == "team":
                selection = db.query(Team).filter(Team.id == bet.selection_id).first()
            else:
                selection = db.query(Driver).filter(Driver.id == bet.selection_id).first()
            selection_name = selection.name if selection else "Inconnu"
            race = None
        else:
            race = db.query(Race).filter(Race.id == bet.race_id).first()
            driver = db.query(Driver).filter(Driver.id == bet.selection_id).first()
            selection_name = driver.name if driver else "Inconnu"

        # Calcul de la cote dynamique pour les paris en attente
        display_odds = bet.odds
        if bet.status == "pending":
            if is_season_bet:
                total_pool = db.query(func.sum(Bet.amount)).filter(
                    Bet.season_id == bet.season_id, Bet.bet_type == bet.bet_type, Bet.race_id.is_(None)
                ).scalar() or 1
                selection_pool = db.query(func.sum(Bet.amount)).filter(
                    Bet.season_id == bet.season_id, Bet.bet_type == bet.bet_type,
                    Bet.race_id.is_(None), Bet.selection_id == bet.selection_id
                ).scalar() or 1
            else:
                total_pool = db.query(func.sum(Bet.amount)).filter(Bet.race_id == bet.race_id).scalar() or 1
                selection_pool = db.query(func.sum(Bet.amount)).filter(Bet.race_id == bet.race_id, Bet.selection_id == bet.selection_id).scalar() or 1
            display_odds = round(total_pool / selection_pool, 2)

        bet_season = db.query(Season).filter(Season.id == bet.season_id).first()
        result.append({
            "discipline": bet_season.discipline.slug if bet_season and bet_season.discipline else None,
            "id": bet.id,
            "race_id": bet.race_id,  # Ajouté pour le mapping React
            "season_id": bet.season_id,
            "bet_type": bet.bet_type,
            "selection_id": bet.selection_id, # Ajouté pour le mapping React
            "amount": bet.amount,
            "odds": display_odds,
            "status": bet.status,
            "is_open": race.is_open if race else (bet.status == "pending"), # <--- INDISPENSABLE POUR REACT
            "race_name": race.name if race else SEASON_BET_TYPES.get(bet.bet_type, (None, "Inconnue"))[1],
            "race_date": race.start_datetime.isoformat() if race and race.start_datetime else None,
            "driver_name": selection_name,
            "potential_gain": round(float(bet.amount) * float(display_odds), 2)
        })

    return result

# ---------------------------------------------------
# DELETE /bets/{bet_id} : Annuler un pari
# ---------------------------------------------------
@router.delete("/{bet_id}")
def cancel_bet(bet_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bet = db.query(Bet).filter(Bet.id == bet_id, Bet.user_id == user.id).first()

    if not bet or bet.status != "pending":
        raise HTTPException(status_code=400, detail="Impossible d'annuler")

    race = db.query(Race).filter(Race.id == bet.race_id).first()
    if race and race.status != "upcoming":
        raise HTTPException(status_code=400, detail="La course a commencé")

    locked_user = db.query(User).filter(User.id == user.id).with_for_update().one()
    locked_user.wallet = float(locked_user.wallet) + float(bet.amount)
    db.delete(bet)
    db.commit()

    return {"message": "Annulé", "new_wallet_balance": locked_user.wallet}
