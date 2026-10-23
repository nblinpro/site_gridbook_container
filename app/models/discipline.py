from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.config import Base

class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)       # "Formule 1", "MotoGP", "WRC", "Endurance"
    slug = Column(String(20), nullable=False, unique=True)  # "f1", "motogp", "wrc", "wec"

    teams = relationship("Team", back_populates="discipline")
    drivers = relationship("Driver", back_populates="discipline")
    seasons = relationship("Season", back_populates="discipline")
