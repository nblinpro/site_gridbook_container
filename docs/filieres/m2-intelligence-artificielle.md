# Mastère 2 Expert en Intelligence Artificielle : guide de réalisation

**1 place** · en binôme avec le Bachelor 1 IA & Data (`b1-ia-data.md`).

Objectif : donner à GridBook des **cotes calculées à partir des données**, crédibles même quand
peu de joueurs ont parié, puis un **bonus outsider** maîtrisé et une **explication** lisible de
chaque cote.

La conception de référence est `docs/cotes-et-bonus.md` (table `odds`, formules, bonus,
routes). Ce guide détaille **comment la réaliser et la valider**.

Avant de commencer : [mise en route commune](README.md).

---

## État actuel utile

| Sujet | Où | État |
|---|---|---|
| Cote affichée | `/bets/pool/{race_id}`, `/bets/my_bets` | cote **mutuelle** : cagnotte ÷ mises sur le pilote, sans valeur quand il y a peu de mises |
| Règlement | `app/services/settlement.py` | la cote finale est réécrite dans `bets.odds` au règlement |
| Historique des résultats | adaptateurs `app/services/sync/` | vainqueurs seulement en base ; résultats complets et palmarès à venir (M2 Data) |
| Économie | `users.wallet`, `token_transactions` | mouvements de paris pas encore tracés (prérequis du M2 Data) |

---

## Principes à respecter

1. **Ce sont des estimations.** L'interface parle de « cote GridBook » et d'« estimation », jamais
   de certitude.
2. **Pas d'incitation à parier.** Les textes générés décrivent ; ils ne poussent pas à miser.
3. **Pas de fuite du futur.** Pour une course donnée, le modèle n'utilise que ce qui était connu
   avant son départ. C'est la première cause de résultats trop beaux en backtest.
4. **Reproductible.** Chaque version du modèle porte un nom (`elo-v1`, `elo-grid-v2`…) stocké
   dans `odds.model`, avec ses paramètres versionnés dans le dépôt.

---

## Mission 1 : jeu de données

Avec le M2 Data Engineer (import) et le B1 IA & Data (préparation).

1. Pour chaque course passée : date, championnat, circuit (et type de piste en NASCAR), ordre
   d'arrivée complet, grille de départ, abandons.
   - F1 : Jolpica, toutes les saisons depuis 1950 (privilégier depuis 2000 pour l'entraînement,
     l'historique complet pour initialiser les notes) ;
   - MotoGP : depuis 2010 (vérifié), plus ancien si l'adaptateur est corrigé ;
   - NASCAR : depuis 2016.
2. Format de travail : fichiers Parquet dans `research/data/` (exclus de Git s'ils sont
   volumineux), générés par un script reproductible `research/build_dataset.py`.
3. Découpage temporel : saisons d'entraînement, saison de validation, **dernière saison en test**
   (jamais touchée pendant les réglages).

**Fini quand** : un jeu de données par championnat, documenté (colonnes, années, valeurs manquantes).

---

## Mission 2 : modèle Elo et cotes GridBook

### 2.1 Modèles de référence (à battre)

Avant tout modèle, mesurer deux références sur le jeu de validation :

| Référence | Probabilité de victoire |
|---|---|
| Uniforme | 1 ÷ nombre de partants |
| Classement | proportionnelle aux points au championnat avant la course |

Le modèle Elo n'a d'intérêt que s'il fait nettement mieux que ces deux références.

### 2.2 Elo multi-concurrents

Code de départ dans `docs/cotes-et-bonus.md` § 3.1 (`update_elo`, `win_probabilities`).

1. Notes initiales à 1500, mises à jour course après course dans l'ordre chronologique.
2. Coefficient **K** à régler (16 à 40), éventuellement plus fort en début de saison.
3. **Régression vers la moyenne** entre deux saisons (ex. 25 % de l'écart à 1500), pour tenir
   compte des changements de voiture.
4. Abandons : à traiter explicitement (abandon mécanique ≠ contre-performance du pilote) ;
   tester les deux options en backtest.
5. **Grille de départ** : facteur `GRID_WEIGHT` appliqué après les qualifications ; il pèse
   beaucoup en F1, moins en NASCAR.
6. Effet circuit (NASCAR : ovale court, superspeedway, road course) : note par type de piste ou
   bonus par type, si le backtest le justifie.

### 2.3 De la probabilité à la cote

`cote = (1 − marge) ÷ probabilité`, marge de 5 %, bornée entre 1,05 et 50 (§ 3.2 du document de
conception). Les probabilités d'une course doivent sommer à 1.

### 2.4 Intégration dans GridBook

1. Module `app/services/odds/` : `elo.py` (notes), `compute.py`
   (`compute_and_store_odds(db, race)`), paramètres dans `params.py`.
2. Table `odds` et colonnes `bets.model_odds`, `bets.bonus` (§ 2 du document de conception) ;
   les routes et l'affichage sont réalisés par le M2 Full Stack.
3. Recalcul à la fin de chaque synchronisation (`phase = pre_qualif`) et dès que la grille est
   connue (`phase = post_qualif`) ; mise à jour des notes après chaque course réglée.
4. Nouvelle série enregistrée seulement si une probabilité bouge de plus de 0,5 point.

**Fini quand** : chaque course ouverte a ses cotes GridBook, recalculées automatiquement, et la
page de pari les affiche.

---

## Mission 3 : backtesting et réglages

1. Rejouer chaque saison de validation **course par course**, avec uniquement les données
   antérieures à chaque course.
2. Mesures, par championnat et pour chaque version du modèle :

| Mesure | Ce qu'elle dit |
|---|---|
| Log-loss | qualité globale des probabilités (plus bas = mieux) |
| Score de Brier | erreur quadratique des probabilités |
| Courbe de calibration | les pilotes annoncés à 20 % gagnent-ils environ 1 course sur 5 ? |
| Rang du vainqueur | à quelle position le modèle classait-il le vainqueur réel ? |

3. Réglage de `K`, de la régression entre saisons et de `GRID_WEIGHT` par recherche sur grille,
   en minimisant la log-loss de validation.
4. Si les probabilités sont mal calibrées : calibration par température (un paramètre appliqué
   aux scores avant normalisation).
5. Comparer `pre_qualif` et `post_qualif` : le gain apporté par la grille doit être mesuré.
6. Évaluation finale **une seule fois** sur la saison de test.

**Livrable** : rapport `docs/rapport-backtest.md` avec les mesures, les courbes, les paramètres
retenus et leurs limites. Les notebooks restent dans `research/`.

---

## Mission 4 : bonus outsider

Règles de départ (§ 8 du document de conception) : gains × 1,5 si la cote GridBook au moment du
pari est d'au moins 10, × 2 à partir de 25, plafond de 20 000 APEX par pari et de 100 000 APEX
par course.

1. **Simulation économique avant toute mise en ligne** (Monte-Carlo) :
   - rejouer une saison avec des mises fictives réalistes (répartition des mises observée en
     base, part de paris sur des outsiders) ;
   - mesurer les APEX créés par le bonus, par semaine et sur la saison ;
   - tester plusieurs seuils et plafonds, retenir une combinaison qui garde la création d'APEX
     sous un objectif fixé avec l'équipe (ex. moins de 5 % de la circulation par saison).
2. Implémentation dans `settle_race` / `settle_market` (avec le M2 Full Stack) : bonus calculé
   sur `bets.model_odds`, plafonds en variables d'environnement, transaction « Bonus outsider ».
3. Suivi après mise en ligne avec le tableau de bord économique du M2 Data.

**Fini quand** : bonus en ligne avec des paramètres justifiés par la simulation, et suivi chaque
semaine.

---

## Mission 5 : explication des cotes

Une phrase par pilote : « Parti 2e, a gagné 2 des 5 dernières courses, n'a jamais gagné ici. »

1. **Faits d'abord** : pour chaque pilote, construire un dictionnaire de faits calculés
   (grille, résultats récents, victoires sur le circuit, note Elo, probabilité, cote).
   C'est la seule source autorisée pour le texte.
2. **Génération** avec l'API Claude (code de départ dans `docs/cotes-et-bonus.md` § 9) :
   - au moment du calcul des cotes, jamais à l'affichage de la page ;
   - seulement pour la série `post_qualif`, les 5 favoris et les 3 plus hautes cotes ;
   - clé d'API dans `.env` (`ANTHROPIC_API_KEY`) ; sans clé, la page s'affiche sans explication.
3. **Contrôle automatique** de chaque texte avant enregistrement :
   - tout nombre cité doit figurer dans les faits, sinon le texte est rejeté ;
   - longueur maximale, aucune incitation à parier (liste de formulations interdites).
4. **Évaluation** : 50 explications relues par l'équipe avec une grille (exactitude, clarté,
   ton) ; taux de rejet du contrôle automatique suivi.
5. **Coût** : mesurer le nombre d'appels et le coût réel sur un premier week-end avant de
   généraliser.

**Fini quand** : lien « Pourquoi cette cote ? » sur la page de pari, aucune explication publiée
avec un chiffre inventé.

---

## Planning

| Sprint | Travail |
|---|---|
| 1 | jeu de données, modèles de référence |
| 2 | Elo, backtest, premiers réglages, rapport intermédiaire |
| 3 | grille de départ, calibration, intégration (`odds`, recalcul automatique) |
| 4 | mise en ligne des cotes GridBook avec le M2 Full Stack, simulation du bonus outsider |
| Ensuite | bonus outsider en ligne, explications générées, nouveaux facteurs (circuit, forme) |

## Collaboration

| Avec | Pour |
|---|---|
| B1 IA & Data | jeux de données, suivi des mesures |
| M2 Data Engineer | historique complet, résultats et grilles, tableau de bord économique |
| M2 Full Stack | routes `/races/{id}/odds`, `model_odds`, affichage, règlement du bonus |
| M1 UX-UI | présentation des cotes et des explications sur la page de pari |
