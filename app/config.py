import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

def _as_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


# Prefer a full DATABASE_URL in production.
# Fallback keeps local development simple if env vars are missing.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_user = os.getenv("DB_USER", "test")
    db_password = os.getenv("DB_PASSWORD", "azerty")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "test_db")
    DATABASE_URL = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

SQL_ECHO = _as_bool(os.getenv("SQL_ECHO"), default=False)
DB_POOL_RECYCLE = _as_int(os.getenv("DB_POOL_RECYCLE"), default=1800)
DB_CONNECT_TIMEOUT = _as_int(os.getenv("DB_CONNECT_TIMEOUT"), default=10)

connect_args = {"connect_timeout": DB_CONNECT_TIMEOUT}
ssl_ca = os.getenv("DB_SSL_CA")
if ssl_ca:
    connect_args["ssl"] = {"ca": ssl_ca}

engine = create_engine(
    DATABASE_URL,
    echo=SQL_ECHO,
    pool_pre_ping=True,
    pool_recycle=DB_POOL_RECYCLE,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
