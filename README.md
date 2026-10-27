# GridBook — Multi-sport

Plateforme de paris virtuels (monnaie APEX) sur les sports mécaniques, dérivée de GridBook.
Même base (FastAPI + React + MySQL), même identité visuelle, étendue à plusieurs championnats.
Chaque sport dispose de cinq pages : **dashboard, calendrier, classement, paris de saison, historique**.

## Sports et sources de données

Seuls les championnats disposant d'une **API publique et gratuite** fournissant calendrier,
engagés, résultats et classements sont intégrés. Les données sont importées par le backend
(`app/services/sync/`), et les paris des courses terminées sont **réglés automatiquement**
dès que l'API publie le vainqueur.

| Sport | Source | Données |
|---|---|---|
| Formule 1 | [Jolpica](https://api.jolpi.ca/ergast/f1/) (successeur d'Ergast) + [OpenF1](https://api.openf1.org) | calendrier, pilotes, écuries, vainqueurs, classements, télémétrie live |
| MotoGP | API résultats du site officiel (`api.motogp.pulselive.com`) | calendrier, pilotes, équipes, vainqueurs, classement |
| NASCAR Cup | flux du site officiel (`cf.nascar.com/cacher`) | calendrier, pilotes, écuries, vainqueurs, classement |

Les API MotoGP et NASCAR ne sont pas documentées officiellement : ce sont celles qu'utilisent
les sites eux-mêmes. Elles fonctionnent sans clé, mais peuvent changer sans préavis. En cas
d'indisponibilité, la synchronisation échoue proprement et les données déjà importées restent en place.

### Sports étudiés et écartés (pas d'API gratuite exploitable)

| Sport | Constat |
|---|---|
| WRC | pas d'API publique (`api.wrc.com` injoignable) ; seulement Sportradar (payant) ou des scrapers |
| Formula E | pas d'API publique ; Sportradar / SportsAPIPro (payants, clé requise) |
| IndyCar | Sportradar uniquement (payant, clé requise) |
| Endurance (WEC) | pas d'API ; archives de résultats Al Kamel (fichiers), sans calendrier ni engagés à venir |
| WorldSBK | l'API du site exige une authentification (HTTP 401) |
| DTM, Dakar | aucune source structurée trouvée |
| Formule 2 / Formule 3 | pages HTML uniquement, pas d'API documentée |

Ajouter un sport = écrire un adaptateur dans `app/services/sync/` (fonctions `sync` et
`standings`), l'enregistrer dans `ADAPTERS`, puis l'ajouter à `app/seed.py` et
`frontend/src/data/disciplines.js`.

## Boutique

Onglet **Boutique** (`/shop`), accessible à tous les joueurs. Les APEX y achètent des articles
**purement cosmétiques**, sans effet sur les paris ni sur les cotes, et jamais contre de l'argent réel.

| Catégorie | Effet |
|---|---|
| Avatar | emoji à la place de l'initiale |
| Cadre | couleur du contour de l'avatar (cadre légendaire animé) |
| Badge | pastille sur l'avatar |
| Titre | texte affiché sous le pseudo |
| Pseudo | couleur ou dégradé du pseudo (classements, menu du compte) |

| Rubrique | Contenu |
|---|---|
| À la une | collections mises en avant, éditions numérotées, liste de souhaits, articles les plus prisés |
| Catalogue | recherche, filtres (catégorie, rareté), tri, « masquer ce que je possède » |
| Collections | lots d'articles assortis, achetables en une fois avec une remise |
| Récompenses | articles non achetables, débloqués en jouant (progression affichée, bouton « Récupérer ») |
| Mon inventaire | articles possédés et historique des achats |
| Gestion (admin) | ventes et APEX dépensés par article, prix, mise à la une, retrait de la vente |

Règles appliquées par l'API (`app/routes/shop.py`) : un seul article équipé par catégorie,
achat définitif tracé dans les transactions du compte, éditions limitées dans le temps
(`available_until`), éditions numérotées (`stock`, numéro d'exemplaire attribué sous verrou),
récompenses impossibles à acheter et vérifiées au moment de la réclamation
(`app/services/rewards.py`).

Le catalogue est dans `app/services/shop_catalog.py` (7 collections, 45 articles, 6 récompenses).
Au démarrage, les articles manquants sont créés et leurs descriptions mises à jour ; le prix, la
mise en vente et la mise à la une d'un article existant restent ceux choisis par l'admin.
Idées pour la suite : `docs/boutique-contenu.md`.

## Sécurité

| Mesure | Où |
|---|---|
| Montants validés (nombres finis, positifs, ≤ 1 000 000) | `app/utils/validation.py` |
| Pseudo et mot de passe bornés ; erreurs 422 en français, sans la valeur saisie | `app/schemas/auth_schemas.py`, `app/utils/errors.py` |
| Limite de tentatives par visiteur (adresse réelle transmise par nginx, non falsifiable) | `app/utils/rate_limit.py`, `docker/frontend/proxy-api.inc` |
| Limites de débit, taille des requêtes, CSP et en-têtes de sécurité, version masquée | `docker/frontend/nginx.conf` |
| Base (3308) et API (8001) publiées sur `127.0.0.1` uniquement ; conteneurs sans privilèges, en lecture seule | `docker-compose.yml` |
| Documentation interactive de l'API désactivée (`ENABLE_API_DOCS=false`) | `app/main.py` |
| MySQL 8.4 LTS (la branche 8.0 n'a plus de correctifs depuis avril 2026) ; `root` limité au conteneur | `docker-compose.yml` |

Connexion à la base avec TablePlus : utiliser un tunnel SSH vers la machine, puis
`127.0.0.1:3308` (le port n'est plus ouvert au réseau).

Vérifier les dépendances : `cd frontend && npm audit` ; côté Python,
`pip-audit -r <(docker compose exec -T backend pip freeze)`.

GridBook n'utilise pas PHP : les failles PHP (comme PHP2Shell, octobre 2026) ne le concernent pas.

## Environnement

Cette stack est un **environnement de développement local** (pas une recette) :

- tout tourne sur `localhost`, en HTTP, avec `COOKIE_SECURE=false` ;
- la base (3308) et l'API (8001) sont joignables depuis la machine hôte (127.0.0.1) pour le débogage ;
- pas de SMTP : les liens « mot de passe oublié » s'affichent dans les logs du backend ;
- pas de rechargement à chaud : toute modification du code demande un rebuild (voir plus bas).

Pour en faire une **recette**, il faudrait : un serveur et un nom de domaine dédiés, HTTPS
(`COOKIE_SECURE=true`, `CORS_ORIGINS` / `FRONTEND_URL` sur le domaine), ne plus exposer les
ports 3308 et 8001 (déjà limités à la machine hôte), configurer le SMTP et des secrets propres, et déployer depuis une branche Git.

## Lancer le site

Prérequis : Docker et Docker Compose. Toutes les commandes se lancent depuis le dossier `Gridbook_new`.

### Premier lancement

```bash
cd Gridbook_new
cp .env.example .env      # puis remplacer chaque "change_me"
chmod 600 .env
docker compose up -d --build
```

Générer un `JWT_SECRET_KEY` :
`python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
Éviter les caractères `@ & % : /` dans les mots de passe.

Au premier démarrage, le backend crée les tables, ajoute les trois sports et le compte admin
défini dans `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), puis importe les données des API en
arrière-plan (quelques secondes).

| Service | Adresse |
|---|---|
| Site | http://localhost:5174 : compte admin `ADMIN_EMAIL` / `ADMIN_PASSWORD`, compte joueur de test `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` (sans droits admin) |
| API | http://localhost:5174/api (ou http://localhost:8001 depuis la machine hôte) ; documentation `/docs` si `ENABLE_API_DOCS=true` |
| MySQL | `127.0.0.1:3308`, base `DB_NAME`, utilisateur `DB_USER` |

Le site appelle l'API via `/api` (relais nginx) : seul le port 5174 a besoin d'être accessible
depuis le navigateur.

> Si `docker` répond « permission denied », l'utilisateur n'a pas encore les droits du groupe
> `docker` dans ce terminal : préfixer par `sg docker -c "..."` ou se reconnecter.

### Commandes courantes

| Action | Commande |
|---|---|
| État des conteneurs | `docker compose ps` |
| Logs du backend | `docker compose logs -f backend` |
| Appliquer une modification du code | `docker compose up -d --build` |
| Reconstruire seulement le site | `docker compose build frontend && docker compose up -d frontend` |
| Arrêter (données conservées) | `docker compose down` |
| Arrêter **et supprimer la base** | `docker compose down -v` |

### Où est la base ?

MySQL tourne dans le conteneur `gridbook_new-db-1`. Ses fichiers sont dans le volume Docker
`gridbook_new_db_data` (`/var/lib/docker/volumes/gridbook_new_db_data/_data`), pas dans ce
dossier. Le volume survit aux `down` et aux rebuilds ; seul `down -v` l'efface.
La structure des tables est définie dans `app/models/` et créée automatiquement au démarrage
(`app/migrations.py` ajoute les colonnes apparues ensuite).

### Publication derrière Traefik

Les trois environnements (dev, recette, production) passent par un reverse proxy Traefik commun,
qui choisit le site selon le nom de domaine : `dev-gridbook.visioninfo.fr`,
`rec-gridbook.visioninfo.fr`, `gridbook.visioninfo.fr`. Mise en place, réglages par environnement
et publication sur Internet : [`deploy/README.md`](deploy/README.md).

## Importer des données

### 1. Courses, pilotes, équipes, circuits, résultats : depuis les API

Rien à faire : la synchronisation tourne au démarrage puis toutes les `SYNC_INTERVAL_HOURS`
(6 h par défaut). Pour la forcer : **Admin Panel → choisir le sport → SYNC F1 / MOTOGP / NASCAR**.

La synchro porte sur la saison en cours, peut être relancée sans risque (pas de doublons) et
règle automatiquement les paris des courses terminées.

### 2. Un fichier SQL

```bash
docker compose exec -T db mysql -u gridbook -p GridBookNew < fichier.sql
```

Le mot de passe demandé est `DB_PASSWORD` (dans `.env`). Pour faire une sauvegarde :

```bash
docker compose exec -T db mysqldump -u gridbook -p GridBookNew > sauvegarde.sql
```

### 3. Avec un client graphique (TablePlus, DBeaver…)

Connexion MySQL sur `127.0.0.1`, port `3308` (depuis un autre poste : tunnel SSH vers la machine), utilisateur et mot de passe de `.env`, base
`GridBookNew`. Puis **Import → From SQL Dump** (fichier `.sql`) ou, sur une table,
**Import → From CSV**.

### Précautions

- **Ne pas importer tel quel un dump de l'ancien GridBook** : la structure a changé (tables
  `disciplines` et `circuits`, colonnes `external_id` et `circuit_id`, identifiant de saison
  = année pour la F1, `discipline_id × 10000 + année` pour les autres sports).
- Une course ajoutée à la main sans `external_id` peut être fusionnée par la synchro avec une
  course de l'API portant le même nom.
- Utilisateurs et crédits : passer par l'onglet **🧾 COMPTES** plutôt que par SQL (les
  mots de passe sont hachés et chaque mouvement de crédits crée une transaction).

## Interface

Style « broadcast » (applications officielles de sport mécanique) : la charte, les composants
communs et leurs règles d'usage sont décrits dans [`docs/design-system.md`](docs/design-system.md).

Pour travailler sur le frontend sans reconstruire l'image Docker :

```bash
cd frontend
VITE_API_URL=/api npx vite --port 5180   # /api est relayé vers le backend Docker (port 8001)
```

## Tests de bout en bout

`e2e/run.mjs` rejoue le parcours complet dans un vrai navigateur (Playwright) :

- côté joueur : inscription, les 3 championnats, un pari par championnat, un pari de saison,
  une annulation, achats en boutique ;
- côté admin : synchronisation, validation d'un résultat avec versement du gain, création de
  compte, crédit de solde, catalogue de la boutique ;
- contrôle de l'affichage mobile (390 px).

Les comptes et les données créés par le test sont supprimés à la fin.

```bash
cd e2e
npm install && npx playwright install --with-deps chromium   # une fois
BASE_URL=http://localhost:5174 node run.mjs
node screenshots.mjs ../e2e/screenshots 1440 full   # captures de toutes les pages (revue visuelle)
```

## Points d'API ajoutés par rapport à GridBook

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/disciplines/` | liste des sports |
| GET | `/seasons/?discipline=` | saisons d'un sport |
| GET | `/races/?discipline=`, `/races/{id}` | épreuves (avec vainqueur) |
| GET | `/drivers/?discipline=`, `/teams/?discipline=` | engagés |
| GET | `/standings/{discipline}` | classement officiel pilotes + équipes (cache 10 min) |
| GET | `/shop/products`, `/shop/collections`, `/shop/inventory` | catalogue (possédé, stock, fin de vente, progression des récompenses), collections et prix du lot, inventaire et historique |
| POST | `/shop/buy/{id}`, `/shop/collections/{slug}/buy` | achat d'un article ou d'une collection (débit + transaction) |
| POST | `/shop/rewards/{id}/claim`, `/shop/equip/{id}`, `/shop/wishlist/{id}` | récupérer une récompense, équiper / retirer, liste de souhaits |
| GET, PATCH | `/shop/admin/products`, `/shop/admin/products/{id}` | gestion admin : ventes, APEX dépensés, prix, mise à la une, mise en vente |
| POST | `/admin/sync/{discipline}` | import depuis l'API du sport + règlement des paris |
