import requests

try:
    r = requests.get("http://api.jolpica.net/ergast/f1/2025.json", timeout=5)
    print(f"Statut : {r.status_code}")
    print("Connexion réussie !")
except Exception as e:
    print(f"Erreur de connexion : {e}")
