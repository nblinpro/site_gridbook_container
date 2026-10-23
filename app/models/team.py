from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.config import Base

class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("name", "discipline_id", name="uniq_team_name_discipline"),)

    id = Column(Integer, primary_key=True, index=True)
    # Identifiant de la ligne dans l'API source du sport (Jolpica, MotoGP, NASCAR)
    external_id = Column(String(64), index=True, nullable=True)
    name = Column(String(100), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)

    # Optionnel : pour pouvoir faire team.drivers et voir ses pilotes
    drivers = relationship("Driver", back_populates="team")
    discipline = relationship("Discipline", back_populates="teams")