from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Bet, Race, Driver, User


def settle_race(db: Session, race: Race, winner: Driver) -> dict:
    """Clôture une course et règle ses paris en attente (pari mutuel : cote = pool total / pool du gagnant).

    Utilisé par la clôture manuelle admin et par la synchronisation automatique
    des résultats. Ne fait pas de commit : c'est l'appelant qui valide.
    """
    total_pool = db.query(func.sum(Bet.amount)).filter(Bet.race_id == race.id).scalar() or 0
    winner_pool = db.query(func.sum(Bet.amount)).filter(Bet.race_id == race.id, Bet.selection_id == winner.id).scalar() or 0
    final_odds = round(total_pool / winner_pool, 2) if winner_pool > 0 else 0

    race.status = "finished"
    race.is_open = False
    race.winner_driver_id = winner.id

    winners = 0
    for bet in db.query(Bet).filter(Bet.race_id == race.id, Bet.status == "pending").all():
        bet.odds = final_odds
        if bet.selection_id == winner.id:
            bet.status = "won"
            user = db.query(User).filter(User.id == bet.user_id).with_for_update().first()
            if user:
                user.wallet = float(user.wallet) + float(bet.amount) * float(final_odds)
            winners += 1
        else:
            bet.status = "lost"

    return {"final_odds": final_odds, "winners": winners, "total_pool": float(total_pool)}
