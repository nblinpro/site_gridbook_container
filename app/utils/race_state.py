from datetime import datetime, timezone


def race_has_started(race) -> bool:
    """Heure de départ passée (les dates sont stockées en UTC, sans fuseau)."""
    return bool(race.start_datetime) and race.start_datetime.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc)


def race_is_open(race) -> bool:
    """Ouverte aux paris : ouverte par l'admin, pas encore réglée, et départ pas encore donné.

    Le résultat d'une course peut arriver des heures, voire des jours, après le départ ; d'ici là
    elle reste « upcoming » en base, mais on ne peut plus ni y parier ni annuler un pari.
    """
    return bool(race.is_open) and race.status == "upcoming" and not race_has_started(race)
