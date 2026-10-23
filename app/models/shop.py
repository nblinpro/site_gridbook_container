from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.config import Base

# Articles purement cosmétiques : aucun effet sur les paris ni sur les cotes
CATEGORIES = ("avatar", "frame", "badge", "title")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    category = Column(String(20), nullable=False)
    # Contenu affiché : emoji (avatar, badge), couleur CSS (cadre) ou texte (titre)
    value = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)
    rarity = Column(String(20), default="common")  # common / rare / epic / legendary
    discipline = Column(String(20))  # slug du sport pour un article thématique, sinon NULL
    is_active = Column(Boolean, default=True)


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price_paid = Column(Integer, nullable=False)
    equipped = Column(Boolean, default=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
