# Mastère 1 UX-UI et IA pour le design d'interface : guide de réalisation

**1 place**

Objectif : concevoir les écrans à venir dans la charte existante, créer les futurs cosmétiques
de la boutique, et garder le site impeccable sur ordinateur comme sur mobile.

Avant de commencer : [mise en route commune](README.md) (pour lancer le site en local), puis
**`docs/design-system.md` en entier** : c'est la référence de tout ce qui suit.

---

## État actuel utile

| Sujet | Où | État |
|---|---|---|
| Charte « broadcast » | `frontend/src/styles/theme.css` (variables), `ui.css` (composants) | thème **sombre uniquement**, Inter + Barlow Condensed, une couleur par championnat |
| Structure des pages | `components/Layout.jsx` | barre supérieure, sous-navigation, panneau « Mes paris en cours » |
| Cosmétiques | `components/cosmetics/UserAvatar.jsx`, `UserName.jsx` | avatar (emoji), cadre (couleur), badge, titre, couleur de pseudo |
| Boutique | `pages/shop/`, catalogue dans `app/services/shop_catalog.py` | 45 articles, 4 raretés : commun (gris), rare (bleu), épique (violet), légendaire (or) |
| Fenêtres | `pages/admin.css` (`.adm-modal`, `.adm-drawer`) et `pages/shop/shop.css` (`.shop-modal`) | deux versions différentes du même composant |
| Captures d'écran | `e2e/screenshots.mjs` | toutes les pages, à la largeur choisie, avec détection des débordements |

---

## Mission 1 : évolution du design system

### 1.1 Bibliothèque Figma

1. Reproduire dans Figma les **variables** de `theme.css` (couleurs, tailles de texte,
   espacements, rayons) sous forme de variables Figma, avec les mêmes noms.
2. Composants Figma alignés sur `ui.css` : boutons, champs, badges, cartes, onglets, tableaux,
   états vides, chargement, alertes ; avatar et pseudo avec cosmétiques.
3. Gabarits de page : structure du Layout à 1440 px et à 390 px.

Toute maquette part de cette bibliothèque : ce qui n'existe pas dans la bibliothèque est soit
ajouté à la charte (et documenté), soit refusé.

### 1.2 Thème clair

Toute la charte est en variables : un thème clair consiste surtout à redéfinir les couleurs.

1. Palette claire : fonds, surfaces, bordures, textes (trois niveaux), états.
2. **Couleurs des championnats sur fond clair** : le jaune NASCAR (`#ffd659`) est illisible
   en texte sur blanc. Prévoir une variante foncée pour le texte et les liens, et garder la
   couleur vive pour les aplats.
3. Vérifier chaque paire texte / fond au niveau **AA** (4,5:1 pour le texte courant, 3:1 pour
   les grands textes et les éléments d'interface), avec un outil de contraste.
4. Comportement : suivre le réglage du système par défaut, choix manuel dans le menu du compte.
5. Spécification remise au M2 Full Stack : bloc de variables prêt à coller dans `theme.css`.

### 1.3 Fenêtres et panneaux

Concevoir **un** composant fenêtre (modale) et **un** panneau latéral, qui remplaceront les
versions de l'administration et de la boutique :

- tailles (petite, moyenne, grande), en-tête, corps défilant, pied d'actions ;
- comportement mobile (plein écran ou feuille montante) ;
- accessibilité : focus placé à l'ouverture et retenu dans la fenêtre, fermeture par Échap et
  par le bouton, retour du focus à l'élément d'origine.

**Livrables** : bibliothèque Figma, palette claire validée en contraste, spécification des
fenêtres, mise à jour de `docs/design-system.md`.

---

## Mission 2 : maquettes des nouvelles pages

### Méthode, pour chaque page

1. **Brief** avec le développeur concerné : but de la page, données disponibles (routes de
   l'API), contraintes.
2. **Fil de fer** (wireframe) rapide, validé avant d'aller plus loin.
3. **Maquette haute fidélité** à 1440 px et à 390 px, avec **tous les états** : chargement,
   vide, erreur, contenu long, cas limite (pseudo de 30 caractères, 50 membres dans une ligue…).
4. **Prototype** cliquable et **test avec 5 utilisateurs** (tâche à réaliser, observation,
   synthèse des problèmes).
5. **Remise au développeur** : maquette annotée (espacements, variables utilisées, textes
   définitifs en français), validée **avant** le sprint de développement.

### Pages à concevoir

| Page | Contenu à prévoir |
|---|---|
| Profil public | avatar, pseudo coloré et titre ; statistiques (taux de réussite, meilleure cote gagnée, championnat préféré) ; vitrine des cosmétiques et récompenses ; derniers paris réglés ; variante « profil privé » |
| Ligues privées | liste de mes ligues, création, invitation (lien à copier), page d'une ligue avec son classement, page d'accueil d'une invitation |
| Palmarès | sélecteur d'année (F1 depuis 1950), podium du champion, classements pilotes et équipes |
| Discussion par course | panneau à côté de la page de la course ; message, réactions, signalement, message supprimé, fil en lecture seule ; badge « A parié sur … » |
| Nouveaux paris | onglets de marché (vainqueur, podium, pole, meilleur tour, duel) sur la page de pari, bulletin adapté à chaque marché ; grille de pronostics (classer 10 pilotes, au clavier aussi) |
| Cotes GridBook | cote GridBook à côté de la cote mutuelle, badges « Favori » / « Outsider », courbe d'évolution, explication « Pourquoi cette cote ? », mention « estimation » |
| Notifications | cloche et liste dans la barre supérieure, préférences |
| Palier de bonus | bouton « Récupérer mon bonus » dans le menu du compte |

### Utiliser l'IA dans la conception

Les outils génératifs servent à explorer vite (variantes de mise en page, pistes visuelles,
textes de remplissage réalistes). Les livrables finaux restent **originaux** : vérifier les
conditions d'utilisation de chaque outil, ne jamais reproduire un logo ou une marque, garder une
trace des outils utilisés.

**Livrable** : maquettes validées avant chaque sprint de développement (voir le planning du
M2 Full Stack).

---

## Mission 3 : boutique et cosmétiques

Idées détaillées dans `docs/boutique-contenu.md`. Règle absolue : **aucun logo ni nom déposé**
d'écurie, de championnat ou de pilote ; s'inspirer, ne pas reproduire.

### 3.1 Éditeur de casque

L'article le plus fort de la future boutique : un avatar dessiné, propre à chaque joueur.

1. **Structure SVG en calques** : coque, motif (bandes, damier, flammes, chiffres…), visière,
   numéro. Couleurs pilotées par des variables CSS, pour combiner sans dessiner chaque variante.
2. **Lisible à toutes les tailles** utilisées sur le site : 26, 34, 44, 72 et 112 px.
3. **Raretés** : un motif commun reste simple ; un motif légendaire peut être animé.
4. Fichiers optimisés (SVGO), sans texte converti en image, nommage clair
   (`casque-coque-01.svg`, `casque-motif-damier.svg`).
5. Spécification pour le M2 Full Stack : comment l'éditeur combine les calques, ce qui est
   stocké pour chaque joueur (choix en JSON).

### 3.2 Autres cosmétiques

| Article | Contraintes de conception |
|---|---|
| Livrée de profil (bannière) | format large qui se recadre en mobile, texte du profil lisible par-dessus |
| Numéro de course | typographie de la charte, lisible à côté du pseudo |
| Effet de victoire | animation courte (moins de 2 s), légère (CSS ou SVG), désactivée si l'utilisateur limite les animations |
| Cadres animés | même contour que les cadres actuels, animation discrète, version fixe pour les animations réduites |
| Cartes de collection | format carte, rareté visible, série numérotée |

### 3.3 Collections

Proposer, avec le M2 Social Média, une collection par grand rendez-vous de la saison (thème,
5 articles, raretés, nom, description) sur le modèle de « Nuit de Las Vegas ». Les articles
s'ajoutent au catalogue (`app/services/shop_catalog.py`) avec le B1 Informatique.

**Livrables** : éditeur de casque spécifié et première série de casques, deux collections
thématiques prêtes à intégrer.

---

## Mission 4 : recette visuelle

1. **Captures** de toutes les pages, avant et après chaque modification :
   ```bash
   cd e2e
   node screenshots.mjs ../captures/ordinateur 1440 full
   node screenshots.mjs ../captures/mobile 390 full
   ```
   Le script signale aussi les débordements horizontaux et les erreurs JavaScript.
2. **Grille de contrôle** pour chaque page :
   - alignements et espacements conformes aux variables ;
   - aucun débordement à 390 px, aucun texte coupé ;
   - contrastes AA, focus clavier visible, navigation complète au clavier ;
   - textes en français, sans jargon technique ;
   - états chargement, vide et erreur présents.
3. **Audit d'accessibilité** régulier (extension axe DevTools, Lighthouse) sur les pages
   principales.
4. **Tickets** : un ticket par écart, avec capture, page, largeur, comportement attendu, gravité.

**Livrable** : aucune page livrée sans validation visuelle ; rapport d'accessibilité à chaque
fin de sprint.

---

## Planning

| Sprint | Travail |
|---|---|
| 1 | bibliothèque Figma, maquettes du profil public |
| 2 | maquettes des ligues et du palmarès, spécification des fenêtres |
| 3 | maquettes de la discussion, des notifications et des nouveaux paris ; thème clair |
| 4 | présentation des cotes GridBook ; éditeur de casque |
| Ensuite | collections thématiques, autres cosmétiques |
| Chaque sprint | recette visuelle des pages livrées |

## Collaboration

| Avec | Pour |
|---|---|
| M2 Full Stack | brief et remise de chaque maquette, intégration du thème clair et des fenêtres |
| M2 IA | présentation des cotes et des explications |
| M2 Social Média | visuels des réseaux, thèmes des collections |
| B1 Informatique | ajout des nouveaux articles au catalogue |
