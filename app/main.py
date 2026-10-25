import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config import Base, engine
from app.routes import admin, auth, bets, disciplines, drivers, races, shop, teams
from app.migrations import migrate
from app.seed import seed
from app.services.sync import start_background_sync
from app.utils.errors import validation_error_handler

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

Base.metadata.create_all(bind=engine)
migrate()
seed()
if os.getenv("SYNC_ON_STARTUP", "true").lower() in {"1", "true", "yes", "on"}:
    start_background_sync()

# Documentation interactive (/docs, /redoc, /openapi.json) : utile en développement, mais elle
# publie la liste complète des routes. Désactivée par défaut, ENABLE_API_DOCS=true pour l'activer.
DOCS_ENABLED = os.getenv("ENABLE_API_DOCS", "false").lower() in {"1", "true", "yes", "on"}

app = FastAPI(
    title="GridBook API",
    description="Backend de la plateforme de paris sports mécaniques",
    version="2.0.0",
    docs_url="/docs" if DOCS_ENABLED else None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
)


app.add_exception_handler(RequestValidationError, validation_error_handler)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """En-têtes de sécurité sur toutes les réponses de l'API (nginx ajoute les siens au site)."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    # Les réponses de l'API sont propres à l'utilisateur connecté : jamais en cache partagé
    response.headers.setdefault("Cache-Control", "no-store")
    return response

cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
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
