"""Récompenses à gagner : progression d'un joueur vers la condition d'un article (`unlock_rule`).

Les conditions se calculent à partir des paris réglés. Elles sont évaluées à la demande
(affichage de la boutique, réclamation) : aucun traitement à brancher sur le règlement des courses.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Bet, Discipline, Season

SPORTS = ("f1", "motogp", "nascar")


class PlayerStats:
    """Statistiques de paris d'un joueur, calculées une fois pour toutes les récompenses."""

    def __init__(self, db: Session, user_id: int):
        base = db.query(Bet).filter(Bet.user_id == user_id)
        self.bets = base.count()
        self.wins = base.filter(Bet.status == "won").count()
        self.best_win_odds = float(
            db.query(func.max(Bet.odds)).filter(Bet.user_id == user_id, Bet.status == "won").scalar() or 0
        )
        self.season_wins = base.filter(Bet.status == "won", Bet.race_id.is_(None)).count()
        self.sports_won = {
            slug for (slug,) in db.query(Discipline.slug)
            .join(Season, Season.discipline_id == Discipline.id)
            .join(Bet, Bet.season_id == Season.id)
            .filter(Bet.user_id == user_id, Bet.status == "won", Bet.race_id.isnot(None))
            .distinct()
        }


def progress(rule: dict, stats: PlayerStats) -> tuple[float, float]:
    """(valeur actuelle, objectif) pour une condition ; la récompense est acquise si valeur ≥ objectif."""
    kind = (rule or {}).get("type")
    if kind == "bets":
        return min(stats.bets, rule["count"]), rule["count"]
    if kind == "wins":
        return min(stats.wins, rule["count"]), rule["count"]
    if kind == "win_odds":
        return min(stats.best_win_odds, rule["min"]), rule["min"]
    if kind == "sports_won":
        return len(stats.sports_won & set(SPORTS)), len(SPORTS)
    if kind == "season_win":
        return min(stats.season_wins, 1), 1
    return 0, 1  # condition inconnue : jamais acquise


def describe(rule: dict) -> str:
    """Condition en français, affichée sur la carte de la récompense."""
    kind = (rule or {}).get("type")
    if kind == "bets":
        return "Placer ton premier pronostic" if rule["count"] == 1 else f"Placer {rule['count']} pronostics"
    if kind == "wins":
        return f"Gagner {rule['count']} pronostics"
    if kind == "win_odds":
        return f"Gagner un pari à une cote de {rule['min']:g} ou plus"
    if kind == "sports_won":
        return "Gagner un pari en F1, en MotoGP et en NASCAR"
    if kind == "season_win":
        return "Trouver un champion de fin de saison"
    return "Condition spéciale"
