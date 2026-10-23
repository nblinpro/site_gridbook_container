from datetime import datetime

from app.services.sync.common import (
    apply_winner, fetch_json, get_or_create_season, new_report, upsert_circuit, upsert_driver, upsert_race, upsert_team,
)

BASE = "https://api.jolpi.ca/ergast/f1"


def _race_start(race: dict) -> datetime:
    time = (race.get("time") or "12:00:00Z").rstrip("Z")
    return datetime.fromisoformat(f"{race['date']}T{time}")


def _standings(year: int, kind: str) -> list:
    lists = fetch_json(f"{BASE}/{year}/{kind}.json?limit=100")["MRData"]["StandingsTable"]["StandingsLists"]
    return lists[0][kind[0].upper() + kind[1:-1] + "s"] if lists else []


def sync(db, discipline, year: int) -> dict:
    report = new_report("f1")
    season = get_or_create_season(db, discipline, year)

    drivers_by_ext = {}
    for row in _standings(year, "driverStandings"):
        constructor = row["Constructors"][-1]
        team = upsert_team(db, discipline, constructor["constructorId"], constructor["name"])
        d = row["Driver"]
        drivers_by_ext[d["driverId"]] = upsert_driver(db, discipline, d["driverId"], f"{d['givenName']} {d['familyName']}", team)
    report["drivers"] = len(drivers_by_ext)
    report["teams"] = len({drv.team_id for drv in drivers_by_ext.values()})

    winners = {}
    for race in fetch_json(f"{BASE}/{year}/results/1.json?limit=100")["MRData"]["RaceTable"]["Races"]:
        if race.get("Results"):
            winners[race["round"]] = race["Results"][0]["Driver"]["driverId"]

    for race in fetch_json(f"{BASE}/{year}.json?limit=100")["MRData"]["RaceTable"]["Races"]:
        c = race.get("Circuit") or {}
        circuit = upsert_circuit(
            db, discipline, c["circuitId"], name=c.get("circuitName"),
            city=(c.get("Location") or {}).get("locality"), country=(c.get("Location") or {}).get("country"),
        ) if c.get("circuitId") else None
        row = upsert_race(db, season, f"{year}-{race['round']}", race["raceName"], _race_start(race), race["round"] in winners, circuit)
        report["races"] += 1
        winner = drivers_by_ext.get(winners.get(race["round"]))
        if winner:
            apply_winner(db, row, winner, report)
    return report


def standings(year: int) -> dict:
    drivers = [
        {
            "position": int(r["position"]) if r.get("position") else None,
            "name": f"{r['Driver']['givenName']} {r['Driver']['familyName']}",
            "team": r["Constructors"][-1]["name"] if r.get("Constructors") else None,
            "points": float(r["points"]),
            "wins": int(r["wins"]),
        }
        for r in _standings(year, "driverStandings")
    ]
    teams = [
        {"position": int(r["position"]) if r.get("position") else None, "name": r["Constructor"]["name"], "points": float(r["points"]), "wins": int(r["wins"])}
        for r in _standings(year, "constructorStandings")
    ]
    return {"drivers": drivers, "teams": teams}
