from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from app.config import Base
import enum
from datetime import datetime

class BetStatus(str, enum.Enum):
    pending = "pending"
    won = "won"
    lost = "lost"
    refunded = "refunded" # Aligné avec ton ENUM MariaDB

class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=True) # Autorise NULL pour les paris sur la saison
    
    # Type de pari (Obligatoire selon ton DESCRIBE)
    # race_win, season_driver, ou season_team
    bet_type = Column(String(50), nullable=False, default="race_win") 
    
    selection_id = Column(Integer, nullable=False)
    selection_type = Column(String(50), nullable=False)
    
    amount = Column(Float, nullable=False)
    # Utilisation de Numeric(5,2) pour correspondre exactement à MariaDB
    odds = Column(Numeric(5, 2), nullable=False)
    
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    user = relationship("User", back_populates="bets")
    race = relationship("Race")
    season = relationship("Season")