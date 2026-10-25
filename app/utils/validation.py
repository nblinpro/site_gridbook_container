import math

from fastapi import HTTPException

# Plafond d'un montant unique (mise, ajustement admin) : bien au-delà d'un solde réaliste,
# il protège surtout contre les valeurs absurdes (1e308) qui faussent les calculs.
MAX_AMOUNT = 1_000_000


def checked_amount(value: float, *, allow_negative: bool = False) -> float:
    """Montant en APEX validé : nombre fini, non nul, dans les bornes, arrondi au centime.

    JSON accepte NaN et Infinity côté Python : sans ce contrôle, `NaN <= 0` est faux et la
    valeur traversait toutes les vérifications jusqu'à la base de données.
    """
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        raise HTTPException(status_code=400, detail="Montant invalide")
    if value == 0 or (value < 0 and not allow_negative):
        raise HTTPException(status_code=400, detail="Le montant doit être positif")
    if abs(value) > MAX_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Montant trop élevé (maximum {MAX_AMOUNT:,} APEX)".replace(",", " "))
    return round(float(value), 2)
