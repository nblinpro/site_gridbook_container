# Boutique : idées pour la suite

Idées pour enrichir encore la boutique GridBook. Seules les idées **pas encore réalisées**
figurent ici.

## Point de départ (version 2.1.0)

La boutique propose déjà (détail dans le README, section « Boutique ») :

- 45 articles cosmétiques en 5 catégories : avatar, cadre, badge, titre, couleur du pseudo ;
- 7 collections, achetables en lot avec remise, dont une éphémère et une numérotée ;
- éditions limitées dans le temps et éditions numérotées (numéro d'exemplaire) ;
- 6 récompenses non achetables, débloquées en jouant ;
- vitrine « À la une », catalogue avec recherche, filtres et tri, fiche article avec essayage ;
- liste de souhaits, historique des achats, badge « Populaire » ;
- gestion admin : ventes, APEX dépensés, prix, mise à la une, retrait de la vente.

## Trois règles à garder

1. **Uniquement de l'APEX, jamais d'argent réel.** GridBook est un jeu de pronostics : vendre de
   l'APEX ou des articles contre des euros en ferait un jeu d'argent, soumis à l'autorisation de
   l'ANJ.
2. **Pas de boîtes surprises payantes** (« loot boxes ») : le joueur sait toujours ce qu'il achète.
3. **Pas de logos ni de noms protégés.** Les noms et logos des écuries, des championnats et des
   pilotes sont des marques déposées : on s'en inspire (« Rouge Maranello », « Orange Papaya »)
   sans les reproduire.

## 1. Nouvelles catégories d'articles

| Catégorie | Ce que c'est | Où ça se voit | Exemples |
|---|---|---|---|
| **Casque** | avatar dessiné (SVG) : coque, couleur, motif, visière, numéro | barre supérieure, classements, profil | casque « Damier », « Flammes », « Néon » |
| **Livrée de profil** | bannière en haut du profil public | page profil, carte du joueur au classement | « Grille de départ de nuit », « Ligne droite des stands » |
| **Numéro de course** | numéro personnel affiché à côté du pseudo (1 à 99, réservé à un joueur) | partout où le pseudo apparaît | « #1 » vendu aux enchères en APEX en fin de saison |
| **Effet de victoire** | animation quand un pari est gagné (confettis, drapeau à damier, burnout) | notification de gain | « Pluie de champagne », « Drapeau à damier » |
| **Réactions** | petites réactions à poser sur le fil d'une course | page d'une course (avec la discussion par course, voir `ameliorations.md`) | 🔥 🏁 😱 personnalisées |
| **Thème d'interface** | variante de couleurs de tout le site pour soi | tout le site | « Nuit de Singapour », « Asphalte », « Paddock blanc » |
| **Cadres animés** | d'autres effets que le reflet du cadre légendaire : pulsation, flammes, néon clignotant | avatar | « Cadre Turbo », « Cadre Néon animé » |
| **Carte de collection** | carte numérique d'un circuit ou d'un moment de la saison | album de collection du profil | « Monza 2026 », « Victoire surprise de l'année » |

Le casque est l'article le plus fort : c'est l'identité visuelle d'un pilote. Un éditeur
(coque + couleur + motif + numéro) donnerait des milliers de combinaisons et ferait de chaque
pièce un article à part.

## 2. Faire vivre la vitrine

| Mécanique | Principe | Effet |
|---|---|---|
| **Rotation automatique de la vitrine** | à chaque week-end de course, la collection liée au circuit passe « À la une » sans intervention de l'admin | une raison de revenir chaque week-end |
| **Bonus de collection complète** | posséder toute une collection débloque un article exclusif (cadre ou titre « Collectionneur ») | envie de compléter |
| **Fin de saison** | les collections de la saison sont retirées automatiquement à la fin du championnat | les anciens joueurs gardent des pièces introuvables |
| **Soldes** | réduction temporaire sur une sélection, pendant la trêve hivernale ou après un gros week-end | relance la dépense d'APEX |
| **Nouveautés** | badge « Nouveau » pendant 7 jours, tri par date d'arrivée | la boutique paraît vivante |
| **Alertes de la liste de souhaits** | notification quand un article souhaité revient en vente ou passe en solde | transforme les envies en achats |
| **Cadeau** | offrir un article à un autre joueur (prix + petit supplément) | social, viral |

## 3. Nouvelles récompenses à gagner

Le mécanisme existe déjà (`unlock_rule` dans `app/services/shop_catalog.py`, conditions dans
`app/services/rewards.py`). Il reste à ajouter de nouvelles conditions :

| Récompense | Comment l'obtenir | Condition à ajouter |
|---|---|---|
| Casque « Champion 2026 » | finir premier du classement général de la saison | rang au classement général en fin de saison |
| Effet « Feu d'artifice » | 5 pronostics gagnants d'affilée | série de paris gagnants consécutifs |
| Cadre « Week-end parfait » | trouver les vainqueurs F1, MotoGP et NASCAR du même week-end | 3 paris gagnants sur des courses de la même semaine |
| Badge « Pilier du paddock » | parier sur 10 courses d'affilée sans en manquer une | série de courses consécutives jouées |

## 4. Articles utiles (avec prudence)

Tout ce qui change les gains crée des APEX et déséquilibre le classement. Si on en ajoute,
uniquement avec des limites strictes :

| Article | Effet | Garde-fou |
|---|---|---|
| Assurance pari | rembourse 50 % d'un pari perdu | 1 par week-end, mise assurée limitée à 500 APEX |
| Annulation tardive | annuler un pari après la clôture du marché, jusqu'aux qualifications | 1 par mois |
| Statistiques avancées | accès aux cotes GridBook détaillées et à l'historique des pilotes (voir `cotes-et-bonus.md`) | aucun effet sur les gains : sans risque |
| Emplacement de pari en plus | parier sur 2 pilotes de la même course | coûte cher, limité à 1 course par week-end |

Le plus sûr reste le cosmétique et l'information (statistiques), en gardant les effets sur les
gains pour le système de bonus officiel.

## 5. Présentation

- **Essayage combiné** : composer un ensemble (avatar + cadre + titre + couleur du pseudo) avant
  d'acheter, au lieu d'essayer les articles un par un.
- **Profil public** pour montrer ce qu'on possède : sans vitrine visible des autres joueurs, les
  cosmétiques ont peu d'intérêt (voir « Page profil publique » dans `ameliorations.md`).

## 6. Équilibre de l'économie

La boutique est le principal moyen de dépenser des APEX : elle doit absorber ce que les joueurs
gagnent.

- Suivre chaque semaine, dans l'admin : APEX dépensés en boutique, APEX gagnés en paris, solde
  moyen. Si les soldes montent sans arrêt, ajouter des pièces de prestige.
- Ajouter des **enchères** (numéro de course, casque unique) pour absorber les APEX des joueurs
  les plus riches.

## 7. Ce que ça demande dans le code

| Besoin | Changement |
|---|---|
| Nouvelles catégories | étendre `CATEGORIES` (`app/models/shop.py`), `UserAvatar` / `UserName` et le profil côté interface |
| Casques personnalisés | composant SVG paramétrable ; le choix est stocké en JSON sur l'article possédé |
| Rotation de la vitrine | lien entre une collection et une course (`featured_race_id`), lu par la synchronisation |
| Fin de saison, soldes | dates de fin et pourcentage de réduction sur `collections` et `products` |
| Nouveautés | badge calculé à partir de `products.created_at` |
| Nouvelles récompenses | nouveaux types de condition dans `app/services/rewards.py` |
| Cadeaux | table `gifts` (expéditeur, destinataire, article, message) |
| Alertes | dépend des notifications (voir `ameliorations.md`) |
| Enchères | tables `auctions` et `bids`, clôture automatique |

Ordre conseillé : rotation automatique de la vitrine et nouveautés, puis nouvelles récompenses,
puis casques personnalisés avec profil public, puis soldes, cadeaux et enchères.
