# Mastère 2 Data Engineer : guide de réalisation

**1 place** · en binôme avec le Bachelor 1 IA & Data (`b1-ia-data.md`).

Objectif : des données plus fraîches, plus complètes et sur davantage de saisons, et plus
aucune intervention manuelle pour régler les paris.

Avant de commencer : [mise en route commune](README.md).

---

## État actuel utile

| Sujet | Où | État |
|---|---|---|
| Adaptateurs | `app/services/sync/f1.py`, `motogp.py`, `nascar.py` | chacun expose `sync(db, discipline, year)` et `standings(year)` |
| Outils communs | `app/services/sync/common.py` | `fetch_json`, `upsert_race`, `upsert_driver`, `upsert_team`, `upsert_circuit`, `apply_winner` |
| Orchestration | `app/services/sync/__init__.py` | `run_sync`, verrou, synchro en tâche de fond toutes les `SYNC_INTERVAL_HOURS` (6 h) |
| Classements | `get_standings`, route `GET /standings/{championnat}?year=` | cache de 10 min (`STANDINGS_TTL_SECONDS`), noms seulement (pas d'identifiants) |
| Règlement d'une course | `app/services/settlement.py` (`settle_race`) | appelé par la synchro quand le vainqueur est publié |
| Règlement d'une saison | `app/routes/admin.py` (`resolve_season`) | **manuel** : un admin choisit le champion |
| Identifiants externes | colonnes `external_id` sur courses, pilotes, équipes, circuits | permettent de relier les données de la source |

Sources :

| Championnat | API | Remarques |
|---|---|---|
| F1 | Jolpica (`api.jolpi.ca/ergast/f1`), OpenF1 (`api.openf1.org`) | Jolpica : historique depuis 1950 ; OpenF1 : données de séance depuis 2023 |
| MotoGP | `api.motogp.pulselive.com/motogp/v1` | non documentée officiellement, peut changer |
| NASCAR | `cf.nascar.com/cacher` | non documentée officiellement ; les images sont protégées par Cloudflare |

Disponibilité des classements vérifiée en octobre 2026 : **F1 depuis 1950** (constructeurs
depuis 1958), **MotoGP depuis 2010** (2002 fait planter l'adaptateur), **NASCAR depuis 2016**.

---

## Prérequis : tracer chaque mouvement d'APEX

Aujourd'hui `token_transactions` ne contient que les achats en boutique et les ajustements admin.
Les **mises, gains, remboursements et annulations de paris ne laissent aucune trace** : le solde
change sans écriture. Impossible, dans ces conditions, de mesurer l'économie du jeu ou de
vérifier un solde.

1. Écrire une transaction à chaque mouvement : mise (`bet.stake`), gain (`bet.payout`),
   annulation (`bet.refund`), réinitialisation d'une course par l'admin, bonus.
   Ajouter une colonne `kind` (catégorie) et `reference` (id du pari ou de l'achat).
2. Centraliser dans une fonction `move_apex(db, user, amount, kind, reason, reference)` qui
   modifie le solde **et** écrit la transaction ; remplacer toutes les modifications directes de
   `user.wallet` (`bets.py`, `settlement.py`, `admin.py`, `shop.py`).
3. Script de contrôle : pour chaque joueur, solde = 10 000 + somme des transactions. Toute
   différence est une anomalie à signaler.

À faire en tout premier, avec le M2 Full Stack qui touche aux mêmes fichiers.

---

## Mission 1 : synchronisation et nouveaux championnats

### 1.1 Synchro toutes les 15 min les week-ends de course

Aujourd'hui un gain peut arriver 6 h après la publication du résultat.

1. Remplacer l'intervalle fixe par un calcul à chaque tour de boucle :
   - **15 min** si une course du championnat a lieu entre J-1 et J+1 (lu dans `races`) ;
   - **6 h** sinon.
   Variables d'environnement `SYNC_INTERVAL_RACE_MINUTES=15` et `SYNC_INTERVAL_HOURS=6`.
2. Synchroniser championnat par championnat : un week-end F1 ne relance pas la NASCAR.
3. **Robustesse** :
   - délai d'attente et nouvelles tentatives avec attente croissante dans `fetch_json` ;
   - une erreur sur un championnat n'arrête pas les autres ;
   - respecter les limites des sources (Jolpica limite le nombre d'appels par seconde et par heure).
4. **Traçabilité** : table `sync_runs` (`discipline`, `started_at`, `finished_at`, `status`,
   `report` JSON, `error`). Le M2 Cloud branche la supervision dessus (durée, échecs).

**Fini quand** : un gain est versé moins de 15 min après la publication du résultat par la source,
et chaque synchronisation laisse une trace consultable.

### 1.2 Corriger l'adaptateur MotoGP avant 2010

`motogp.standings(2002)` lève un `TypeError`.

1. Reproduire : `docker compose exec backend python -c "from app.services.sync import motogp; motogp.standings(2002)"`.
2. Pistes : `_ids()` cherche une catégorie dont le nom commence par « MotoGP » (la catégorie
   reine s'appelait « 500cc » avant 2002) ; structure de la réponse `standings` différente selon
   les années (champs absents, `classification` vide).
3. Rendre l'adaptateur tolérant (champs absents, catégorie « 500cc » pour les années anciennes)
   et documenter l'année la plus ancienne réellement disponible.

### 1.3 Nouveaux championnats

Candidats écartés faute d'API gratuite : WEC, IndyCar, Formula E, WorldSBK (voir README).

1. Pour chacun, remplir une grille d'évaluation : source (gratuite, payante, saisie manuelle),
   données disponibles (calendrier, engagés, résultats, classements), stabilité, conditions
   d'utilisation, coût.
2. Pour un championnat retenu :
   - écrire l'adaptateur (`sync`, `standings`) sur le modèle des trois existants ;
   - l'enregistrer dans `ADAPTERS`, `app/seed.py` (`DISCIPLINES`) et
     `frontend/src/data/disciplines.js` (couleur, libellés, routes) ;
   - si aucune API n'existe : saisie par l'admin (formulaire calendrier + résultats), avec le
     M2 Full Stack.

---

## Mission 2 : palmarès des saisons passées

Conception fonctionnelle : `docs/ameliorations.md` § 3.1.

1. **Table `season_standings`** : `discipline_id`, `year`, `kind` (`driver` / `team`),
   `position`, `name`, `team`, `points`, `wins`, `external_id` ; unique
   (`discipline_id`, `year`, `kind`, `position`).
2. **Import historique** : script `python -m app.scripts.backfill_standings --discipline f1 --from 1950`
   - une année à la fois, pause entre les appels pour respecter les limites des sources ;
   - reprise possible (années déjà en base ignorées) ;
   - journal de ce qui a été importé et de ce qui a échoué.
3. **Saison terminée** : à la clôture d'une saison, enregistrer son classement final dans la
   table ; une saison passée ne se redemande plus jamais à la source.
4. **Routes** (format à valider avec le M2 Full Stack, qui fait la page) :
   - `GET /standings/{championnat}/years` : années disponibles ;
   - `GET /standings/{championnat}?year=AAAA` : lit la table pour une saison passée, la source
     pour la saison en cours.
5. **Contrôles qualité** (avec le B1 IA & Data) : nombre de pilotes plausible, points
   décroissants, champion connu pour quelques années de référence (F1 1990 : Ayrton Senna).

**Fini quand** : toutes les années disponibles sont en base, la page Palmarès répond sans appel
externe pour une saison passée, et un test E2E vérifie une année de référence par championnat.

---

## Mission 3 : règlement automatique et direct

### 3.1 Clôture automatique des saisons

Aujourd'hui les paris de saison restent « en cours » tant qu'un admin n'a pas choisi le champion.

1. **Extraire la logique** de `resolve_season` (`app/routes/admin.py`) dans
   `app/services/settlement.py` (`settle_season(db, season, bet_type, winner_id)`). La route
   admin l'appelle ; la synchronisation aussi.
2. **Identifiants dans les classements** : `standings()` ne renvoie que des noms. Ajouter
   l'identifiant externe du pilote et de l'équipe dans chaque adaptateur, pour retrouver
   `Driver` et `Team` sans comparer des noms.
3. **Déclenchement** : quand toutes les courses de la saison sont terminées **et** que
   48 h sont passées depuis la dernière (pénalités après course), la synchronisation lit le
   classement final et règle les deux marchés (pilotes, équipes).
4. Journaliser la clôture (journal admin du M2 Full Stack) ; la carte admin reste disponible
   pour corriger un cas particulier.

**Fini quand** : une saison se clôture seule, testée sur une saison rejouée en base de test.

### 3.2 Résultats complets (MotoGP, NASCAR, F1)

Prérequis des nouveaux marchés du M2 Full Stack (podium, pole, meilleur tour, duel, sprint, étapes).

1. **Table `race_results`** : `race_id`, `driver_id`, `position` (vide si abandon), `grid`,
   `status` (terminé, abandon, disqualifié), `points`, `gap`, `fastest_lap` (booléen),
   `session` (`race`, `sprint`, `stage:1`…).
2. **Import** :
   - F1 : Jolpica `/{année}/{manche}/results.json` et `/qualifying.json` ;
   - MotoGP : classements des séances `RAC`, `SPR` (sprint) et qualifications ;
   - NASCAR : flux de résultats de course et d'étapes (point d'accès à identifier dans
     `cf.nascar.com/cacher`).
3. Page de résultats pour MotoGP et NASCAR, sur le modèle de `pages/f1/RaceResults.jsx` (avec
   le M2 Full Stack).

### 3.3 Direct F1 (OpenF1)

1. Détecter une séance en cours (`/sessions` d'OpenF1).
2. Pendant la séance seulement : interroger `/position`, `/intervals`, `/laps` toutes les
   5 à 10 secondes **côté backend**, mettre en cache, et servir une route
   `GET /races/{id}/live`. Les navigateurs n'appellent jamais OpenF1 directement.
3. Afficher le direct uniquement quand il existe. Ne jamais présenter de données simulées.

### 3.4 Fiches pilotes et écuries

Nationalité, date de naissance, numéro, statistiques de la saison, forme récente (5 dernières
courses), historique des paris de la communauté. Vérifier les droits d'utilisation avant
d'afficher des photos.

---

## Mission 4 : économie du jeu

Une fois le prérequis « tracer chaque mouvement d'APEX » réalisé :

1. Route `GET /admin/economy?from=&to=` : par semaine,
   - APEX **créés** : bonus, crédits admin, gains supérieurs à la cagnotte (bonus outsider à venir) ;
   - APEX **détruits** : achats en boutique, débits admin, mises d'une course sans gagnant ;
   - APEX en circulation, solde moyen et médian, joueurs actifs, paris par championnat.
2. Graphiques dans l'administration (avec le M2 Full Stack) : courbe des APEX en circulation,
   barres créés / détruits par semaine.
3. Seuils d'alerte : circulation qui progresse de plus de X % par semaine.

**Fini quand** : l'admin voit l'évolution de l'économie semaine par semaine, et chaque chiffre
se retrouve dans les transactions.

---

## Planning

| Sprint | Travail |
|---|---|
| 1 | traçabilité des mouvements d'APEX, clôture automatique des saisons, `sync_runs` |
| 2 | palmarès (table, import historique, routes), correction MotoGP |
| 3 | synchro 15 min, résultats complets (`race_results`) |
| 4 | tableau de bord économique, appui aux cotes GridBook du M2 IA |
| Ensuite | direct F1, fiches pilotes, nouveaux championnats |

## Collaboration

| Avec | Pour |
|---|---|
| B1 IA & Data | contrôles qualité, images NASCAR, jeux de données |
| M2 Full Stack | pages Palmarès et résultats, nouveaux marchés, `move_apex` |
| M2 IA | historique complet pour le modèle Elo et le backtest |
| M2 Cloud | supervision des synchronisations, sauvegarde de la base avant chaque import massif |
