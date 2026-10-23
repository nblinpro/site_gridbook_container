# Charte d'interface GridBook

Style « broadcast » : celui d'une application officielle de sport mécanique (F1 TV, MotoGP).
Fond sombre, typographie sobre, données mises en avant, une couleur par championnat.

## Fichiers de référence

| Fichier | Contenu |
|---|---|
| `frontend/src/styles/theme.css` | variables : couleurs, typo, espacements, rayons, ombres |
| `frontend/src/index.css` | base HTML (reset, focus clavier, chiffres alignés) |
| `frontend/src/styles/ui.css` | composants : page, carte, bouton, champ, badge, onglets, tableau, états |
| `frontend/src/components/Layout.jsx` | structure des pages connectées (barre, sous-navigation, panneau des paris) |
| `frontend/src/components/ui/` | `Icon`, `PageHeader`, `EmptyState` |
| `frontend/src/utils/format.js` | dates, compte à rebours, montants, cotes, statuts de pari |
| `frontend/src/pages/SportsHome.jsx` | page modèle |

## Règles

1. **Aucune valeur en dur** dans le CSS d'une page : couleurs, tailles, espacements et rayons
   viennent des variables (`var(--surface-1)`, `var(--sp-4)`, `var(--radius-lg)`…).
2. **Couleur du championnat** : `var(--sport)`, posée par le Layout (F1 `#e10600`, MotoGP `#ff6a13`,
   NASCAR `#ffd659`). Texte sur cette couleur : `var(--sport-contrast)`. Pour une carte d'un autre
   sport, poser `style={{ "--sport": d.accent, "--sport-contrast": d.contrast }}` sur l'élément.
   Le rouge de marque `var(--brand)` est réservé au logo et aux alertes de marque.
3. **Typographie** : `--font-ui` (Inter) pour tout le texte ; `--font-display` (Barlow Condensed,
   majuscules) uniquement pour les titres de page, titres de section et grands chiffres.
   Pas de monospace, pas d'Orbitron.
4. **Textes** : en français, phrases normales. Pas de jargon façon code (`SYSTEM_ONLINE`,
   `UPLOADING_ENCRYPTED_DATA`, `// TAG`) ni de libellés en anglais. Les majuscules viennent du CSS,
   jamais du texte saisi.
5. **Chiffres** : `formatApex`, `formatOdds` et les dates de `utils/format.js`. Les montants
   sont toujours suivis de « APEX ». Les colonnes numériques ont la classe `num` (alignées à droite).
6. **États obligatoires** pour chaque bloc de données : chargement (`skeleton`), vide
   (`EmptyState` qui dit quoi faire ensuite) et erreur (`alert alert-danger`).
7. **Icônes** : composant `Icon` (SVG). Les emojis sont réservés aux cosmétiques de la boutique.
8. **Accessibilité** : vrais `<button>` et `<a>`, `label` sur chaque champ, `aria-selected` sur les
   onglets, contraste AA (texte secondaire `--text-2` minimum sur fond `--surface-*`), focus visible.
9. **Responsive** : tout fonctionne à 390 px de large sans défilement horizontal de la page
   (les tableaux larges défilent dans `.table-wrap`).
10. **Données réelles uniquement** : ne jamais afficher de données simulées comme si elles étaient
    en direct.

## Composants (classes de `ui.css`)

```html
<div class="page">                                  <!-- conteneur d'une page, espacement vertical -->
  <PageHeader eyebrow="Formule 1 · 2026" title="Calendrier" subtitle="…" actions={…} />

  <section class="section">
    <div class="section-head"><h2 class="section-title">Prochains Grands Prix</h2> <a class="btn-link">…</a></div>
    <div class="grid grid-3"> … </div>
  </section>

  <div class="card">  .card-flush (sans marge, en-tête séparé)  .card-interactive (survol)  .card-accent (filet couleur sport)
    <div class="card-head"><span class="card-title">…</span></div>
  </div>

  <div class="stat"><span class="stat-label">Solde</span><span class="stat-value">10 000<small>APEX</small></span></div>

  <button class="btn btn-primary">  btn-secondary · btn-ghost · btn-danger · btn-brand · btn-link   tailles : btn-sm · btn-lg · btn-block · btn-icon
  <label class="field"><span class="field-label">Montant</span><input class="input"> <span class="field-hint">…</span></label>
  <select class="select">   .input-group + .input-suffix (« APEX » dans le champ)
  <span class="badge badge-success">  badge-sport · badge-info · badge-warning · badge-danger · badge-live
  <div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true">…</button></div>
  <div class="segmented"><button aria-pressed="true">…</button></div>
  <div class="table-wrap"><table class="table">…<td class="num">…</td></table></div>
  <span class="pos pos-1">1</span>  (pastille de position or/argent/bronze)
  <div class="alert alert-info">…</div>   <div class="skeleton" style="height:120px"></div>
  <div class="progress"><span style="width:40%"></span></div>
</div>
```

`<Layout>` entoure chaque page connectée. `<Layout rail={false}>` retire le panneau
« Mes paris en cours » (pages larges : admin, boutique, tableaux).
