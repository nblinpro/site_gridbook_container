import logging
import os

import bcrypt

from app.config import SessionLocal
from app.models import Collection, Discipline, Product, User
from app.services.shop_catalog import COLLECTIONS, PRODUCTS

logger = logging.getLogger(__name__)

# Uniquement les disciplines disposant d'une API publique (voir README)
DISCIPLINES = [
    (1, "Formule 1", "f1"),
    (2, "MotoGP", "motogp"),
    (3, "NASCAR Cup", "nascar"),
]

def seed_shop(db) -> None:
    """Crée les collections et articles manquants ; met à jour leur description depuis le catalogue.

    Prix, mise en vente et mise en avant d'un article existant restent ceux choisis par l'admin.
    """
    collections = {c.slug: c for c in db.query(Collection).all()}
    for slug, name, description, discount, accent, featured, until in COLLECTIONS:
        col = collections.get(slug)
        if col is None:
            col = Collection(slug=slug, featured=featured)
            db.add(col)
            collections[slug] = col
        col.name, col.description, col.discount_pct, col.accent, col.available_until = name, description, discount, accent, until
    db.flush()

    products = {p.slug: p for p in db.query(Product).all()}
    for slug, category, name, value, price, rarity, discipline, collection, description, opts in PRODUCTS:
        product = products.get(slug)
        if product is None:
            product = Product(slug=slug, price=price, is_active=True, featured=False)
            db.add(product)
        product.category, product.name, product.value, product.rarity = category, name, value, rarity
        product.discipline, product.description = discipline, description
        product.collection_id = collections[collection].id if collection else None
        product.stock = opts.get("stock")
        product.available_until = opts.get("until")
        product.unlock_rule = opts.get("rule")
        if product.unlock_rule:
            product.price = 0  # une récompense ne s'achète pas


def seed() -> None:
    with SessionLocal() as db:
        for disc_id, name, slug in DISCIPLINES:
            if not db.query(Discipline).filter(Discipline.slug == slug).first():
                db.add(Discipline(id=disc_id, name=name, slug=slug))

        seed_shop(db)

        email = os.getenv("ADMIN_EMAIL")
        password = os.getenv("ADMIN_PASSWORD")
        if email and password and not db.query(User).filter(User.role == "admin").first():
            db.add(User(
                username=os.getenv("ADMIN_USERNAME", "admin"),
                email=email,
                password_hash=bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8"),
                role="admin",
                is_active=True,
            ))
            logger.info("Compte admin initial créé : %s", email)
        db.commit()
