import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Base, engine
from app.routes import admin, auth, bets, disciplines, drivers, races, shop, teams
from app.migrations import migrate
from app.seed import seed
from app.services.sync import start_background_sync

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

Base.metadata.create_all(bind=engine)
migrate()
seed()
if os.getenv("SYNC_ON_STARTUP", "true").lower() in {"1", "true", "yes", "on"}:
    start_background_sync()

app = FastAPI(
    title="GridBook API",
    description="Backend de la plateforme de paris sports mécaniques",
    version="2.0.0",
)

cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(races.router)
app.include_router(bets.router)
app.include_router(admin.router)
app.include_router(drivers.router)
app.include_router(teams.router)
app.include_router(disciplines.router)
app.include_router(shop.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "message": "GridBook API is revving up!",
        "version": "2.0.0",
    }
