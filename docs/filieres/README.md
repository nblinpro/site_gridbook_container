# GridBook 26-27 : guides de réalisation par filière

Un guide par filière, qui détaille comment réaliser chaque mission de la page de recrutement :
contexte, état actuel du code, étapes, pièges, tests et critères de fin.

| Filière | Guide | Places |
|---|---|---|
| Mastère 2 Expert en Développement Full Stack | [m2-full-stack.md](m2-full-stack.md) | 2 |
| Mastère 2 Social Média, Marketing d'influence & Événementiel | [m2-social-media.md](m2-social-media.md) | 2 |
| Mastère 2 Data Engineer | [m2-data-engineer.md](m2-data-engineer.md) | 1 |
| Mastère 2 Expert en Intelligence Artificielle | [m2-intelligence-artificielle.md](m2-intelligence-artificielle.md) | 1 |
| Mastère 1 UX-UI et IA pour le design d'interface | [m1-ux-ui.md](m1-ux-ui.md) | 1 |
| Bachelor 1 Informatique, option IA & Data | [b1-ia-data.md](b1-ia-data.md) | 1 |
| Bachelor 1 Informatique | [b1-informatique.md](b1-informatique.md) | 1 |

Le guide du Mastère 2 Expert Cloud, Sécurité & Infrastructure est rédigé séparément.

## Mise en route commune (filières techniques)

### 1. Récupérer le projet

```bash
git clone https://github.com/Pro-Nolan/GridBook.git
cd GridBook
git checkout staging
cp .env.example .env        # remplacer chaque « change_me »
chmod 600 .env
docker compose up -d --build
```

- Site : http://localhost:5174 (compte admin et compte joueur de test définis dans `.env`).
- La base se crée et se remplit seule au premier démarrage (synchronisation des API officielles).
- Tout est expliqué dans le `README.md` à la racine.

### 2. Développer sans reconstruire les images

```bash
cd frontend
npm install
VITE_API_URL=/api npx vite --port 5180    # http://localhost:5180, /api relayé vers le backend Docker
```

Le backend se reconstruit avec `docker compose up -d --build backend` après une modification Python.

### 3. À lire avant d'écrire du code

| Document | Pourquoi |
|---|---|
| `README.md` | lancement, données, sécurité, routes de l'API |
| `docs/design-system.md` | règles d'interface obligatoires (couleurs, typo, composants, accessibilité) |
| `docs/ameliorations.md` | liste complète des idées, dont celles de ce guide |
| `docs/boutique-contenu.md` | idées pour la boutique |
| `docs/cotes-et-bonus.md` | conception des cotes GridBook et du bonus outsider |

### 4. Règles de travail

1. **Jamais de commit sur `main`.** Une branche par sujet (`feature/profil-public`,
   `fix/session-longue`), puis une pull request vers `staging`, relue par un autre membre.
2. **Jamais de secret dans le dépôt** : mots de passe, clés et jetons restent dans `.env`
   (exclu de Git). Ajouter les nouvelles variables à `.env.example` avec `change_me`.
3. **Avant chaque pull request** :
   - `cd frontend && npm run lint` : 0 erreur ;
   - `cd e2e && BASE_URL=http://localhost:5180 node run.mjs` : tous les tests au vert ;
   - nouvelle fonctionnalité = nouveau test dans `e2e/run.mjs` ;
   - interface modifiée = captures à 1440 et 390 px (`node e2e/screenshots.mjs <dossier> 390 full`).
4. **Textes en français**, sans jargon technique dans l'interface (voir la charte).
5. **Jeu sans argent réel** : l'APEX n'a aucune valeur monétaire et ne s'achète jamais avec de
   l'argent. Toute fonctionnalité qui remettrait ce principe en cause est refusée.

### 5. Où se trouve quoi

| Dossier | Contenu |
|---|---|
| `app/models/` | tables (SQLAlchemy) |
| `app/routes/` | routes de l'API (`auth`, `bets`, `races`, `drivers`, `teams`, `disciplines`, `admin`, `shop`) |
| `app/services/sync/` | import des données F1, MotoGP, NASCAR |
| `app/services/settlement.py` | règlement des paris d'une course |
| `app/migrations.py` | ajout de colonnes aux tables existantes |
| `app/seed.py` | données de départ (championnats, admin, joueur de test, boutique) |
| `frontend/src/pages/` | pages React |
| `frontend/src/components/` | composants partagés (`Layout`, `ui/`, `bets/`, `cosmetics/`…) |
| `frontend/src/styles/` | charte (`theme.css`, `ui.css`) |
| `e2e/` | tests de bout en bout et captures d'écran |
