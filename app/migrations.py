import logging

from sqlalchemy import inspect, text

from app.config import engine

logger = logging.getLogger(__name__)

# create_all() crée les tables manquantes mais n'ajoute jamais de colonne à une
# table existante : les colonnes apparues après la création de la base sont
# ajoutées ici, une seule fois (sans effet si elles existent déjà).
COLUMNS = [
    ("races", "circuit_id", "INT NULL", "FOREIGN KEY (circuit_id) REFERENCES circuits(id)"),
    # Boutique 2 : collections, éditions limitées et numérotées, récompenses à gagner
    ("products", "collection_id", "INT NULL", "FOREIGN KEY (collection_id) REFERENCES collections(id)"),
    ("products", "featured", "BOOLEAN NOT NULL DEFAULT FALSE", None),
    ("products", "available_from", "DATETIME NULL", None),
    ("products", "available_until", "DATETIME NULL", None),
    ("products", "stock", "INT NULL", None),
    ("products", "unlock_rule", "JSON NULL", None),
    ("products", "created_at", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP", None),
    ("purchases", "serial", "INT NULL", None),
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
