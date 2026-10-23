import logging
import os

import bcrypt

from app.config import SessionLocal
from app.models import Discipline, Product, User

logger = logging.getLogger(__name__)

# Uniquement les disciplines disposant d'une API publique (voir README)
DISCIPLINES = [
    (1, "Formule 1", "f1"),
    (2, "MotoGP", "motogp"),
    (3, "NASCAR Cup", "nascar"),
]

# Catalogue initial de la boutique : (slug, catégorie, nom, valeur, prix, rareté, sport, description).
# Ajouté seulement s'il manque : un prix modifié par l'admin n'est jamais écrasé.
PRODUCTS = [
    ("av_flag", "avatar", "Drapeau à damier", "🏁", 500, "common", None, "L'avatar de ceux qui voient l'arrivée."),
    ("av_f1", "avatar", "Monoplace", "🏎️", 500, "common", "f1", "Pour les fidèles de la Formule 1."),
    ("av_moto", "avatar", "Prototype MotoGP", "🏍️", 500, "common", "motogp", "Genou au sol, coude au sol."),
    ("av_stock", "avatar", "Stock car", "🚘", 500, "common", "nascar", "Pare-chocs contre pare-chocs."),
    ("av_fire", "avatar", "Moteur en feu", "🔥", 1500, "rare", None, "Ça chauffe sous le capot."),
    ("av_trophy", "avatar", "Trophée", "🏆", 4000, "epic", None, "Réservé à ceux qui gagnent souvent."),
    ("av_crown", "avatar", "Couronne", "👑", 10000, "legendary", None, "Le roi de la grille."),
    ("fr_red", "frame", "Cadre Rosso Corsa", "#e10600", 800, "common", "f1", "Le rouge des tifosi."),
    ("fr_orange", "frame", "Cadre Papaya", "#ff8000", 800, "common", None, "Orange vif, impossible à rater."),
    ("fr_yellow", "frame", "Cadre Daytona", "#ffd659", 800, "common", "nascar", "Le jaune des ovales américains."),
    ("fr_cyan", "frame", "Cadre Télémétrie", "#00e5ff", 2000, "rare", None, "Les données ne mentent pas."),
    ("fr_purple", "frame", "Cadre Secteur violet", "#b14cff", 2500, "rare", None, "Le meilleur temps absolu."),
    ("fr_gold", "frame", "Cadre Champion", "#ffd700", 8000, "legendary", None, "Or massif, animé."),
    ("bd_target", "badge", "Sniper", "🎯", 600, "common", None, "Affiché à côté de ton pseudo."),
    ("bd_bolt", "badge", "Pole position", "⚡", 1500, "rare", None, "Toujours devant au départ."),
    ("bd_brain", "badge", "Stratège", "🧠", 1500, "rare", None, "Le bon pneu au bon moment."),
    ("bd_diamond", "badge", "High roller", "💎", 5000, "epic", None, "Les grosses mises ne te font pas peur."),
    ("bd_goat", "badge", "GOAT", "🐐", 12000, "legendary", None, "Le plus grand de tous les temps."),
    ("ti_rookie", "title", "Titre « Rookie de l'année »", "Rookie de l'année", 400, "common", None, "Affiché sous ton pseudo."),
    ("ti_pit", "title", "Titre « Chef de stand »", "Chef de stand", 700, "common", None, "Arrêt aux stands en 2 secondes."),
    ("ti_paddock", "title", "Titre « Roi du paddock »", "Roi du paddock", 2000, "rare", "f1", "Tout le monde connaît ton nom."),
    ("ti_knee", "title", "Titre « Genou à terre »", "Genou à terre", 2000, "rare", "motogp", "Angle maximal dans chaque virage."),
    ("ti_oval", "title", "Titre « Maître des ovales »", "Maître des ovales", 2000, "rare", "nascar", "Toujours à gauche, toujours plus vite."),
    ("ti_legend", "title", "Titre « Légende de la grille »", "Légende de la grille", 10000, "legendary", None, "Ton nom est gravé dans l'histoire."),
]


def seed() -> None:
    with SessionLocal() as db:
        for disc_id, name, slug in DISCIPLINES:
            if not db.query(Discipline).filter(Discipline.slug == slug).first():
                db.add(Discipline(id=disc_id, name=name, slug=slug))

        existing = {slug for (slug,) in db.query(Product.slug).all()}
        for slug, category, name, value, price, rarity, discipline, description in PRODUCTS:
            if slug not in existing:
                db.add(Product(slug=slug, category=category, name=name, value=value, price=price,
                               rarity=rarity, discipline=discipline, description=description))

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
