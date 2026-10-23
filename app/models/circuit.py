from sqlalchemy import Column, Float, ForeignKey, Integer, JSON, String, Text
from app.config import Base


class Circuit(Base):
    """Fiche circuit importée depuis l'API du sport (MotoGP, NASCAR) ou minimale (F1)."""
    __tablename__ = "circuits"

    id = Column(Integer, primary_key=True, index=True)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    external_id = Column(String(64), index=True, nullable=False)
    name = Column(String(150), nullable=False)
    city = Column(String(100))
    country = Column(String(100))
    length_km = Column(Float)
    turns = Column(Integer)
    image_url = Column(String(500))
    description = Column(Text)
    # Caractéristiques propres à chaque sport (inclinaison, type de piste, architecte…)
    details = Column(JSON)
