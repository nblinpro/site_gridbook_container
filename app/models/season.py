from sqlalchemy import Column, Integer, Date, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.config import Base

class Season(Base):
    __tablename__ = "seasons"
    __table_args__ = (UniqueConstraint("year", "discipline_id", name="uniq_season_year_discipline"),)

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False) # On ajoute cette colonne qui manque
    start_date = Column(Date, nullable=False) # <--- On ajoute cette ligne
    end_date = Column(Date, nullable=False) # <--- On ajoute cette ligne
    is_active = Column(Boolean, default=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)

    # Relation vers les courses
    races = relationship("Race", back_populates="season")
    discipline = relationship("Discipline", back_populates="seasons")