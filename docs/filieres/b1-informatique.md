# Bachelor 1 Informatique : guide de réalisation

**1 place** · en binôme avec le **M2 Cloud** (mission 1) et le **M2 Full Stack** (mission 2).
Ils relisent ton travail et t'aident quand tu bloques : demande tôt.

Objectif : de premières contributions réelles au code et à l'exploitation, petites, utiles et
relues.

Avant de commencer : [mise en route commune](README.md). Fais la mise en route avec ton binôme si
Git, Docker ou React sont nouveaux pour toi.

---

## Ce que tu vas utiliser

| Outil | Pour quoi |
|---|---|
| Git et GitHub | une branche par tâche, une pull request relue avant fusion dans `staging` |
| GitHub Actions | lancer automatiquement des vérifications à chaque push |
| Bash et Docker | scripts de sauvegarde, commandes `docker compose` |
| Python (FastAPI) | petites routes de l'API |
| React | petits composants de l'interface |

Règle d'or : **une petite étape à la fois**, chacune vérifiée et relue.

### À retenir : jamais de secret dans Git

En octobre 2026, on a retrouvé dans le dépôt un ancien script (`close_bets.py`) contenant
l'adresse, l'utilisateur et le **mot de passe** d'une base de données, présent sur GitHub depuis
plusieurs mois. Supprimer le fichier ne suffit pas : il reste dans l'historique, et le mot de passe
doit être changé. Les mots de passe vont **uniquement** dans `.env`, qui n'est jamais commité.

---

## Mission 1 : support DevOps (avec le M2 Cloud)

### 1.1 Premier workflow GitHub Actions

Le M2 Cloud conçoit le pipeline complet (analyses de sécurité, déploiement). Tu écris la
première brique : les vérifications de base à chaque push.

1. Créer `.github/workflows/verifications.yml` :

   ```yaml
   name: Vérifications
   on:
     push:
       branches: [staging]
     pull_request:
       branches: [staging, main]

   jobs:
     frontend:
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: frontend
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
             cache-dependency-path: frontend/package-lock.json
         - run: npm ci
         - run: npm run lint
         - run: npx vite build

     backend:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with:
             python-version: "3.12"
         - run: pip install -r requirements.txt pyflakes
         - run: python -m pyflakes app
   ```

2. Pousser sur une branche, ouvrir une pull request, vérifier que le workflow s'exécute et
   passe au vert dans l'onglet « Actions » de GitHub.
3. Volontairement casser une règle (variable inutilisée) pour vérifier que le workflow
   échoue, puis corriger.
4. Étape suivante, avec le M2 Cloud : lancer la stack Docker dans le workflow et exécuter les
   tests de bout en bout (`e2e/run.mjs`).

**Fini quand** : chaque pull request affiche le résultat des vérifications, et une erreur de
lint empêche la fusion.

### 1.2 Sauvegarde automatique de la base

Le M2 Cloud définit la solution complète (chiffrement, copie externe, conservation). Tu écris le
premier script, utilisable tout de suite.

1. Script `scripts/sauvegarde-base.sh` :
   - lance `mysqldump` dans le conteneur (même commande que dans le README, section
     « Importer des données ») ;
   - écrit un fichier daté `backups/gridbook-AAAAMMJJ-HHMM.sql.gz`, droits `600` ;
   - supprime les sauvegardes de plus de 14 jours ;
   - s'arrête avec un code d'erreur si une étape échoue (`set -euo pipefail`).
2. **Planification** : une tâche `cron` (ou un minuteur `systemd`) chaque nuit, avec son journal.
3. **Restauration testée** : script `scripts/test-restauration.sh` qui démarre une base MySQL
   jetable, y charge la dernière sauvegarde et vérifie quelques comptes (nombre de courses,
   de joueurs, d'articles). Une sauvegarde jamais restaurée n'est pas une sauvegarde.
4. Documenter dans le README : où sont les sauvegardes, comment restaurer.

**Fini quand** : une sauvegarde est créée chaque nuit et la restauration a été testée avec succès.

---

## Mission 2 : support dev web (avec le M2 Full Stack)

### 2.1 Bandeau d'annonces

Afficher un message en haut du site (maintenance, nouvelle collection).

1. **Table** `announcements` : `id`, `message` (200 caractères max), `level` (`info`,
   `warning`), `starts_at`, `ends_at`, `is_active`.
2. **Routes** :
   - `GET /announcements/current` : l'annonce active du moment (accessible à tous) ;
   - routes admin pour créer, modifier, désactiver (protégées par `get_current_admin`).
3. **Interface** :
   - bandeau sous la barre supérieure dans `components/Layout.jsx`, avec les classes `alert`
     de la charte, fermable (mémorisé dans le navigateur) ;
   - formulaire dans l'administration.
4. **Test E2E** : un admin crée une annonce, un joueur la voit, puis la ferme.

### 2.2 Créer des articles de boutique depuis l'administration

Aujourd'hui le catalogue est écrit dans `app/services/shop_catalog.py` ; l'admin peut seulement
changer un prix, mettre à la une ou retirer un article.

1. **Route** `POST /shop/admin/products` : nom, description, catégorie (avatar, cadre, badge,
   titre, pseudo), valeur, prix, rareté, collection, stock, date de fin de vente.
   Contrôles : catégorie connue, prix positif et borné (`MAX_AMOUNT`), valeur valide selon la
   catégorie (une couleur CSS pour un cadre ou un pseudo, un emoji pour un avatar ou un badge),
   identifiant (`slug`) unique.
2. **Formulaire** dans l'onglet « Gestion (admin) » de la boutique, avec aperçu de l'article
   sur l'avatar (composants `UserAvatar`, `UserName`).
3. Tests : création valide, catégorie inconnue refusée, prix négatif refusé, slug en double refusé.

### 2.3 Boutique : badge « Nouveau » et nouvelles récompenses

1. **Badge « Nouveau »** : article créé il y a moins de 14 jours (colonne `created_at`
   existante), affiché sur la carte et filtrable dans le catalogue (`pages/shop/`).
2. **Nouvelles récompenses** : les conditions sont dans `app/services/rewards.py`
   (`progress`, `describe`). Ajouter :
   - `win_streak` : N pronostics gagnants d'affilée (récompense « Feu d'artifice », N = 5) ;
   - `perfect_weekend` : vainqueurs F1, MotoGP et NASCAR trouvés la même semaine.
   Puis déclarer les articles correspondants dans `shop_catalog.py`.
3. Tests unitaires de chaque condition (avec le socle de tests du M2 Full Stack).

### 2.4 Ménage des anciens scripts

- `close_bets.py` a été supprimé (identifiants en clair, voir plus haut).
- `test_api.py` : ne fait qu'interroger Jolpica, ce n'est pas un test. À supprimer une fois les
  vrais tests unitaires en place.
- `run.py` : lance le backend sans Docker, avec un commentaire de chemin obsolète. Le déplacer
  dans `scripts/` et le documenter, ou le supprimer si personne ne s'en sert.
- Avant toute suppression : vérifier que rien ne l'utilise (`git grep nom_du_fichier`).

---

## Planning

| Sprint | Travail |
|---|---|
| 1 | prise en main, premier workflow GitHub Actions |
| 2 | sauvegarde automatique et restauration testée, ménage des scripts |
| 3 | bandeau d'annonces |
| 4 | création d'articles depuis l'admin, badge « Nouveau », nouvelles récompenses |

## Comment travailler

- Une branche par tâche (`feature/bandeau-annonces`), une pull request relue par ton binôme.
- Dans chaque pull request : **ce que tu as fait, comment tu l'as vérifié, ce qui reste**.
- Lancer `npm run lint` et les tests avant de demander une relecture.
