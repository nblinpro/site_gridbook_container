# Charte d'interface GridBook

Style « broadcast », celui d'une application officielle de sport mécanique (F1 TV, MotoGP) :
fond sombre, typographie sobre, données mises en avant, une couleur par championnat.

Toutes les pages connectées suivent cette charte depuis la version 2.0.0 (refonte d'octobre 2026).

## Fichiers de référence

| Fichier | Contenu |
|---|---|
| `frontend/src/styles/theme.css` | variables : couleurs, typographie, espacements, rayons, ombres, mise en page |
| `frontend/src/index.css` | base HTML : reset, focus clavier, chiffres alignés, `.sr-only` |
| `frontend/src/styles/ui.css` | composants CSS communs (§ Composants CSS) |
| `frontend/src/components/Layout.jsx` + `layout.css` | structure des pages connectées |
| `frontend/src/components/ui/` | `Icon`, `PageHeader`, `EmptyState` |
| `frontend/src/utils/format.js` | dates, compte à rebours, montants, cotes, statuts de pari |
| `frontend/src/data/disciplines.js` | championnats : nom, couleur, couleur de texte, routes, libellés |
| `frontend/src/pages/SportsHome.jsx` | page modèle, la plus simple à copier |

## Règles

1. **Aucune valeur en dur** dans le CSS d'une page : couleurs, tailles, espacements et rayons
   viennent des variables (`var(--surface-1)`, `var(--sp-4)`, `var(--radius-lg)`…). Seules
   exceptions admises, documentées au § Couleurs propres à un domaine.
2. **Couleur du championnat** : `var(--sport)`, posée par le Layout selon le championnat courant.
   Texte sur cette couleur : `var(--sport-contrast)`. Pour un élément d'un autre championnat
   (carte, ligne d'historique), poser sur l'élément :
   `style={{ "--sport": d.accent, "--sport-contrast": d.contrast }}`.
   `var(--sport-soft)` (fond teinté) suit automatiquement, grâce à la règle
   `[style*="--sport"]` de `theme.css`.
   Le rouge de marque `var(--brand)` est réservé au logo et aux éléments de marque.
3. **Typographie** : `--font-ui` (Inter) pour tout le texte ; `--font-display` (Barlow Condensed,
   majuscules) uniquement pour les titres de page, titres de section et grands chiffres.
   Pas de monospace, pas d'Orbitron.
4. **Textes** : en français, phrases normales. Pas de jargon façon code (`SYSTEM_ONLINE`,
   `RACE_RESOLUTION_CENTER`, `// TAG`) ni de libellés en anglais. Les majuscules viennent du CSS,
   jamais du texte saisi.
5. **Chiffres** : `formatApex`, `formatOdds` et les dates de `utils/format.js`. Les montants sont
   toujours suivis de « APEX ». Les colonnes et valeurs numériques ont la classe `num`
   (chiffres alignés, colonnes à droite).
6. **États obligatoires** pour chaque bloc de données : chargement (`skeleton`), vide
   (`EmptyState` qui dit quoi faire ensuite) et erreur (`alert alert-danger`, avec « Réessayer »
   quand c'est possible).
7. **Icônes** : composant `Icon` (SVG). Les emojis sont réservés aux cosmétiques de la boutique.
8. **Accessibilité** : vrais `<button>` et `<a>`, un `label` par champ, `aria-selected` sur les
   onglets, `aria-pressed` sur les sélecteurs segmentés, `role="dialog"` + `aria-modal` sur les
   fenêtres, contraste AA (texte secondaire `--text-2` au minimum sur fond `--surface-*`),
   focus clavier visible, fermeture des fenêtres par Échap.
9. **Responsive** : tout fonctionne à 390 px de large sans défilement horizontal de la page.
   Les tableaux larges défilent dans `.table-wrap` ou deviennent des cartes (voir
   `betHistory.css` : libellés via `data-label`).
10. **Données réelles uniquement** : ne jamais présenter des données simulées comme du direct.
    Une image indisponible est remplacée par un schéma qui le dit (`TrackSchematic`).

## Ordre des styles

`main.jsx` importe les styles globaux **avant** l'application :
`theme.css` → `index.css` → `ui.css`, puis les composants, qui chargent leur propre CSS.
Une feuille de page peut donc surcharger un composant commun à spécificité égale
(`.pb-hero` sur `.card`).

Ne pas déplacer ces imports : si `ui.css` passe après les pages, ses règles écrasent les mises en
page locales (bug corrigé en 2.0.0, qui écrasait par exemple l'en-tête de la page de pari).

Chaque page préfixe ses classes (`pb-` page de pari, `sb-` paris de saison, `bh-` historique,
`shop-`, `adm-` / `acc-` admin, `cal-` calendrier, `home-` accueil) pour éviter les collisions.

## Structure des pages connectées (`Layout`)

```
┌ barre supérieure ─ logo · championnats (F1 · MotoGP · NASCAR) · liens · solde · compte ┐
├ sous-navigation ── Formule 1 │ Accueil · Calendrier · Classements · Paris de saison · Mes paris ┤
│                                                                                      │
│  contenu (.main, max 1320 px)                     │ panneau « Mes paris en cours »   │
│                                                   │ (≥ 1280 px, collant)             │
└ pied de page ────────────────────────────────────────────────────────────────────────┘
```

- Sur les pages `/admin*`, la sous-navigation devient celle de l'administration et le panneau
  disparaît.
- Sur les pages communes (accueil `/sports`, boutique, classement général, « Mes paris » tous
  championnats, notes de version), aucun championnat n'est « actif » : la sous-navigation devient
  celle de GridBook (Accueil → `/sports`) et la page prend la couleur de la marque.
- Chaque championnat a ses adresses sous son préfixe : `/f1`, `/motogp`, `/nascar`
  (+ `/calendar`, `/standings`, `/season-bets`, `/history`). `/dashboard` et `/season-bets`
  redirigent vers `/f1` et `/f1/season-bets`.
- `<Layout rail={false}>` retire le panneau pour les pages larges (boutique, page de pari, admin).
- Sous 1100 px, les liens de la barre passent dans un tiroir (bouton ☰). Sous 760 px, le
  sélecteur de championnat passe sur sa propre ligne.
- Le Layout rafraîchit le solde et les paris à chaque changement de page et à l'événement
  `window.dispatchEvent(new Event("refreshDashboard"))`. Toute action qui change le solde doit
  émettre cet événement.

## Composants CSS (`ui.css`)

```html
<div class="page">                                  <!-- conteneur d'une page, espacement vertical -->
  <PageHeader eyebrow="Formule 1 · 2026" title="Calendrier" subtitle="…" actions={…} />

  <section class="section">
    <div class="section-head"><h2 class="section-title">Prochains Grands Prix</h2> <a class="btn-link">…</a></div>
    <div class="grid grid-3"> … </div>               <!-- grid-2 · grid-3 · grid-4 · grid-auto -->
  </section>

  <div class="card">  .card-flush (sans marge, en-tête séparé)  .card-interactive (survol)  .card-accent (filet couleur sport)
    <div class="card-head"><span class="card-title">…</span><span class="card-subtitle">…</span></div>
  </div>

  <div class="stat"><span class="stat-label">Solde</span><span class="stat-value">10 000<small>APEX</small></span><span class="stat-hint">…</span></div>

  <button class="btn btn-primary">  btn-secondary · btn-ghost · btn-danger · btn-brand · btn-success · btn-link
                                    tailles : btn-sm · btn-lg · btn-block · btn-icon
  <label class="field"><span class="field-label">Montant</span><input class="input"><span class="field-hint">…</span></label>
  <select class="select">   .textarea   .input-sm   .input-group + .input-suffix (« APEX » dans le champ)
  <span class="badge badge-success">  badge-sport · badge-info · badge-warning · badge-danger · badge-live
  <div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true">…</button></div>
  <div class="segmented"><button aria-pressed="true">…</button></div>
  <div class="table-wrap"><table class="table">…<td class="num">…</td></table></div>
  <span class="pos pos-1">1</span>                  <!-- pastille de position or / argent / bronze -->
  <span class="team-bar" style="--team:#3671c6"></span>
  <div class="alert alert-info">…</div>             <!-- alert-warning · alert-danger · alert-success -->
  <div class="skeleton" style="height:120px"></div>
  <div class="progress"><span style="width:40%"></span></div>
  <div class="kv"><span>Mise</span><strong>10 APEX</strong></div>
</div>
```

Utilitaires : `muted`, `text-2`, `strong`, `num`, `truncate`, `divider`, `dot`, `sr-only`.

## Composants React

| Composant | Rôle | Props principales |
|---|---|---|
| `components/Layout` | structure de page (voir plus haut) | `rail` |
| `components/ui/PageHeader` | surtitre, titre, sous-titre, actions | `eyebrow`, `title`, `subtitle`, `actions` |
| `components/ui/EmptyState` | liste vide : pourquoi et action suivante | `icon`, `title`, `action`, `children` |
| `components/ui/Icon` | icônes SVG de l'interface (`home`, `calendar`, `trophy`, `ticket`, `wallet`, `shield`, `users`, `cart`, `bag`, `flag`, `chart`, `clock`, `mapPin`, `lock`, `check`, `x`, `info`, `search`, `settings`, `refresh`, `plus`, `arrowRight`, `chevronRight`, `chevronDown`, `menu`, `close`, `logout`, `file`, `history`, `sparkles`) | `name`, `size`, `strokeWidth`, `title` |
| `components/confirm/ConfirmDialog` | confirmation d'une action (achat, annulation, versement de gains) | `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `danger`, `onConfirm`, `onCancel` |
| `components/toast/ToastContext` | notifications : `useToast()` → `toast.success / error / info / warning(message)` | — |
| `components/loader/F1LightsLoader` | chargement plein écran (feux de départ) | `label` |
| `components/cosmetics/UserAvatar` | avatar avec les cosmétiques équipés (emoji, cadre, badge) | `username`, `cosmetics`, `size`, `glow` |
| `components/cosmetics/UserName` | pseudo avec sa couleur achetée (unie ou dégradé) ; à utiliser partout où un pseudo s'affiche | `name`, `cosmetics` |
| `components/bets/ParticipantPicker` | liste de pilotes / équipes avec recherche (boutons radio natifs) | `items`, `value`, `onChange`, `legend`, `oddsFor`, `disabled` |
| `components/bets/AmountField` | champ de mise : suffixe APEX, raccourcis +10 / +50 / +100 / Max, solde | `id`, `value`, `onChange`, `wallet`, `error` |
| `components/bets/odds.js` | `estimateOdds(cagnotte, misesSélection, mise)`, `stakeError(mise, solde)` | — |
| `components/circuit/TrackSchematic` | schéma indicatif d'un tracé quand l'image manque | `schematic` (`type`, `description`), `accent` |
| `pages/sport/SportBits` | `DateBlock`, `SkeletonRows`, `ErrorAlert` (pages de championnat) | — |

`useToast()` renvoie un objet stable : il peut figurer dans les dépendances d'un `useEffect`.

## Fonctions utilitaires

| Fichier | Fonctions |
|---|---|
| `utils/format.js` | `formatDate` (25 oct. 2026), `formatDay` (dim. 25 oct.), `formatTime`, `formatDateTime`, `countdown` (« dans 2 j 4 h »), `formatApex`, `formatOdds`, `BET_STATUS` (libellé + badge par statut) |
| `pages/sport/sportFormat.js` | `orderRaces`, `raceState`, `placeOf`, `f1ResultsPath`, `f1DetailsPath`, `formatPoints`, `teamColor`, `useNow`, `splitCountdown` |
| `data/circuitView.js` | `buildCircuitView` : fiche circuit unifiée (F1 locale, MotoGP et NASCAR depuis l'API) |

Les dates de l'API sont en UTC sans fuseau : toujours passer par `toDate` / les fonctions
ci-dessus, qui les affichent à l'heure locale du visiteur.

## Couleurs propres à un domaine

| Domaine | Où | Valeurs |
|---|---|---|
| Championnats | `data/disciplines.js` | F1 `#e10600` (texte blanc), MotoGP `#ff6a13` (texte `#1a0a00`), NASCAR `#ffd659` (texte `#1a1400`) |
| Podium | `theme.css` | `--gold`, `--silver`, `--bronze` |
| Rareté (boutique) | `pages/shop/shop.css`, sur `.shop-page` | commun `--text-3`, rare `--info`, épique `#b37bff`, légendaire `--gold` |
| Écuries F1 | `sportFormat.js` (`teamColor`) | couleurs officielles, pour `.team-bar` |

Ajouter une couleur ailleurs : la déclarer comme variable locale en haut de la feuille de la page,
avec un commentaire.

## Pages

| Route | Fichier |
|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | `pages/login/`, `pages/register/` (hors Layout, écran partagé) |
| `/sports` | `pages/SportsHome.jsx` |
| `/f1`, `/motogp`, `/nascar` | `pages/sport/SportDashboard.jsx` |
| `/f1/calendar`, `/motogp/calendar`, `/nascar/calendar` | `pages/sport/SportCalendar.jsx` |
| `/…/standings` | `pages/sport/SportStandings.jsx` |
| `/f1/:season/race/:round`, `…/results` | `pages/f1/RaceDetails.jsx`, `RaceResults.jsx` |
| `/place-bet/:raceId` | `pages/PlaceBet.jsx` |
| `/f1/season-bets`, `/motogp/season-bets`, `/nascar/season-bets` | `pages/SeasonBets.jsx` |
| `/f1/history`, `/…/history`, `/bet-history` | `pages/BetHistory.jsx` |
| `/leaderboard` | `pages/Leaderboard.jsx` |
| `/shop` | `pages/shop/Shop.jsx` (+ `ShopParts.jsx`, `shopUtils.js`) |
| `/PatchNotes` | `pages/PatchNotes.jsx` |
| `/admin`, `/admin/accounts` | `pages/AdminDashboard.jsx`, `pages/AdminAccounts.jsx` |

## Vérifier une modification

```bash
cd frontend
npm run lint                                  # 0 erreur attendue
VITE_API_URL=/api npx vite --port 5180        # serveur de dev, /api relayé vers le backend Docker

cd ../e2e
BASE_URL=http://localhost:5180 node screenshots.mjs <dossier> 1440 full   # captures + débordements + erreurs JS
BASE_URL=http://localhost:5180 node screenshots.mjs <dossier> 390 full    # même chose en mobile
BASE_URL=http://localhost:5180 node run.mjs                               # parcours complet (36 tests)
```

`screenshots.mjs` signale toute page qui déborde horizontalement et toute erreur JavaScript.
Regarder les captures à 1440 px **et** à 390 px avant de livrer.

## Dette connue

- **Fenêtre modale et panneau latéral** : implémentés localement dans `admin.css`
  (`.adm-overlay`, `.adm-modal`, `.adm-drawer`, `.adm-dialog-*`) et, pour la fiche article,
  dans `pages/shop/shop.css` (`.shop-modal`). Deux versions existent désormais : à extraire en
  composants communs (`components/ui/Modal`, `Drawer`).
- **`useNow` en double** : une version locale dans `PlaceBet.jsx` (30 s) et une dans
  `sportFormat.js` (1 s). À unifier dans `utils/`.
- **`formatEventDate`** (`sportFormat.js`) : ancien format en majuscules, plus utilisé nulle
  part. À supprimer (utiliser `formatDate`).
- **Images des circuits NASCAR** : bloquées par nascar.com (protection Cloudflare), d'où le
  schéma indicatif. Les héberger localement, comme celles de la F1 dans `frontend/public/`,
  supprimerait le problème.
