FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --no-create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# --proxy-headers : l'adresse du visiteur vient de X-Forwarded-For, posé par nginx.
# Le port 8000 n'est publié que sur 127.0.0.1 (docker-compose) : seuls nginx et la machine
# hôte peuvent joindre le backend, personne d'autre ne peut injecter cet en-tête.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*", "--no-server-header"]
