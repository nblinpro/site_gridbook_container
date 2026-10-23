import logging

from sqlalchemy import inspect, text

from app.config import engine

logger = logging.getLogger(__name__)

# create_all() crée les tables manquantes mais n'ajoute jamais de colonne à une
# table existante : les colonnes apparues après la création de la base sont
# ajoutées ici, une seule fois (sans effet si elles existent déjà).
COLUMNS = [
    ("races", "circuit_id", "INT NULL", "FOREIGN KEY (circuit_id) REFERENCES circuits(id)"),
]


def migrate() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl, constraint in COLUMNS:
            if column in {c["name"] for c in inspector.get_columns(table)}:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            if constraint:
                conn.execute(text(f"ALTER TABLE {table} ADD {constraint}"))
            logger.info("Migration : colonne %s.%s ajoutée", table, column)
