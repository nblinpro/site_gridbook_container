from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.config import Base

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    # Identifiant de la ligne dans l'API source du sport (Jolpica, MotoGP, NASCAR)
    external_id = Column(String(64), index=True, nullable=True)
    name = Column(String(100), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)

    # Relation vers l'équipe
    team = relationship("Team", back_populates="drivers")
    discipline = relationship("Discipline", back_populates="drivers")