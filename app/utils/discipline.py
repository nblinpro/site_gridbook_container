from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Discipline


def get_discipline(db: Session, slug: str) -> Discipline:
    discipline = db.query(Discipline).filter(Discipline.slug == slug).first()
    if not discipline:
        raise HTTPException(status_code=404, detail=f"Discipline inconnue : {slug}")
    return discipline
