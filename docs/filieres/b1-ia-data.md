# Bachelor 1 Informatique, option IA & Data : guide de réalisation

**1 place** · en binôme avec le **M2 Data Engineer** (missions 1 et 2) et le **M2 IA**
(mission 3). Ils relisent ton travail et t'aident quand tu bloques : demande tôt.

Objectif : apprendre sur un vrai projet, avec des missions concrètes et utiles.

Avant de commencer : [mise en route commune](README.md). Si Git ou Docker sont nouveaux pour
toi, fais d'abord la mise en route avec ton binôme.

---

## Ce que tu vas utiliser

| Outil | Pour quoi | Pour apprendre |
|---|---|---|
| Git et GitHub | travailler sur une branche, proposer tes changements (pull request) | demander une démonstration à ton binôme, puis le faire seul |
| Python | scripts de vérification et de préparation de données | bases : listes, dictionnaires, fonctions, fichiers CSV |
| pandas | manipuler des tableaux de données | lecture d'un CSV, filtres, regroupements |
| matplotlib | tracer des graphiques | courbes et nuages de points simples |
| Le site en local | voir le résultat de ton travail | http://localhost:5174 |

Règle d'or : **une petite étape à la fois**, et une pull request relue avant de continuer.

---

## Mission 1 : images des circuits NASCAR

### Le problème

Sur la page de pari NASCAR, l'image du circuit ne s'affiche pas : le site NASCAR bloque ses images
(protection Cloudflare). Le site affiche à la place un **schéma indicatif** (ovale générique).
On veut une vraie carte pour chaque circuit.

### Règle importante : les droits

On ne copie pas les images du site NASCAR : elles ne nous appartiennent pas. On utilise des cartes
**sous licence libre**, par exemple sur Wikimedia Commons, en respectant leur licence (souvent
CC BY-SA : il faut citer l'auteur et la licence).

### Étapes

1. **Lister les circuits NASCAR** utilisés par le site. Demande l'accès à la base à ton binôme,
   ou utilise l'API :
   ```bash
   curl -s -b cookies.txt "http://localhost:5174/api/races/?discipline=nascar"
   ```
   Note pour chaque circuit : nom, ville, identifiant externe (dans la base, table `circuits`,
   colonne `external_id`).
2. **Trouver une carte libre** pour chaque circuit (Wikimedia Commons : chercher le nom du
   circuit + « track map »). Pour chacune, noter dans un tableau :

   | Circuit | Fichier trouvé | Auteur | Licence | Lien |
   |---|---|---|---|---|

   Si aucune carte libre n'existe, le noter : le schéma indicatif restera affiché.
3. **Préparer les fichiers** : format SVG de préférence (sinon PNG de 800 px de large),
   nommés avec l'identifiant externe : `frontend/public/circuits/nascar/<external_id>.svg`.
4. **Crédits** : fichier `frontend/public/circuits/CREDITS.md` qui reprend le tableau (auteur,
   licence, lien) ; une page « Crédits » sur le site sera ajoutée avec le M2 Full Stack.
5. **Brancher les images** (avec ton binôme) : dans `app/services/sync/nascar.py`, utiliser
   l'image locale quand le fichier existe au lieu de l'adresse du site NASCAR.
6. **Vérifier** sur le site : ouvrir la page de pari de plusieurs courses NASCAR, à 1440 et
   390 px.

**Fini quand** : chaque circuit NASCAR a une vraie carte ou est noté « pas de carte libre », et
toutes les cartes utilisées sont créditées.

---

## Mission 2 : vérifier les données importées

Le site importe des données de trois sources. Ton rôle : écrire des **contrôles automatiques**
qui détectent les erreurs.

### 2.1 Contrôles des classements (palmarès)

Le M2 Data Engineer importe les classements des saisons passées : F1 depuis 1950, MotoGP depuis
2010, NASCAR depuis 2016.

1. Écrire `research/checks/check_standings.py`, qui pour chaque championnat et chaque année
   récupère le classement et vérifie :
   - le classement n'est pas vide ;
   - les positions se suivent (1, 2, 3…) sans trou ni doublon ;
   - les points sont décroissants ;
   - aucun nom vide ;
   - le nombre de pilotes est plausible (ni 2, ni 500).
2. Le script écrit un rapport `research/checks/rapport_standings.csv` :
   championnat, année, contrôle, résultat (OK / ERREUR), détail.
3. Ajouter des **valeurs de référence** connues, vérifiées à la main :
   F1 1990 → Ayrton Senna ; MotoGP 2010 → Jorge Lorenzo ; NASCAR 2016 → Jimmie Johnson.
4. Trouver la **première année réellement disponible** pour chaque championnat et la noter.

### 2.2 Contrôles des courses

Même principe pour les courses de la saison en cours : date présente, circuit renseigné, course
passée ⇒ vainqueur connu (sauf si la source ne l'a pas encore publié), pas de course en double.

**Fini quand** : les scripts tournent en une commande, le rapport est lisible, et chaque erreur
trouvée est signalée au M2 Data Engineer par un ticket.

---

## Mission 3 : préparer les données pour le modèle de cotes

Le M2 IA construit un modèle (classement Elo) qui estime la probabilité de victoire de chaque
pilote. Il a besoin de données propres sur les courses passées.

1. **Extraire** les résultats des courses passées (avec ton binôme) dans un fichier par
   championnat, une ligne par pilote et par course :

   | Colonne | Exemple |
   |---|---|
   | `season` | 2024 |
   | `round` | 5 |
   | `date` | 2024-04-21 |
   | `circuit` | Shanghai |
   | `driver` | Max Verstappen |
   | `team` | Red Bull |
   | `grid` | 1 |
   | `position` | 1 (vide si abandon) |
   | `status` | Finished / Retired |

2. **Nettoyer** :
   - même pilote écrit de deux façons (accents, prénoms) → un seul identifiant ;
   - courses annulées ou sans résultat → retirées, et notées ;
   - valeurs manquantes comptées et signalées.
3. **Documenter** dans `research/data/README.md` : source, années, colonnes, problèmes connus.
4. **Suivre les mesures** du modèle : pour chaque version testée par le M2 IA, noter dans un
   tableau la log-loss et le score de Brier (plus ils sont bas, mieux c'est), puis tracer leur
   évolution avec matplotlib.

**Fini quand** : les fichiers sont propres et documentés, et le tableau de suivi des mesures
est à jour à chaque nouvelle version du modèle.

---

## Planning

| Sprint | Travail |
|---|---|
| 1 | prise en main (Git, site en local), liste des circuits NASCAR, recherche des cartes libres |
| 2 | intégration des cartes NASCAR, contrôles des classements |
| 3 | extraction et nettoyage des données pour le modèle |
| 4 | contrôles des courses, suivi des mesures du modèle |

## Comment travailler

- Une branche par mission (`feature/cartes-nascar`), une pull request relue par ton binôme.
- Écrire dans la pull request **ce que tu as fait, comment tu l'as vérifié, ce qui reste**.
- Ne jamais mettre de mot de passe ni de fichier `.env` dans Git.
