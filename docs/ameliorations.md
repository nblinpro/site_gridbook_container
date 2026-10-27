# Améliorations possibles du site

Liste d'idées pour faire progresser GridBook, classées par thème puis par priorité.
Chaque idée part de l'état actuel du code (octobre 2026, version 2.1.0) ; seules les idées
encore à réaliser figurent ici.

Légende de l'effort : **S** quelques heures · **M** 1 à 3 jours · **L** une semaine ou plus.

## Les 9 priorités

| # | Amélioration | Pourquoi | Effort |
|---|---|---|---|
| 1 | Clôture automatique des saisons | aujourd'hui les paris de saison restent « en cours » tant qu'un admin ne choisit pas le champion | S |
| 2 | Session qui ne coupe pas au bout de 30 min | le jeton de connexion expire après 30 minutes, sans renouvellement : le joueur est déconnecté en pleine navigation | S |
| 3 | Page profil publique | les cosmétiques achetés n'ont pas de vitrine ; les joueurs n'ont pas de statistiques personnelles | M |
| 4 | Cotes GridBook et bonus outsider | rend les cotes crédibles même avec peu de joueurs (voir `cotes-et-bonus.md`) | L |
| 5 | Ligues privées entre amis | la principale raison de revenir sur un jeu de pronostics | M |
| 6 | Notifications de résultats | le joueur ne sait pas qu'il a gagné tant qu'il ne revient pas sur le site | M |
| 7 | Nouveaux types de paris (podium, pole, duel) | une seule question par course (« qui gagne ? »), c'est vite répétitif | M |
| 8 | Intégration continue (lint + E2E à chaque push) | les 36 tests E2E existent mais ne tournent qu'à la main | S |
| 9 | Environnement de recette | le site n'existe qu'en local ; impossible de le montrer ou de tester en conditions réelles | M |

## 1. Jeu et pronostics

- **Clôture automatique des saisons** (S) : quand la dernière course est réglée, la
  synchronisation lit le classement final (déjà importé par `/standings`) et règle les paris
  de saison. La carte admin reste comme secours (pénalité après course).
- **Cotes basées sur les données et bonus outsider** (L) : conception détaillée dans
  `docs/cotes-et-bonus.md`.
- **Nouveaux marchés** (M) : podium, pole position, meilleur tour, duel entre coéquipiers,
  premier abandon, vainqueur du sprint MotoGP, vainqueur d'étape NASCAR. Les données existent
  dans les API déjà utilisées.
- **Paris combinés** (M) : plusieurs sélections dont les cotes se multiplient (vainqueurs F1 +
  MotoGP du même week-end).
- **Grille de pronostics** (M) : prédire le top 10 complet d'une course, avec des points selon
  la justesse, sans mise. Un mode gratuit qui fait revenir les joueurs à court d'APEX.
- **Bonus de connexion** (S) : quelques APEX par jour de connexion, ou une avance pour les
  joueurs tombés à zéro, pour ne pas les perdre définitivement.
- **Classement plus juste** (S) : aujourd'hui le classement général trie par solde. Ajouter un
  classement par bénéfice net sur la saison et par taux de réussite (minimum 10 paris), pour
  que l'argent dépensé en boutique ne pénalise pas.

## 2. Social et communauté

- **Page profil publique** (M) : avatar et cosmétiques, statistiques (taux de réussite,
  championnat préféré, meilleure cote gagnée), derniers paris réglés, succès obtenus.
- **Ligues privées** (M) : créer une ligue, inviter par lien, classement interne sur la saison,
  éventuellement un « commissaire » de ligue.
- **Discussion par course** (M, environ 2 jours) : un fil de discussion en temps réel sur la page
  de chaque course. Détail au § 2.1.
- **Suivre des joueurs** (S) : voir les pronostics des joueurs suivis après la clôture du marché.
- **Partage** (S) : image générée d'un pari gagnant (« J'ai gagné 1 240 APEX sur Norris à 12,40 »)
  à partager sur les réseaux.

### 2.1 Discussion par course

C'est la fonctionnalité qui fait le plus revenir les joueurs pendant un week-end de course. Elle
donne aussi de la valeur à la boutique : réactions personnalisées, couleur du pseudo et badges
se voient dans le fil.

**Fonctionnement**

| Partie | Comment |
|---|---|
| Stockage | table `race_messages` : course, auteur, texte, date, supprimé ou non |
| Historique | `GET /races/{id}/messages` : derniers messages, avec pagination |
| Temps réel | WebSocket `/ws/races/{id}` (géré nativement par FastAPI) ; le cookie de connexion actuel identifie le joueur |
| Serveur web | autoriser les WebSockets dans `docker/frontend/nginx.conf` (en-têtes `Upgrade` et `Connection`) |
| Interface | panneau « Discussion » sur la page de la course : avatar et cosmétiques de chaque joueur, réactions, nombre de connectés |

Avec un seul backend, la diffusion des messages se fait en mémoire. Avec plusieurs instances en
production, passer par Redis (publication / abonnement).

**Règles**

- **Ouverture** : tout le week-end de course. Le fil passe en lecture seule 24 h après l'arrivée
  et reste consultable.
- **Anti-spam** : le limiteur de débit existe déjà (`app/utils/rate_limit.py`) ; par exemple
  1 message toutes les 3 secondes, 500 caractères maximum, filtre de mots.
- **Modération** :
  - bouton « Signaler » sur chaque message ;
  - suppression par un admin, avec une file des messages signalés dans l'administration ;
  - un compte banni (déjà possible) perd l'accès au fil.

  C'est aussi une obligation légale : en tant qu'hébergeur des messages, GridBook doit retirer
  rapidement un contenu signalé s'il est manifestement illicite.
- **Pronostics visibles** : badge « A parié sur Norris » à côté du pseudo, affiché seulement
  après la clôture du marché pour ne pas orienter les paris.

**Tests** : ajouter à `e2e/run.mjs` un scénario à deux navigateurs (deux joueurs qui échangent en
même temps), le signalement puis la suppression par l'admin, et l'accès refusé à un compte banni.

## 3. Données et direct

- **Suivi en direct des courses** (L) : OpenF1 publie les positions et les écarts pendant les
  séances F1. Afficher un vrai direct pendant la course (et seulement à ce moment-là, l'ancien
  widget simulé a été retiré pour cette raison).
- **Résultats complets** (M) : la page de résultats détaillée n'existe que pour la F1. La
  généraliser à MotoGP et NASCAR (classement complet, écarts, abandons).
- **Palmarès des saisons précédentes** (M) : une rubrique « Palmarès » par championnat avec le
  classement final pilotes et équipes de chaque année passée. Détail au § 3.1.
- **Fiches pilotes et écuries** (M) : photo, nationalité, statistiques de la saison, forme
  récente, historique des paris de la communauté sur le pilote.
- **Images des circuits NASCAR en local** (S) : nascar.com bloque les images (protection
  Cloudflare). Les héberger dans `frontend/public/`, comme celles de la F1.
- **Synchronisation plus fréquente le week-end** (S) : toutes les 6 heures, un gain peut
  arriver jusqu'à 6 heures après l'arrivée. Passer à 15 minutes pendant les week-ends de course.
- **Nouveaux championnats** (L) : WEC, IndyCar, Formula E et WorldSBK ont été écartés faute
  d'API gratuite (voir README). Possibles avec une API payante (Sportradar) ou une saisie
  manuelle par l'admin.

### 3.1 Palmarès des saisons précédentes

Une rubrique « Palmarès » dans la sous-navigation de chaque championnat, avec un sélecteur
d'année : classement final des pilotes et des équipes, champion mis en avant (podium), nombre de
victoires et écart au champion. Elle donne du contexte aux paris de saison (« qui gagne
d'habitude ? ») et à la future fiche pilote.

**Données disponibles** (vérifié avec les adaptateurs actuels) :

| Championnat | Années disponibles | Remarque |
|---|---|---|
| F1 | depuis 1950 | classement constructeurs seulement depuis 1958, année de sa création |
| MotoGP | vérifié depuis 2010 | pour 2002 l'adaptateur échoue : à corriger pour remonter plus loin |
| NASCAR | depuis 2016 | les années plus anciennes ne sont pas publiées par la source |

**Ce que ça demande**

| Partie | Changement |
|---|---|
| API | rien à créer : `GET /standings/{championnat}?year=AAAA` accepte déjà une année. Ajouter `GET /standings/{championnat}/years` (années disponibles) |
| Cache | une saison terminée ne change plus : la garder en cache longtemps (aujourd'hui 10 minutes), ou l'enregistrer en base pour ne plus interroger la source |
| Interface | page `/{championnat}/palmares` : sélecteur d'année, podium du champion, tableaux pilotes et équipes (réutiliser `SportStandings`) |
| Navigation | lien « Palmarès » dans la sous-navigation du championnat |
| Tests | une année passée par championnat dans `e2e/run.mjs` (ex. F1 1990 : Ayrton Senna champion) |

Extension possible : une page « Champions » par championnat qui liste le champion de chaque année
(tableau d'honneur), et le nombre de titres par pilote.

## 4. Expérience utilisateur

- **Session longue** (S) : jeton de rafraîchissement, ou durée de vie de plusieurs jours avec
  renouvellement à chaque visite, au lieu des 30 minutes actuelles.
- **Notifications** (M) : e-mail ou notification du navigateur pour « ta course commence dans
  1 heure », « tu as gagné », « nouvelle collection en boutique ». Le SMTP est déjà prévu dans
  `.env` mais vide : aujourd'hui même le lien « mot de passe oublié » n'est visible que dans les
  logs du backend.
- **Application installable (PWA)** (M) : icône sur l'écran d'accueil du téléphone, chargement
  plus rapide, notifications push.
- **Version anglaise** (M) : tous les textes sont en dur en français ; les extraire vers des
  fichiers de traduction ouvrirait le site à un public international.
- **Accueil personnalisé** (S) : mettre en avant le championnat préféré du joueur et ses paris
  qui se règlent bientôt.
- **Thème clair** (M) : la charte est entièrement en variables (`theme.css`), un thème clair se
  limite surtout à redéfinir les couleurs.

## 5. Administration

- **Tableau de bord économique** (M) : APEX en circulation, APEX créés (gains, crédits admin) et
  détruits (mises perdues, boutique) par semaine, joueurs actifs, paris par championnat.
  Aujourd'hui, seul le total des APEX dépensés en boutique est visible (gestion de la boutique).
- **Journal d'activité admin** (S) : qui a validé quel résultat, crédité quel compte, retiré quel
  article. Les ajustements de solde sont déjà tracés, pas les autres actions.
- **Création d'articles depuis l'interface** (S) : aujourd'hui le catalogue vient de
  `app/services/shop_catalog.py` ; l'admin peut seulement changer les prix, mettre un article à
  la une et le retirer de la vente. Même chose pour les collections.
- **Annonces** (S) : bandeau d'information sur le site (maintenance, nouvelle collection).

## 6. Qualité, sécurité et exploitation

- **Intégration continue** (S) : GitHub Actions qui lance `npm run lint`, la construction des
  images et `e2e/run.mjs` à chaque push sur `staging`.
- **Tests du backend** (M) : il n'y a pas de tests unitaires Python (`test_api.py` ne fait que
  tester la connexion à Jolpica). Priorité : `settle_race`, règlement des paris de saison,
  achats en boutique, droits admin.
- **Performance de « Mes paris »** (S) : `/bets/my_bets` fait plusieurs requêtes SQL par pari
  (course, pilote, cagnotte, saison). Avec beaucoup de paris, la page et le panneau latéral
  ralentiront. À regrouper en quelques requêtes avec des jointures.
- **Limitation de débit partagée** (S) : le limiteur est en mémoire, pour un seul processus. En
  production avec plusieurs instances, le passer sur Redis.
- **Environnement de recette** (M) : serveur et nom de domaine dédiés, HTTPS
  (`COOKIE_SECURE=true` et en-tête HSTS, déjà préparé en commentaire dans `nginx.conf`), SMTP
  configuré, déploiement depuis une branche Git (le README détaille les étapes).
- **Sauvegardes de la base** (S) : `mysqldump` quotidien et automatique vers un stockage externe,
  avec un test de restauration (une seule sauvegarde manuelle existe, dans `backups/`).
- **Suivi des erreurs** (S) : Sentry ou équivalent sur le frontend et le backend, pour voir les
  erreurs que les joueurs rencontrent.
- **Dépôt distant** (S) : `Gridbook_new` est sous Git en local seulement. Le pousser sur GitHub,
  par exemple sur un dépôt dédié ou une branche du dépôt GridBook.
- **Ménage** (S) : `test_api.py` et `run.py` à la racine sont des scripts de l'ancien projet,
  à supprimer ou à déplacer dans un dossier `scripts/` (`close_bets.py`, qui contenait des
  identifiants en clair, a déjà été supprimé).

## 7. Feuille de route proposée

| Étape | Contenu |
|---|---|
| Sprint 1 | clôture automatique des saisons, session longue, intégration continue, performance de « Mes paris », ménage |
| Sprint 2 | page profil publique, classement par bénéfice, palmarès des saisons précédentes |
| Sprint 3 | ligues privées, discussion par course, notifications par e-mail, environnement de recette |
| Sprint 4 | cotes GridBook (étapes 1 à 3 de `cotes-et-bonus.md`), nouveaux marchés |
| Ensuite | bonus outsider, suivi en direct F1, boutique enrichie (`boutique-contenu.md`), PWA, version anglaise |
