import threading
import time

from fastapi import HTTPException, Request


class RateLimiter:
    """Limite le nombre d'appels par adresse IP sur une fenêtre glissante.

    Implémentation en mémoire volontairement simple : suffisante pour une
    seule instance de backend (pas de worker multi-process ni de cluster).
    """

    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def __call__(self, request: Request):
        # Derrière nginx, uvicorn (--proxy-headers) remplace l'adresse du conteneur nginx par
        # celle du visiteur, que nginx transmet dans X-Forwarded-For sans garder la valeur
        # envoyée par le client : un visiteur ne peut ni la falsifier ni bloquer les autres.
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            # Ménage périodique : sans lui, chaque adresse vue resterait en mémoire indéfiniment
            if len(self._hits) > 10_000:
                self._hits = {ip: ts for ip, ts in self._hits.items() if ts and ts[-1] > cutoff}
            hits = [t for t in self._hits.get(client_ip, []) if t > cutoff]
            if len(hits) >= self.max_calls:
                raise HTTPException(status_code=429, detail="Trop de tentatives, réessaie plus tard")
            hits.append(now)
            self._hits[client_ip] = hits
