import logging
import os
import threading
import time
from datetime import datetime

from app.config import SessionLocal
from app.models import Discipline, Race, Season
from app.services.sync import f1, motogp, nascar

logger = logging.getLogger(__name__)

ADAPTERS = {"f1": f1, "motogp": motogp, "nascar": nascar}
STANDINGS_TTL_SECONDS = 600
_standings_cache: dict = {}
_sync_lock = threading.Lock()


def run_sync(slug: str, year: int | None = None) -> dict:
    """Synchronise calendrier, engagés et résultats d'une discipline depuis son API."""
    year = year or datetime.utcnow().year
    adapter = ADAPTERS[slug]
    # Un seul sync à la fois : deux syncs simultanés créeraient des doublons
    with _sync_lock, SessionLocal() as db:
        discipline = db.query(Discipline).filter(Discipline.slug == slug).one()
        try:
            report = adapter.sync(db, discipline, year)
            db.commit()
            logger.info("Sync %s %s : %s", slug, year, report)
            return report
        except Exception:
            db.rollback()
            raise


def get_standings(slug: str, year: int | None = None) -> dict:
    year = year or datetime.utcnow().year
    key = (slug, year)
    cached = _standings_cache.get(key)
    if cached and time.monotonic() - cached[0] < STANDINGS_TTL_SECONDS:
        return cached[1]
    data = {"season": year, **ADAPTERS[slug].standings(year)}
    _standings_cache[key] = (time.monotonic(), data)
    return data


def _needs_initial_sync(slug: str) -> bool:
    with SessionLocal() as db:
        return not (
            db.query(Race).join(Season, Race.season_id == Season.id)
            .join(Discipline, Season.discipline_id == Discipline.id)
            .filter(Discipline.slug == slug).first()
        )


def _sync_all(only_empty: bool) -> None:
    for slug in ADAPTERS:
        if only_empty and not _needs_initial_sync(slug):
            continue
        try:
            run_sync(slug)
        except Exception:
            logger.exception("Échec de la synchronisation %s", slug)


def start_background_sync() -> None:
    """Au démarrage : remplit les disciplines vides, puis resynchronise périodiquement
    (nouveaux résultats -> paris réglés automatiquement)."""
    interval = float(os.getenv("SYNC_INTERVAL_HOURS", "6")) * 3600

    def loop():
        _sync_all(only_empty=True)
        while interval > 0:
            time.sleep(interval)
            _sync_all(only_empty=False)

    threading.Thread(target=loop, name="gridbook-sync", daemon=True).start()
