from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Messages en français pour les erreurs de validation les plus courantes (types Pydantic v2)
MESSAGES = {
    "missing": "champ obligatoire",
    "string_too_short": "{min_length} caractères minimum",
    "string_too_long": "{max_length} caractères maximum",
    "string_pattern_mismatch": "caractères non autorisés (lettres, chiffres, espace, point, tirets)",
    "value_error": "valeur invalide",
    "int_parsing": "nombre entier attendu",
    "int_type": "nombre entier attendu",
    "float_parsing": "nombre attendu",
    "float_type": "nombre attendu",
    "finite_number": "nombre attendu",
    "bool_parsing": "vrai ou faux attendu",
    "json_invalid": "requête mal formée",
    "string_type": "texte attendu",
}


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Erreurs 422 sans la valeur reçue : par défaut FastAPI la renvoie (champ « input »),
    mot de passe compris, ce qui l'expose dans les journaux et les outils réseau."""
    detail = []
    for err in exc.errors():
        template = MESSAGES.get(err.get("type"))
        msg = template.format(**(err.get("ctx") or {})) if template else "valeur invalide"
        if err.get("type") == "value_error" and "email" in str(err.get("loc", "")):
            msg = "adresse e-mail invalide"
        detail.append({"loc": list(err.get("loc", [])), "msg": msg, "type": err.get("type")})
    return JSONResponse(status_code=422, content={"detail": detail})
