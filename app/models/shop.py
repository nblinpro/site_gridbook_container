from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.config import Base

# Articles purement cosmétiques : aucun effet sur les paris ni sur les cotes
CATEGORIES = ("avatar", "frame", "badge", "title", "name_color")


class Collection(Base):
    """Ensemble d'articles assortis, achetable en lot avec une remise."""
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True)
    slug = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    discount_pct = Column(Integer, default=0)       # remise sur le lot complet
    accent = Column(String(20))                     # couleur d'ambiance de la vitrine
    featured = Column(Boolean, default=False)       # mise en avant (« À la une »)
    available_until = Column(DateTime)              # collection éphémère : fin de vente


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    category = Column(String(20), nullable=False)
    # Contenu affiché : emoji (avatar, badge), couleur CSS (cadre, pseudo) ou texte (titre)
    value = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)
    rarity = Column(String(20), default="common")  # common / rare / epic / legendary
    discipline = Column(String(20))  # slug du sport pour un article thématique, sinon NULL
    is_active = Column(Boolean, default=True)
    collection_id = Column(Integer, ForeignKey("collections.id"))
    featured = Column(Boolean, default=False)
    available_from = Column(DateTime)               # édition limitée : début de vente
    available_until = Column(DateTime)              # édition limitée : fin de vente
    stock = Column(Integer)                         # édition numérotée : nombre d'exemplaires
    # Récompense à gagner (non achetable) : condition à remplir, ex. {"type": "wins", "count": 5}
    unlock_rule = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection")


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price_paid = Column(Integer, nullable=False)
    serial = Column(Integer)                        # numéro d'exemplaire d'une édition numérotée
    equipped = Column(Boolean, default=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")


class WishlistItem(Base):
    __tablename__ = "wishlist"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
