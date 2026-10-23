from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.config import Base
import enum

# On définit l'enum pour le statut
class RaceStatus(str, enum.Enum):
    upcoming = "upcoming"
    finished = "finished"
    cancelled = "cancelled"

class Race(Base):
    __tablename__ = "races"
    __table_args__ = (UniqueConstraint("season_id", "name", name="uniq_race_season_name"),)

    id = Column(Integer, primary_key=True, index=True)
    # Identifiant de la ligne dans l'API source du sport (Jolpica, MotoGP, NASCAR)
    external_id = Column(String(64), index=True, nullable=True)
    
    # Maintenant ForeignKey sera reconnu car il est importé en ligne 1
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    
    name = Column(String(150))
    start_datetime = Column(DateTime)
    
    # Utilisation de ton Enum RaceStatus pour plus de cohérence
    # Si tu utilises un Enum, accède à sa valeur .value
    status = Column(String(20), default=RaceStatus.upcoming.value)

    # Relation vers Season
    season = relationship("Season", back_populates="races")

    is_open = Column(Boolean, default=True)
    winner_driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    winner = relationship("Driver", foreign_keys=[winner_driver_id])
    circuit_id = Column(Integer, ForeignKey("circuits.id"), nullable=True)
    circuit = relationship("Circuit")  # Nouveau champ pour indiquer si les paris sont ouverts ou fermés