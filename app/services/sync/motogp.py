from collections import defaultdict
from datetime import datetime

from app.models import Driver
from app.services.sync.common import (
    apply_winner, fetch_json, get_or_create_season, new_report, upsert_circuit, upsert_driver, upsert_race, upsert_team,
)

BASE = "https://api.motogp.pulselive.com/motogp/v1/results"
EVENTS_URL = "https://api.motogp.pulselive.com/motogp/v1/events"
SMALL_WORDS = {"of", "the", "and", "de", "di", "da", "del"}


def _pretty(name: str) -> str:
    words = name.strip().lower().split()
    return " ".join(w if i and w in SMALL_WORDS else w.capitalize() for i, w in enumerate(words))


def _ids(year: int):
    season = next(s for s in fetch_json(f"{BASE}/seasons") if s["year"] == year)
    category = next(c for c in fetch_json(f"{BASE}/categories?seasonUuid={season['id']}") if c["name"].startswith("MotoGP"))
    return season["id"], category["id"]


def _classification(season_uuid: str, category_uuid: str) -> list:
    return fetch_json(f"{BASE}/standings?seasonUuid={season_uuid}&categoryUuid={category_uuid}").get("classification", [])


def _race_winner(event_uuid: str, category_uuid: str):
    sessions = fetch_json(f"{BASE}/sessions?eventUuid={event_uuid}&categoryUuid={category_uuid}")
    race_session = next((s for s in sessions if s.get("type") == "RAC"), None)
    if not race_session:
        return None
    rows = fetch_json(f"{BASE}/session/{race_session['id']}/classification?test=false").get("classification", [])
    return next((r for r in rows if r.get("position") == 1), None)


def _circuits_by_event(year: int) -> dict:
    """Fiches circuit indexées par identifiant d'événement : l'API résultats ne les
    fournit pas, mais l'API événements oui (relié via `toad_api_uuid`)."""
    result = {}
    for event in fetch_json(f"{EVENTS_URL}?seasonYear={year}"):
        circuit = event.get("circuit") or {}
        track = (circuit.get("tracks") or [{}])[0]
        if not circuit.get("id"):
            continue
        assets = track.get("assets") or {}
        length = (track.get("lenght_units") or {}).get("kiloMeters")
        corners = [int(track[k]) for k in ("left_corners", "right_corners") if str(track.get(k, "")).isdigit()]
        result[event["id"]] = {
            "external_id": circuit["id"],
            "name": circuit.get("name"),
            "city": circuit.get("city") or None,
            "country": circuit.get("country") or None,
            "length_km": float(length) if length else None,
            "turns": sum(corners) if corners else None,
            "image_url": (assets.get("simple") or {}).get("path"),
            "details": {
                "left_corners": track.get("left_corners"),
                "right_corners": track.get("right_corners"),
                "longest_straight_m": (track.get("longest_straight_units") or {}).get("meters"),
                "width_m": (track.get("width_units") or {}).get("meters"),
                "constructed": circuit.get("constructed"),
                "designer": circuit.get("designer"),
            },
        }
    return result


def sync(db, discipline, year: int) -> dict:
    report = new_report("motogp")
    season = get_or_create_season(db, discipline, year)
    season_uuid, category_uuid = _ids(year)

    for row in _classification(season_uuid, category_uuid):
        team = upsert_team(db, discipline, row["team"]["id"], row["team"]["name"])
        upsert_driver(db, discipline, row["rider"]["id"], row["rider"]["full_name"], team)
        report["drivers"] += 1

    events = []
    for finished in ("true", "false"):
        events += [e for e in fetch_json(f"{BASE}/events?seasonUuid={season_uuid}&isFinished={finished}") if not e.get("test")]

    circuits = _circuits_by_event(year)

    for event in events:
        is_finished = event.get("status") == "FINISHED"
        # Course le dimanche (dernier jour de l'événement), en début d'après-midi UTC
        start = datetime.fromisoformat(f"{event['date_end']}T12:00:00")
        info = circuits.get(event.get("toad_api_uuid"))
        circuit = None
        if info:
            ext = info.pop("external_id")
            circuit = upsert_circuit(db, discipline, ext, **info)
        race = upsert_race(db, season, event["id"], _pretty(event["name"]), start, is_finished, circuit)
        report["races"] += 1

        if is_finished and race.status != "finished":
            winner_row = _race_winner(event["id"], category_uuid)
            if winner_row:
                winner = db.query(Driver).filter(Driver.discipline_id == discipline.id, Driver.external_id == winner_row["rider"]["id"]).first()
                if not winner:
                    team = upsert_team(db, discipline, winner_row["team"]["id"], winner_row["team"]["name"])
                    winner = upsert_driver(db, discipline, winner_row["rider"]["id"], winner_row["rider"]["full_name"], team)
                apply_winner(db, race, winner, report)

    report["teams"] = db.query(Driver.team_id).filter(Driver.discipline_id == discipline.id).distinct().count()
    return report


def standings(year: int) -> dict:
    season_uuid, category_uuid = _ids(year)
    rows = _classification(season_uuid, category_uuid)
    drivers = [
        {"position": r.get("position"), "name": r["rider"]["full_name"], "team": r["team"]["name"],
         "points": float(r.get("points") or 0), "wins": int(r.get("race_wins") or 0)}
        for r in rows
    ]
    team_points = defaultdict(float)
    for d in drivers:
        team_points[d["team"]] += d["points"]
    teams = [{"position": i + 1, "name": name, "points": pts, "wins": None}
             for i, (name, pts) in enumerate(sorted(team_points.items(), key=lambda kv: -kv[1]))]
    return {"drivers": drivers, "teams": teams}
