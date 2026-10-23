from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.config import Base
from datetime import datetime

class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(String(10), nullable=False)  # "credit" ou "debit"
    reason = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
