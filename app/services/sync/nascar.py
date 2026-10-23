from collections import Counter, defaultdict
from datetime import datetime

from app.models import Driver
from app.services.sync.common import (
    apply_winner, fetch_json, get_or_create_season, new_report, upsert_circuit, upsert_driver, upsert_race, upsert_team,
)

BASE = "https://cf.nascar.com/cacher"
CUP_SERIES = 1


def _driver_name(row: dict) -> str:
    name = f"{row.get('driver_first_name', '')} {row.get('driver_last_name', '')}".strip()
    if row.get("driver_suffix"):
        name += f" {row['driver_suffix']}"
    return name or row.get("driver_name", "Inconnu")


def _teams_by_driver() -> dict:
    # drivers.json donne l'écurie ; pour les pilotes inactifs, "Team" contient un simple numéro
    rows = fetch_json(f"{BASE}/drivers.json").get("response", [])
    return {
        int(r["Nascar_Driver_ID"]): r["Team"]
        for r in rows
        if r.get("Team") and not str(r["Team"]).isdigit()
    }


def _team_name(teams: dict, driver_id: int, fallback: str) -> str:
    return teams.get(driver_id) or fallback or "Écurie indépendante"


MILES_TO_KM = 1.609344


def _number(value, cast=float):
    try:
        return cast(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _tracks() -> dict:
    tracks = {}
    for t in fetch_json(f"{BASE}/tracks.json").get("items", []):
        miles = _number(t.get("length"))
        location = ", ".join(x for x in (t.get("city"), t.get("state")) if x)
        tracks[str(t["track_id"])] = {
            "name": t.get("track_name"),
            "city": location or None,
            "country": "États-Unis",
            "length_km": round(miles * MILES_TO_KM, 3) if miles else None,
            "turns": _number(t.get("track_num_turns"), int),
            "image_url": t.get("track_image") or None,
            "description": t.get("track_description") or None,
            "details": {
                "type": t.get("track_type"),
                "surface": t.get("track_surface"),
                "banking": t.get("track_banking"),
                "length_miles": miles,
                "year_built": t.get("year_built"),
                "capacity": t.get("capacity"),
                "major_events": t.get("track_major_events"),
            },
        }
    return tracks


def _unique_names(races: list) -> list:
    """La NASCAR réutilise des noms (Duels de Daytona, "Cook Out 400" sur deux circuits) :
    on précise le circuit, puis un numéro si deux courses homonymes ont lieu au même endroit."""
    counts = Counter(r["race_name"] for r in races)
    names = [f"{r['race_name']} — {r['track_name']}" if counts[r["race_name"]] > 1 else r["race_name"] for r in races]
    counts = Counter(names)
    seen = Counter()
    result = []
    for name in names:
        if counts[name] > 1:
            seen[name] += 1
            name = f"{name} #{seen[name]}"
        result.append(name)
    return result


def sync(db, discipline, year: int) -> dict:
    report = new_report("nascar")
    season = get_or_create_season(db, discipline, year)
    teams = _teams_by_driver()
    points = fetch_json(f"{BASE}/{year}/{CUP_SERIES}/points-feed.json")

    drivers_by_ext = {}
    for row in points:
        driver_id = int(row["driver_id"])
        team_name = _team_name(teams, driver_id, row.get("manufacturer"))
        team = upsert_team(db, discipline, team_name, team_name)
        drivers_by_ext[driver_id] = upsert_driver(db, discipline, str(driver_id), _driver_name(row), team)
    report["drivers"] = len(drivers_by_ext)

    tracks = _tracks()
    races = fetch_json(f"{BASE}/{year}/race_list_basic.json")[f"series_{CUP_SERIES}"]
    for race, name in zip(races, _unique_names(races)):
        winner_id = race.get("winner_driver_id") or 0
        start = datetime.fromisoformat(race["race_date"][:19])
        track_id = str(race.get("track_id"))
        circuit = upsert_circuit(db, discipline, track_id, **tracks[track_id]) if track_id in tracks else None
        row = upsert_race(db, season, str(race["race_id"]), name, start, winner_id > 0, circuit)
        report["races"] += 1
        if winner_id > 0:
            winner = drivers_by_ext.get(winner_id) or db.query(Driver).filter(
                Driver.discipline_id == discipline.id, Driver.external_id == str(winner_id)
            ).first()
            if winner:
                apply_winner(db, row, winner, report)

    report["teams"] = db.query(Driver.team_id).filter(Driver.discipline_id == discipline.id).distinct().count()
    return report


def standings(year: int) -> dict:
    teams = _teams_by_driver()
    rows = fetch_json(f"{BASE}/{year}/{CUP_SERIES}/points-feed.json")
    drivers = [
        {"position": r.get("position"), "name": _driver_name(r),
         "team": _team_name(teams, int(r["driver_id"]), r.get("manufacturer")),
         "points": float(r.get("points") or 0), "wins": int(r.get("wins") or 0)}
        for r in rows
    ]
    team_points = defaultdict(float)
    for d in drivers:
        team_points[d["team"]] += d["points"]
    team_list = [{"position": i + 1, "name": name, "points": pts, "wins": None}
                 for i, (name, pts) in enumerate(sorted(team_points.items(), key=lambda kv: -kv[1]))]
    return {"drivers": drivers, "teams": team_list}
