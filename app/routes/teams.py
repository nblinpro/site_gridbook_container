from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.utils.dependencies import get_db
from app.utils.discipline import get_discipline
from app.models.team import Team

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/")
def get_teams(discipline: str = "f1", db: Session = Depends(get_db)):
    d = get_discipline(db, discipline)
    teams = db.query(Team).filter(Team.discipline_id == d.id).order_by(Team.name).all()
    return [{"id": t.id, "name": t.name} for t in teams]
