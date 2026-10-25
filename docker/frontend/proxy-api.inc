# En-têtes transmis au backend. X-Forwarded-For est ÉCRASÉ par l'adresse réelle du visiteur
# (et non complété) : une valeur envoyée par le client ne peut pas se faire passer pour une autre IP.
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_read_timeout 120s;
