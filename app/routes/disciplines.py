import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.utils.dependencies import get_db
from app.utils.discipline import get_discipline
from app.models import Discipline, Season
from app.services.sync import ADAPTERS, get_standings

router = APIRouter(tags=["disciplines"])


@router.get("/disciplines/")
def list_disciplines(db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name, "slug": d.slug} for d in db.query(Discipline).order_by(Discipline.id).all()]


@router.get("/seasons/")
def list_seasons(discipline: str = "f1", db: Session = Depends(get_db)):
    d = get_discipline(db, discipline)
    seasons = db.query(Season).filter(Season.discipline_id == d.id).order_by(Season.year.desc()).all()
    return [{"id": s.id, "year": s.year, "is_active": s.is_active} for s in seasons]


@router.get("/standings/{discipline}")
def championship_standings(discipline: str, year: int | None = None):
    """Classement officiel du championnat (pilotes + équipes), lu en direct depuis l'API du sport."""
    if discipline not in ADAPTERS:
        raise HTTPException(status_code=404, detail=f"Discipline inconnue : {discipline}")
    try:
        return get_standings(discipline, year)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Classement momentanément indisponible (API source injoignable)")
