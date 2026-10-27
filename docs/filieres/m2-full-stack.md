# Mastère 2 Expert en Développement Full Stack : guide de réalisation

**2 places** · un profil orienté backend (missions A et B), un profil orienté frontend
(missions C et D). Les deux relisent mutuellement leurs pull requests.

Objectif : construire les fonctionnalités qui font revenir les joueurs (social, nouveaux paris,
temps réel) et rendre le cœur du jeu plus solide (session, performances, tests).

Avant de commencer : [mise en route commune](README.md), puis `docs/design-system.md`.

---

## État actuel utile

| Sujet | Où | État |
|---|---|---|
| Connexion | `app/routes/auth.py`, `app/utils/jwt_handler.py` | jeton JWT dans un cookie httpOnly, **expire après 30 min**, sans renouvellement |
| Session expirée côté site | `frontend/src/services/apiClient.js`, `auth/AuthContext.jsx` | un 401 déconnecte le joueur avec un message |
| Paris de course | `app/routes/bets.py` (`/bets/place`, `/bets/my_bets`, `/bets/pool/{race_id}`) | un seul marché : le vainqueur (`bet_type = "race_win"`) |
| Règlement | `app/services/settlement.py` (`settle_race`) | pari mutuel : cote = cagnotte ÷ mises sur le vainqueur |
| Paris de saison | `/bets/place-season`, `/admin/resolve_season/{id}` | champion pilotes et équipes |
| Classement général | `/auth/leaderboard`, `pages/Leaderboard.jsx` | trié par **solde** |
| E-mails | `app/utils/email.py` (`send_email`) | SMTP vide en développement : le message part dans les journaux |
| Limiteur | `app/utils/rate_limit.py` | en mémoire, par adresse IP |
| Tests | `e2e/run.mjs` (36 tests Playwright) | **aucun test unitaire Python** |

---

## Mission A : Lead Backend, fiabilité et performances

### A1. Session longue (jeton de rafraîchissement)

**Problème** : le joueur est déconnecté toutes les 30 minutes, même en pleine navigation.

**Conception** :

| Jeton | Durée | Stockage | Rôle |
|---|---|---|---|
| Jeton d'accès (JWT existant) | 15 min | cookie httpOnly actuel | authentifie chaque requête |
| Jeton de rafraîchissement | 30 jours | cookie httpOnly `Path=/api/auth/refresh`, valeur aléatoire | obtient un nouveau jeton d'accès |

Étapes :

1. **Table `refresh_tokens`** (`app/models/refresh_token.py`) : `id`, `user_id`, `token_hash`
   (SHA-256, jamais le jeton en clair, comme `password_resets`), `expires_at`, `revoked_at`,
   `created_at`, `user_agent`.
2. **À la connexion et à l'inscription** (`auth.py`) : créer un jeton aléatoire
   (`secrets.token_urlsafe(48)`), enregistrer son empreinte, poser les deux cookies.
3. **Route `POST /auth/refresh`** :
   - lit le cookie, retrouve le jeton par son empreinte, vérifie qu'il n'est ni expiré ni révoqué ;
   - vérifie que le compte est toujours actif (un compte banni ne se rafraîchit pas) ;
   - **rotation** : révoque l'ancien jeton et en crée un nouveau à chaque appel ;
   - si un jeton déjà révoqué est présenté, révoquer **tous** les jetons du compte (vol probable).
4. **Déconnexion** : révoquer le jeton et effacer les deux cookies. **Bannissement**
   (`/admin/users/{id}/toggle-status`) : révoquer tous les jetons du compte.
5. **Frontend** (`apiClient.js`) : sur un 401, appeler une seule fois `/auth/refresh`, puis
   rejouer la requête ; si le rafraîchissement échoue, déclencher la déconnexion actuelle.
   Mutualiser l'appel quand plusieurs requêtes échouent en même temps.
6. Limite de débit sur `/auth/refresh` (le limiteur existe) et ajout de la route dans
   `docker/frontend/nginx.conf` si elle doit avoir sa propre limite.

**Tests** : connexion → jeton d'accès expiré (durée réduite par variable d'environnement en
test) → requête réussie après rafraîchissement ; réutilisation d'un vieux jeton → tous les jetons
révoqués ; compte banni → refus.

**Fini quand** : un joueur reste connecté 30 jours sans action, et une déconnexion ou un
bannissement coupe l'accès immédiatement.

### A2. « Mes paris » plus rapide

**Problème** : `/bets/my_bets` fait, pour **chaque** pari, des requêtes pour la course, le
pilote ou l'équipe, la saison et deux sommes de cagnotte. Avec 200 paris : plus de 1 000 requêtes.
Cette route est appelée à chaque changement de page (panneau « Mes paris en cours »).

Étapes :

1. Mesurer d'abord : compter les requêtes avec un écouteur SQLAlchemy
   (`event.listen(engine, "before_cursor_execute", …)`) sur un compte de test avec 200 paris.
2. Charger en une fois :
   - les paris du joueur ;
   - les courses, pilotes, équipes et saisons concernés (`IN (...)`, dictionnaires par id) ;
   - les cagnottes par course et par sélection avec un seul `GROUP BY (race_id, selection_id)`,
     et la même chose pour les paris de saison.
3. Garder **exactement** le même format de réponse (le frontend et les tests en dépendent).
4. Ajouter une pagination optionnelle (`?status=pending&limit=50`) : le panneau latéral n'a
   besoin que des paris en cours.

**Fini quand** : nombre de requêtes constant (moins de 10) quel que soit le nombre de paris,
temps de réponse divisé par 10 sur 200 paris, réponse identique avant et après.

### A3. Tests unitaires Python

Aucun test ne protège aujourd'hui les règles d'argent.

1. **Outils** : `pytest`, `httpx` (client de test FastAPI), fichier `requirements-dev.txt`.
2. **Base de test** : une base MySQL 8.4 dédiée (service `db-test` dans un
   `docker-compose.test.yml`), recréée à chaque session de tests. Éviter SQLite : le verrouillage
   (`with_for_update`), le JSON et les types diffèrent de MySQL.
3. **Fixtures** : session de base, client authentifié joueur, client authentifié admin,
   fabriques de course, pilote, pari.
4. **Tests prioritaires** :

| Domaine | Cas à couvrir |
|---|---|
| `settle_race` | un gagnant, plusieurs gagnants, aucun gagnant (cote 0), paris déjà réglés ignorés |
| Paris | montant invalide (NaN, négatif, trop élevé), course commencée, pilote d'un autre championnat, solde insuffisant |
| Annulation | remboursement exact, refus après le départ |
| Saisons | un seul pari actif par classement, règlement et répartition de la cagnotte |
| Boutique | achat, double achat, stock épuisé, numéro d'exemplaire unique, récompense non achetable, lot avec remise |
| Droits | route admin refusée à un joueur, admin qui ne peut pas se bannir |

5. Commande unique documentée dans le README : `docker compose -f docker-compose.test.yml run --rm tests`.

**Fini quand** : au moins 80 % de couverture sur `settlement.py`, `bets.py` et `shop.py`, et les
tests tournent dans la CI (préparée par le M2 Cloud et le B1 Informatique).

### A4. Journal d'activité admin

1. Table `admin_logs` : `id`, `admin_id`, `action` (`race.close`, `season.resolve`,
   `wallet.adjust`, `user.ban`, `user.promote`, `product.update`, `sync.run`…),
   `target_type`, `target_id`, `details` (JSON), `created_at`.
2. Fonction `log_admin_action(db, admin, action, target, **details)` appelée dans chaque route
   d'administration, dans la même transaction que l'action.
3. Route `GET /admin/logs?action=&admin_id=&page=` et un onglet « Journal » dans l'administration.

**Fini quand** : chaque action admin laisse une trace consultable, sans trou.

---

## Mission B : nouveaux paris

> Dépendance : les marchés autres que « vainqueur » ont besoin des **résultats complets**
> (classement entier, grille, meilleur tour), importés par le **M2 Data Engineer** (table
> `race_results`). Se coordonner dès le sprint 1.

### B1. Généraliser les marchés

Aujourd'hui `bets.bet_type` vaut `race_win`. Introduire la notion de **marché** :

| Marché | `market` | Gagnants | Championnats |
|---|---|---|---|
| Vainqueur (existant) | `win` | le 1er | tous |
| Podium | `podium` | les 3 premiers | tous |
| Pole position | `pole` | 1er sur la grille | F1, MotoGP |
| Meilleur tour | `fastest_lap` | auteur du meilleur tour | F1 |
| Duel entre coéquipiers | `duel:<team_id>` | le mieux classé des deux | F1 |
| Vainqueur du sprint | `sprint_win` | 1er du sprint | MotoGP |
| Vainqueur d'étape | `stage:<n>` | 1er de l'étape n | NASCAR |

Étapes :

1. Colonne `bets.market` (VARCHAR, défaut `win`) via `app/migrations.py` ; remplir `win` pour
   l'existant.
2. `POST /bets/place` accepte `market` ; validation : marché disponible pour ce championnat,
   sélection valide (un duel n'accepte que les deux pilotes de l'écurie).
3. Cagnottes **par marché** : `/bets/pool/{race_id}?market=` ; `my_bets` renvoie le marché.
4. Généraliser `settle_race` en `settle_market(db, race, market, winner_ids)` : cote =
   cagnotte du marché ÷ mises sur l'ensemble des sélections gagnantes. Le podium a 3 sélections
   gagnantes.
5. La synchronisation appelle le règlement de chaque marché quand les résultats complets sont
   disponibles.
6. **Interface** (`PlaceBet.jsx`) : onglets de marché au-dessus du bulletin
   (Vainqueur · Podium · Pole · …), libellés du championnat (`data/disciplines.js`).

**Fini quand** : trois nouveaux marchés en ligne et réglés automatiquement, avec un test E2E
chacun et des tests unitaires de règlement.

### B2. Paris combinés

Un combiné multiplie les cotes de plusieurs sélections. **Impossible en pari mutuel pur** :
il faut une cote connue au moment du pari. Ce sujet démarre donc **après** les cotes GridBook du
M2 IA (`docs/cotes-et-bonus.md`).

1. Tables `bet_slips` (`id`, `user_id`, `amount`, `combined_odds`, `status`) et
   `bet_slip_legs` (`slip_id`, `race_id`, `market`, `selection_id`, `model_odds`, `status`).
2. Cote combinée = produit des cotes GridBook figées, **plafonnée** (ex. 100) ; gain maximal
   plafonné (ex. 50 000 APEX). 2 à 5 sélections, sur des courses différentes.
3. Règlement : perdu dès qu'une sélection perd ; payé quand toutes sont gagnées.
4. Interface : bouton « Ajouter au combiné » sur chaque course, panneau combiné dans la colonne
   latérale.

### B3. Grille de pronostics (mode gratuit)

1. Table `predictions` : `user_id`, `race_id`, `top10` (JSON, 10 ids de pilotes), `points`,
   `created_at` ; unique (`user_id`, `race_id`), modifiable jusqu'au départ.
2. Barème : 10 points par position exacte, 3 points à une place près, 1 point si le pilote est
   dans le top 10. Calcul au règlement de la course.
3. Classement des pronostiqueurs par saison et par championnat.
4. Interface : glisser-déposer accessible au clavier (boutons monter/descendre) sur la page de la course.

### B4. Bonus de connexion et avance

1. `POST /auth/daily-bonus` : 50 APEX une fois par jour civil (colonne
   `users.last_daily_bonus`), transaction « Bonus quotidien ».
2. Avance : si le solde est sous 100 APEX et qu'aucun pari n'est en cours, 500 APEX une fois par
   semaine.
3. Bouton « Récupérer mon bonus » dans le menu du compte quand il est disponible.

### B5. Classement par bénéfice

`GET /auth/leaderboard?sort=profit&season=2026` : bénéfice net = gains des paris réglés moins
leurs mises, sur la saison ; taux de réussite affiché à partir de 10 paris réglés. Onglets sur
`Leaderboard.jsx` : Solde · Bénéfice · Taux de réussite.

---

## Mission C : Lead Frontend, social

### C1. Profil public

1. **Route** `GET /players/{username}` (joueurs connectés uniquement) : pseudo, cosmétiques
   équipés, date d'inscription, statistiques (paris réglés, taux de réussite, meilleure cote
   gagnée, championnat préféré), 10 derniers paris **réglés** (jamais les paris en cours, qui
   renseigneraient les autres joueurs), récompenses obtenues, articles possédés.
   **Jamais l'e-mail ni le solde exact** (proposer une tranche si besoin).
2. **Page** `/joueurs/:username` : en-tête avec avatar, couleur de pseudo et titre (composants
   `UserAvatar`, `UserName`), statistiques en tuiles, vitrine des cosmétiques, historique.
3. Liens vers le profil depuis le classement général, le classement des parieurs et le menu du
   compte (« Mon profil »).
4. Réglage « Profil privé » (colonne `users.profile_public`) : la page affiche alors seulement
   le pseudo et l'avatar.

**Fini quand** : profil accessible depuis tous les classements, sans fuite d'information privée
(test E2E qui vérifie l'absence de l'e-mail et des paris en cours).

### C2. Ligues privées

| Table | Colonnes |
|---|---|
| `leagues` | `id`, `name`, `owner_id`, `invite_code` (unique, aléatoire, 10 caractères), `season_year`, `created_at` |
| `league_members` | `league_id`, `user_id`, `joined_at`, unique (`league_id`, `user_id`) |

Routes : créer, rejoindre par code, quitter, exclure un membre (propriétaire), régénérer le
code, liste de mes ligues, détail avec classement interne (bénéfice depuis l'entrée dans la
ligue, ou points de la grille de pronostics).

Limites : 50 membres par ligue, 10 ligues par joueur, nom de 3 à 40 caractères.

Interface : `/ligues` (mes ligues + créer + rejoindre), `/ligues/:id` (classement, membres,
lien d'invitation à copier), `/ligues/rejoindre/:code` (page d'accueil d'une invitation).

### C3. Suivre des joueurs

Table `follows` (`follower_id`, `followed_id`). Fil « Joueurs suivis » qui montre leurs
pronostics **uniquement après la fermeture du marché** de la course (pour ne pas recopier).

### C4. Partager un pari gagnant

Image générée côté navigateur (élément `canvas`) : nom de la course, pilote, cote, gain, pseudo
et avatar, logo GridBook. Partage natif sur mobile (Web Share API) ou téléchargement. Mention
« Jeu sans argent réel » toujours présente sur l'image.

### C5. Palmarès et accueil personnalisé

- **Palmarès** : page `/{championnat}/palmares` construite sur les routes du M2 Data
  (`/standings/{championnat}/years`, `/standings/{championnat}?year=`). Réutiliser les tableaux
  de `SportStandings.jsx` ; ajouter le podium du champion et le sélecteur d'année.
- **Accueil personnalisé** (`SportsHome.jsx`) : championnat le plus joué en premier, bloc « Tes
  paris qui se règlent bientôt ».

---

## Mission D : temps réel et notifications

### D1. Discussion par course (WebSocket)

Conception détaillée dans `docs/ameliorations.md` § 2.1. Réalisation :

1. **Tables** : `race_messages` (`id`, `race_id`, `user_id`, `content` ≤ 500, `created_at`,
   `deleted_at`, `deleted_by`) et `message_reports` (`message_id`, `reporter_id`, `reason`,
   `created_at`, unique par signaleur).
2. **Historique** : `GET /races/{id}/messages?before=<id>&limit=50`.
3. **Temps réel** : `WebSocket /ws/races/{id}` dans FastAPI.
   - Identifier le joueur avec le cookie (`websocket.cookies`) et le même contrôle que
     `get_current_user` ; refuser un compte banni.
   - Un gestionnaire de connexions en mémoire par course ; diffusion de chaque nouveau message.
   - Limite : 1 message toutes les 3 secondes par joueur, 500 caractères, filtre de mots.
   - Fil en lecture seule 24 h après l'arrivée.
4. **nginx** (`docker/frontend/nginx.conf`) : une route `/api/ws/` avec
   `proxy_http_version 1.1`, `Upgrade` et `Connection`. À valider avec le M2 Cloud
   (Traefik prendra le relais en production).
5. **Modération** : bouton « Signaler », file des messages signalés dans l'administration,
   suppression (le message devient « Message supprimé par la modération »), journal admin.
6. **Interface** : panneau « Discussion » sur la page de la course ; reconnexion automatique
   avec délai croissant ; badge « A parié sur … » affiché après la fermeture du marché.
7. **Tests E2E** : deux navigateurs qui échangent, signalement puis suppression, refus d'un
   compte banni.

Passage à plusieurs instances du backend : diffusion par Redis (mission du M2 Cloud).

### D2. Notifications

1. Table `notifications` (`user_id`, `type`, `payload` JSON, `created_at`, `read_at`,
   `emailed_at`) et préférences par type (`notification_prefs`).
2. **Déclencheurs** :
   - pari gagné ou perdu : à la fin du règlement, **après** la validation de la transaction ;
   - départ dans 1 heure pour une course où le joueur a parié : tâche périodique (même
     principe que la synchronisation en arrière-plan) ;
   - nouvelle collection en boutique : action admin.
3. **Envoi** : cloche dans la barre supérieure (non lues), e-mail via `send_email` (SMTP
   configuré par le M2 Cloud), lien de désinscription dans chaque e-mail.
4. Jamais d'e-mail envoyé dans une transaction : file `notifications` traitée par la tâche
   périodique.

### D3. Application installable (PWA)

1. `vite-plugin-pwa` : manifeste (nom, icônes 192 et 512 px, couleur `#0b0b0f`), service worker,
   page hors ligne.
2. Notifications push du navigateur (Web Push, clés VAPID dans `.env`, `pywebpush` côté
   backend), avec consentement explicite.
3. Ajuster la CSP de nginx (`worker-src 'self'`, `manifest-src 'self'`) avec le M2 Cloud.

### D4. Version anglaise

1. `react-i18next` : extraire tous les textes de l'interface dans `locales/fr.json` et
   `locales/en.json`, page par page.
2. Dates et nombres avec la langue choisie (`utils/format.js` utilise aujourd'hui `fr-FR`).
3. Erreurs de l'API : ajouter un champ `code` stable aux réponses d'erreur, traduit côté site.
4. Choix de la langue dans le menu du compte, mémorisé.

---

## Intégration des cotes GridBook (avec le M2 IA)

Le M2 IA fournit le calcul (table `odds`, fonction de recalcul). Le Full Stack réalise :

- `GET /races/{id}/odds` (format défini dans `docs/cotes-et-bonus.md` § 5) ;
- enregistrement de `bets.model_odds` au moment du pari (§ 7) ;
- affichage sur la page de pari : cote GridBook à côté de la cote mutuelle, badges
  « Favori » / « Outsider », tri, courbe d'évolution, lien « Pourquoi cette cote ? ».

---

## Planning

| Sprint | Backend (A, B) | Frontend (C, D) |
|---|---|---|
| 1 | session longue, « Mes paris », socle de tests unitaires | profil public (route + page) |
| 2 | marchés généralisés + podium, classement par bénéfice | palmarès, accueil personnalisé, ligues privées |
| 3 | pole et duel, journal admin, bonus de connexion | discussion par course, notifications |
| 4 | intégration des cotes GridBook, grille de pronostics | affichage des cotes, PWA |
| Ensuite | paris combinés | version anglaise, partage d'image, suivre des joueurs |

## Collaboration

| Avec | Pour |
|---|---|
| M2 Data Engineer | résultats complets (`race_results`), palmarès, clôture automatique des saisons |
| M2 IA | cotes GridBook, bonus outsider, combinés |
| M1 UX-UI | maquettes de chaque nouvelle page **avant** de coder |
| M2 Cloud | WebSocket derrière le proxy, SMTP, CSP, Redis, CI |
| B1 Informatique | binôme sur le bandeau d'annonces, la création d'articles, les récompenses |
