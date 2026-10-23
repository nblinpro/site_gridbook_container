import logging
from datetime import date, datetime

import requests
from sqlalchemy.orm import Session

from app.models import Circuit, Discipline, Driver, Race, Season, Team
from app.services.settlement import settle_race

logger = logging.getLogger(__name__)

HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (GridBook sync)", "Accept": "application/json"}


def fetch_json(url: str):
    response = requests.get(url, headers=HTTP_HEADERS, timeout=25)
    response.raise_for_status()
    return response.json()


def season_id_for(discipline: Discipline, year: int) -> int:
    # La F1 garde l'année comme identifiant de saison (convention historique de GridBook)
    return year if discipline.slug == "f1" else discipline.id * 10000 + year


def get_or_create_season(db: Session, discipline: Discipline, year: int) -> Season:
    season = db.query(Season).filter(Season.year == year, Season.discipline_id == discipline.id).first()
    if season:
        return season
    season = Season(
        id=season_id_for(discipline, year),
        year=year,
        start_date=date(year, 1, 1),
        end_date=date(year, 12, 31),
        is_active=year == datetime.utcnow().year,
        discipline_id=discipline.id,
    )
    db.add(season)
    db.flush()
    return season


def upsert_team(db: Session, discipline: Discipline, external_id: str, name: str) -> Team:
    team = db.query(Team).filter(Team.discipline_id == discipline.id, Team.external_id == external_id).first()
    if not team:
        team = db.query(Team).filter(Team.discipline_id == discipline.id, Team.name == name).first()
    if not team:
        team = Team(name=name, discipline_id=discipline.id)
        db.add(team)
    team.external_id = external_id
    team.name = name
    db.flush()
    return team


def upsert_driver(db: Session, discipline: Discipline, external_id: str, name: str, team: Team) -> Driver:
    driver = db.query(Driver).filter(Driver.discipline_id == discipline.id, Driver.external_id == external_id).first()
    if not driver:
        driver = Driver(name=name, discipline_id=discipline.id, team_id=team.id)
        db.add(driver)
    driver.external_id = external_id
    driver.name = name
    driver.team_id = team.id
    db.flush()
    return driver


def upsert_circuit(db: Session, discipline: Discipline, external_id: str, **fields) -> Circuit:
    circuit = db.query(Circuit).filter(Circuit.discipline_id == discipline.id, Circuit.external_id == external_id).first()
    if not circuit:
        circuit = Circuit(discipline_id=discipline.id, external_id=external_id)
        db.add(circuit)
    for key, value in fields.items():
        setattr(circuit, key, value)
    db.flush()
    return circuit


def upsert_race(db: Session, season: Season, external_id: str, name: str, start: datetime, finished: bool, circuit: Circuit | None = None) -> Race:
    race = (
        db.query(Race)
        .filter(Race.season_id == season.id, Race.external_id == external_id)
        .first()
    ) or (
        # Repli par nom uniquement pour une course pas encore liée à l'API :
        # sinon deux épreuves homonymes se disputeraient la même ligne
        db.query(Race)
        .filter(Race.season_id == season.id, Race.name == name, Race.external_id.is_(None))
        .first()
    )

    if not race:
        race = Race(season_id=season.id, name=name, status="upcoming", is_open=True)
        db.add(race)

    race.external_id = external_id
    race.name = name
    race.start_datetime = start
    if circuit is not None:
        race.circuit_id = circuit.id
    if race.status != "finished":
        # Le statut "finished" n'est posé qu'au règlement (vainqueur connu) ;
        # en attendant, les paris ferment dès le départ de l'épreuve.
        race.is_open = not finished and start > datetime.utcnow()
    db.flush()
    return race


def apply_winner(db: Session, race: Race, winner: Driver, report: dict) -> None:
    if race.status == "finished":
        return
    result = settle_race(db, race, winner)
    report["settled"] += 1
    report["bets_won"] += result["winners"]


def new_report(slug: str) -> dict:
    return {"discipline": slug, "teams": 0, "drivers": 0, "races": 0, "settled": 0, "bets_won": 0}
