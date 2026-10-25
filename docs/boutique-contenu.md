# Boutique : contenu pour une vraie boutique

Idées pour faire de la boutique GridBook une vraie vitrine, comparable aux boutiques des jeux en
ligne (Fortnite, Rocket League, F1 Clash), en restant dans le cadre du jeu.

## Point de départ

Aujourd'hui (`app/seed.py`, table `products`) :

- 24 articles, tous cosmétiques, dans 4 catégories : avatar (emoji), cadre (couleur), badge
  (emoji en pastille), titre (texte sous le pseudo) ;
- 4 raretés : commun, rare, épique, légendaire ;
- certains articles sont liés à un championnat (champ `discipline`) ;
- prix de 400 à 12 000 APEX, un seul achat par article, un article équipé par catégorie ;
- l'admin peut changer un prix et retirer ou remettre un article en vente.

Il manque ce qui fait vivre une boutique : de la nouveauté régulière, de la rareté dans le temps,
des collections, des objets qu'on ne peut pas acheter et une vitrine qui change.

## Trois règles à garder

1. **Uniquement de l'APEX, jamais d'argent réel.** GridBook est un jeu de pronostics : vendre de
   l'APEX ou des articles contre des euros en ferait un jeu d'argent, soumis à l'autorisation de
   l'ANJ.
2. **Pas de boîtes surprises payantes** (« loot boxes ») : le joueur sait toujours ce qu'il achète.
   C'est plus honnête, et plusieurs pays les encadrent déjà.
3. **Pas de logos ni de noms protégés.** Les noms et logos des écuries, des championnats et des
   pilotes sont des marques déposées : on s'en inspire (« Rouge Maranello », « Orange Papaya »)
   sans les reproduire.

## 1. Nouvelles catégories d'articles

| Catégorie | Ce que c'est | Où ça se voit | Exemples |
|---|---|---|---|
| **Casque** | avatar dessiné (SVG) : coque, couleur, motif, visière, numéro | barre supérieure, classements, profil | casque « Damier », « Flammes », « Néon » |
| **Livrée de profil** | bannière en haut du profil public | page profil, carte du joueur au classement | « Grille de départ de nuit », « Ligne droite des stands » |
| **Couleur du pseudo** | couleur ou dégradé du nom | classements, panneau des paris | « Or champion », « Dégradé coucher de soleil sur Austin » |
| **Numéro de course** | numéro personnel affiché à côté du pseudo (1 à 99, réservé à un joueur) | partout où le pseudo apparaît | « #1 » vendu aux enchères en APEX en fin de saison |
| **Effet de victoire** | animation quand un pari est gagné (confettis, drapeau à damier, burnout) | notification de gain | « Pluie de champagne », « Drapeau à damier » |
| **Réactions** | petites réactions à poser sur le fil d'une course | page d'une course (si un fil de discussion est ajouté) | 🔥 🏁 😱 personnalisées |
| **Thème d'interface** | variante de couleurs de tout le site pour soi | tout le site | « Nuit de Singapour », « Asphalte », « Paddock blanc » |
| **Cadre animé** | cadre avec un effet (reflet, pulsation, flammes) | avatar | aujourd'hui seul le cadre légendaire est animé |
| **Carte de collection** | carte numérique d'un circuit ou d'un moment de la saison | album de collection du profil | « Monza 2026 », « Victoire surprise de l'année » |

Le casque est l'article le plus fort : c'est l'identité visuelle d'un pilote. Un éditeur
(coque + couleur + motif + numéro) donnerait des milliers de combinaisons et ferait de chaque
pièce un article à part.

## 2. Faire vivre la vitrine

| Mécanique | Principe | Effet |
|---|---|---|
| **Vitrine du week-end** | 4 à 6 articles mis en avant chaque week-end de course, liés au circuit (« Collection Suzuka ») | une raison de revenir chaque week-end |
| **Édition limitée dans le temps** | article en vente seulement pendant le week-end de course ou la semaine | sentiment d'urgence, sans hasard |
| **Édition numérotée** | stock limité (« 50 exemplaires »), numéro affiché sur l'article (« n° 12/50 ») | rareté réelle, prestige |
| **Collections et lots** | ensemble assorti (casque + cadre + titre + effet), moins cher que les articles séparés, bonus si la collection est complète | panier plus gros, envie de compléter |
| **Saisons de boutique** | collection « Saison 2026 » retirée à la fin de la saison | les anciens joueurs gardent des pièces introuvables |
| **Soldes** | réduction pendant la trêve hivernale ou après un gros week-end | relance la dépense d'APEX |
| **Nouveautés** | badge « Nouveau » pendant 7 jours, tri par date d'arrivée | la boutique paraît vivante |
| **Meilleures ventes** | badge « Populaire » sur les articles les plus achetés de la semaine | preuve sociale |
| **Liste de souhaits** | cœur sur un article, alerte quand il revient ou passe en solde | prépare les achats futurs |
| **Cadeau** | offrir un article à un autre joueur (prix + petit supplément) | social, viral |

## 3. Articles qui ne s'achètent pas

Une vraie boutique contient aussi des objets qu'on ne peut que **gagner**. Ce sont eux qui ont le
plus de valeur aux yeux des joueurs.

| Récompense | Comment l'obtenir |
|---|---|
| Titre « Visionnaire » | gagner un pari sur un pilote coté à plus de 20 |
| Cadre « Grand Chelem » | trouver les vainqueurs F1, MotoGP et NASCAR du même week-end |
| Badge « Fidèle au paddock » | parier sur 10 courses d'affilée |
| Casque « Champion 2026 » | finir premier du classement général de la saison |
| Titre « Nostradamus » | trouver le champion du monde dès le début de la saison |
| Effet « Feu d'artifice » | 5 pronostics gagnants d'affilée |

Ces objets apparaissent dans la boutique avec un cadenas et la condition à remplir. C'est un
moteur d'engagement gratuit.

## 4. Articles utiles (avec prudence)

Tout ce qui change les gains crée des APEX et déséquilibre le classement. Si on en ajoute,
uniquement avec des limites strictes :

| Article | Effet | Garde-fou |
|---|---|---|
| Assurance pari | rembourse 50 % d'un pari perdu | 1 par week-end, mise assurée limitée à 500 APEX |
| Annulation tardive | annuler un pari après la clôture du marché, jusqu'aux qualifications | 1 par mois |
| Statistiques avancées | accès aux cotes GridBook détaillées et à l'historique des pilotes (voir `cotes-et-bonus.md`) | aucun effet sur les gains : sans risque |
| Emplacement de pari en plus | parier sur 2 pilotes de la même course | coûte cher, limité à 1 course par week-end |

Le plus sûr est de rester sur du cosmétique et de l'information (statistiques), et de garder les
effets sur les gains pour le système de bonus officiel.

## 5. Présentation de la boutique

- **Onglets** : À la une · Collections · Avatars et casques · Profil (cadres, bannières, couleurs) ·
  Effets · Récompenses (à gagner) · Mon inventaire.
- **Bandeau du week-end** en haut : la collection du prochain circuit, avec un compte à rebours
  avant son retrait.
- **Fiche article** : grand aperçu sur ton propre profil, rareté, collection, date d'arrivée,
  nombre de joueurs qui le possèdent (« 3 % des joueurs »), stock restant pour les éditions
  numérotées.
- **Essayage** : aperçu combiné de plusieurs articles avant achat (casque + cadre + titre).
- **Historique d'achats** dans le profil, avec le prix payé.
- **Profil public** pour montrer ce qu'on possède : sans vitrine, les cosmétiques ont peu
  d'intérêt.

## 6. Équilibre de l'économie

La boutique est le principal moyen de dépenser des APEX : elle doit absorber ce que les joueurs
gagnent.

- Garder des prix étalés : quelques articles à moins de 1 000 APEX pour les débutants, des
  pièces de prestige au-dessus de 20 000 APEX pour les meilleurs joueurs.
- Suivre chaque semaine, dans l'admin : APEX dépensés en boutique, APEX gagnés en paris, solde
  moyen. Si les soldes montent sans arrêt, ajouter des pièces de prestige.
- Faire des articles numérotés et des enchères (numéro de course, casque unique) les sorties
  d'APEX des joueurs les plus riches.

## 7. Ce que ça demande dans le code

| Besoin | Changement |
|---|---|
| Disponibilité dans le temps | colonnes `available_from`, `available_until` sur `products` |
| Éditions numérotées | colonnes `stock`, `sold_count` ; numéro d'exemplaire sur `purchases` |
| Collections et lots | tables `collections` et `bundle_items` ; achat d'un lot en une transaction |
| Récompenses à gagner | colonne `unlock_rule` (JSON) sur `products` ; vérification après chaque règlement de course |
| Nouvelles catégories | étendre `CATEGORIES` (`app/models/shop.py`) et `UserAvatar` / le profil côté interface |
| Casques personnalisés | composant SVG paramétrable ; le choix est stocké en JSON sur l'article possédé |
| Liste de souhaits, cadeaux | tables `wishlist`, `gifts` |
| Vitrine du week-end | sélection d'articles par course (`featured_race_id`) ou gérée par l'admin |

Ordre conseillé : vitrine du week-end avec éditions limitées, puis récompenses à gagner, puis
casques personnalisés avec profil public, puis collections et cadeaux.
