import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func  # <--- Indispensable pour le calcul SUM
from app.utils.dependencies import get_db
from app.utils.discipline import get_discipline
from app.models.driver import Driver
from app.models.bet import Bet  # <--- Importe ton modèle Bet ici !

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/drivers", tags=["drivers"])

# ---------------------------------------------------
# GET / : Récupère les pilotes avec le total misé
# ---------------------------------------------------
@router.get("/")
def get_drivers(discipline: str = "f1", db: Session = Depends(get_db)):
    """Pilotes (ou équipages en endurance) d'une discipline, avec le total misé sur chacun."""
    d = get_discipline(db, discipline)

    # Seuls les paris dont la sélection est un pilote : les ids d'écuries chevauchent ceux des pilotes
    bet_stats = (
        db.query(Bet.selection_id, func.sum(Bet.amount).label("total_invested"))
        .filter(Bet.selection_type == "driver")
        .group_by(Bet.selection_id)
        .subquery()
    )

    results = (
        db.query(Driver, bet_stats.c.total_invested)
        .outerjoin(bet_stats, Driver.id == bet_stats.c.selection_id)
        .filter(Driver.discipline_id == d.id)
        .order_by(Driver.name)
        .all()
    )

    return [
        {
            "id": driver.id,
            "name": driver.name,
            "team_id": driver.team_id,
            "team_name": driver.team.name if driver.team else None,
            "total_invested": float(total_invested or 0),
        }
        for driver, total_invested in results
    ]
