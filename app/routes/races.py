from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.race import Race
from app.utils.race_state import race_is_open
from app.models.season import Season
from app.utils.discipline import get_discipline
from app.utils.dependencies import get_db, get_current_user


router = APIRouter(prefix="/races", tags=["races"])

# ---------------------------------------------------
# ROUTE PUBLIQUE / UTILISATEUR : Voir le calendrier
# ---------------------------------------------------
def _round(race: Race):
    """Numéro de manche quand l'identifiant source l'encode (F1 : « 2026-5 »), sinon None."""
    ext = race.external_id or ""
    year, _, num = ext.partition("-")
    return int(num) if year.isdigit() and num.isdigit() else None


def _serialize_race(race: Race) -> dict:
    return {
        "round": _round(race),
        "id": race.id,
        "season_id": race.season_id,
        "name": race.name,
        "start_datetime": race.start_datetime,
        "status": race.status,
        "is_open": race_is_open(race),
        "year": race.season.year if race.season else None,
        "discipline": race.season.discipline.slug if race.season and race.season.discipline else None,
        "winner_name": race.winner.name if race.winner else None,
        "circuit": {
            "name": race.circuit.name,
            "city": race.circuit.city,
            "country": race.circuit.country,
            "length_km": race.circuit.length_km,
            "turns": race.circuit.turns,
            "image_url": race.circuit.image_url,
            "description": race.circuit.description,
            "details": race.circuit.details or {},
        } if race.circuit else None,
    }


@router.get("/")
def get_all_races(discipline: str = "f1", db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    d = get_discipline(db, discipline)
    races = (
        db.query(Race)
        .join(Season, Race.season_id == Season.id)
        .filter(Season.discipline_id == d.id)
        .order_by(Race.start_datetime.asc())
        .all()
    )
    return [_serialize_race(r) for r in races]


@router.get("/{race_id}")
def get_race(race_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Course introuvable")
    return _serialize_race(race)
