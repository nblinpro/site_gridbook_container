# Cotes GridBook et bonus de gains

Document de conception : ajouter à GridBook une **cote calculée à partir des données**
(probabilité de victoire de chaque pilote) et un **bonus de gains** quand un outsider gagne.

État : proposition, rien n'est implémenté.

---

## 1. Principe

Aujourd'hui, la seule cote est celle du **pari mutuel** : `cagnotte totale ÷ mises sur le pilote`
(`app/services/settlement.py`). Elle reflète ce que jouent les joueurs, pas les chances réelles,
et elle ne vaut rien quand il y a peu de mises (un seul parieur donne une cote de 1).

On garde le pari mutuel, sans risque pour l'économie du jeu, et on y ajoute :

| Élément | Rôle | Qui paie |
|---|---|---|
| **Cote GridBook** | probabilité de victoire estimée par un modèle → cote = 1 ÷ probabilité, moins une marge | personne : c'est une information |
| **Bonus outsider** | gains multipliés quand le vainqueur avait peu de chances selon la cote GridBook | la banque GridBook (APEX créés) |

Le joueur voit donc deux choses : ce que pense la communauté (cote mutuelle) et ce que disent
les données (cote GridBook).

---

## 2. Base de données

### 2.1 Nouvelle table `odds`

Une ligne par pilote, par course et par calcul. On garde l'historique pour afficher l'évolution
de la cote.

```python
# app/models/odds.py
class Odds(Base):
    __tablename__ = "odds"
    __table_args__ = (Index("ix_odds_race_computed", "race_id", "computed_at"),)

    id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    probability = Column(Float, nullable=False)        # 0 → 1, somme = 1 sur la course
    odds = Column(Numeric(6, 2), nullable=False)       # cote affichée, marge incluse, plafonnée
    model = Column(String(30), nullable=False)          # "elo-v1" : permet de comparer des versions
    phase = Column(String(20), nullable=False)          # "pre_qualif" | "post_qualif"
    explanation = Column(Text)                          # facultatif, voir § 7
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

La table est créée automatiquement par `create_all()` au démarrage (nouvelle table).

### 2.2 Nouvelles colonnes sur `bets`

`bets.odds` est réécrite au règlement avec la cote mutuelle finale : on ne peut pas s'en servir
pour mémoriser la cote GridBook. On ajoute deux colonnes, déclarées dans
`app/migrations.py` (`COLUMNS`) car la table existe déjà :

```python
COLUMNS = [
    ("races", "circuit_id", "INT NULL", "FOREIGN KEY (circuit_id) REFERENCES circuits(id)"),
    ("bets", "model_odds", "DECIMAL(6,2) NULL", None),   # cote GridBook au moment du pari
    ("bets", "bonus", "FLOAT NOT NULL DEFAULT 0", None), # APEX de bonus versés au règlement
]
```

`model_odds` reste `NULL` pour les paris placés avant la mise en service : aucun bonus pour eux.

---

## 3. Calcul des cotes

Nouveau module `app/services/odds/`, un calculateur commun aux trois championnats.

### 3.1 Modèle de départ : classement Elo

Chaque pilote a une note (1500 au départ). Après chaque course, on compare chaque paire de
pilotes : celui qui finit devant gagne des points, l'autre en perd, d'autant plus que la
victoire était inattendue.

```python
K = 24  # vitesse d'ajustement, à régler par backtest (§ 8)

def update_elo(ratings: dict[int, float], finishing_order: list[int]) -> None:
    """Met à jour les notes après une course (order = ids des pilotes, du 1er au dernier)."""
    n = len(finishing_order)
    deltas = {d: 0.0 for d in finishing_order}
    for i, a in enumerate(finishing_order):
        for b in finishing_order[i + 1:]:            # a a terminé devant b
            expected_a = 1 / (1 + 10 ** ((ratings[b] - ratings[a]) / 400))
            deltas[a] += K * (1 - expected_a) / (n - 1)
            deltas[b] -= K * (1 - expected_a) / (n - 1)
    for d, delta in deltas.items():
        ratings[d] += delta
```

Probabilités de victoire à partir des notes :

```python
def win_probabilities(ratings: dict[int, float], grid: dict[int, int] | None = None) -> dict[int, float]:
    scores = {d: 10 ** (r / 400) for d, r in ratings.items()}
    if grid:  # après les qualifications : la position de départ pèse lourd (surtout en F1)
        scores = {d: s * GRID_WEIGHT ** (-(grid.get(d, 20) - 1)) for d, s in scores.items()}
    total = sum(scores.values())
    return {d: s / total for d, s in scores.items()}
```

`GRID_WEIGHT` (environ 1,15 en F1, plus faible en NASCAR) se règle par backtest.
Les notes s'initialisent en rejouant l'historique disponible :

| Championnat | Historique | Source déjà utilisée |
|---|---|---|
| F1 | résultats et qualifications depuis 1950 | Jolpica (`/{year}/results.json`, `/{year}/qualifying.json`) |
| MotoGP | toutes les séances (essais, qualifs, sprint, course) | `api.motogp.pulselive.com/motogp/v1/results` |
| NASCAR | résultats par saison, qualifications | `cf.nascar.com/cacher/{year}/…` |

### 3.2 De la probabilité à la cote

```python
MARGIN = 0.05        # marge de la banque
MIN_ODDS, MAX_ODDS = 1.05, 50.0

def to_odds(probability: float) -> float:
    raw = (1 - MARGIN) / max(probability, 1e-6)
    return round(min(max(raw, MIN_ODDS), MAX_ODDS), 2)
```

### 3.3 Améliorations ultérieures

Par ordre d'intérêt : forme récente (5 dernières courses), taux d'abandon, historique du pilote
sur le circuit ou sur le type de piste NASCAR (`circuits.details.type`), force de l'écurie, temps
des essais (OpenF1, MotoGP). Le niveau suivant est un modèle entraîné (régression logistique,
gradient boosting) sur ces variables. Chaque version a son propre nom dans `odds.model` pour
comparer les résultats.

---

## 4. Quand recalculer

| Moment | Déclencheur | `phase` |
|---|---|---|
| Toutes les 6 h | fin de `run_sync()` (`app/services/sync/__init__.py`) pour chaque course ouverte | `pre_qualif` |
| Dès que la grille est connue | la synchro trouve les qualifications de la prochaine course | `post_qualif` |
| Après chaque course terminée | la synchro règle la course → mise à jour des notes Elo | — |

```python
# fin de run_sync(slug), une fois les courses importées
for race in open_races(db, discipline):
    compute_and_store_odds(db, race)   # écrit une nouvelle série de lignes dans `odds`
db.commit()
```

Une course n'a de nouvelles lignes que si les probabilités changent de plus de 0,5 point, pour
ne pas remplir la table pour rien.

---

## 5. API

### `GET /races/{race_id}/odds`

Dernière série de cotes de la course, avec l'historique utile au graphique. Accessible aux
joueurs connectés.

```json
{
  "race_id": 18,
  "model": "elo-v1",
  "phase": "post_qualif",
  "computed_at": "2026-10-24T21:05:00Z",
  "drivers": [
    {
      "driver_id": 4, "name": "Max Verstappen", "team": "Red Bull",
      "probability": 0.28, "odds": 3.39, "rank": 1, "tag": "favori",
      "trend": [4.10, 3.80, 3.39],
      "explanation": "Parti 2e, a gagné 2 des 5 dernières courses…"
    }
  ]
}
```

`tag` vaut `favori` (top 3), `outsider` (probabilité < 10 %) ou `null`. `trend` contient les
cotes des derniers calculs, du plus ancien au plus récent.

Implémentation : `app/routes/races.py`, lecture des lignes `odds` de la course triées par
`computed_at`, regroupées par pilote.

---

## 6. Interface (page de pari)

Fichiers : `frontend/src/pages/PlaceBet.jsx`, `components/bets/ParticipantPicker.jsx`.

- **Liste des pilotes** : afficher la cote GridBook à côté de la cote mutuelle (la prop
  `oddsFor` existe déjà), avec un badge « Favori » / « Outsider ».
- **Tri** : un sélecteur « Favoris d'abord / Plus hautes cotes d'abord / Alphabétique ».
- **Bloc « Plus hautes cotes »** : les 3 meilleurs outsiders, avec leur gain potentiel et le
  bonus applicable (§ 8).
- **Évolution** : petite courbe des dernières cotes (`trend`) dans la ligne du pilote
  sélectionné, avec « cote en baisse / en hausse ».
- **Bulletin** : « Cote GridBook figée : 12,40 · Bonus outsider si victoire : × 1,5 ».
- **Explication** : si `explanation` est présente, un lien « Pourquoi cette cote ? » qui l'affiche.

---

## 7. Enregistrer la cote au moment du pari

Aujourd'hui `POST /bets/place` crée le pari avec `odds=0.0` : la cote n'existe qu'au règlement.

Changement dans `app/routes/bets.py` (`place_bet`) : lire la dernière cote GridBook du pilote et
la stocker dans `bets.model_odds`. C'est elle qui sert au calcul du bonus, même si la cote évolue
ensuite. Parier tôt sur un outsider est donc récompensé.

```python
latest = (
    db.query(Odds)
    .filter(Odds.race_id == race_id, Odds.driver_id == selection_id)
    .order_by(Odds.computed_at.desc())
    .first()
)
new_bet = Bet(..., odds=0.0, model_odds=latest.odds if latest else None)
```

La réponse de `POST /bets/place` renvoie `model_odds` pour l'afficher dans la notification de
confirmation.

---

## 8. Bonus au règlement (`settle_race`)

### 8.1 Règles

| Règle | Valeur de départ |
|---|---|
| Bonus outsider | si `model_odds ≥ 10` (moins de 10 % de chances) et pari gagnant : gains × 1,5 |
| Gros outsider | si `model_odds ≥ 25` : gains × 2 |
| Plafond par pari | bonus maximal de 20 000 APEX |
| Plafond par course | bonus total maximal de 100 000 APEX ; au-delà, réduction proportionnelle |

Les seuils et plafonds vont dans des variables d'environnement (`BONUS_OUTSIDER_MIN_ODDS`,
`BONUS_MAX_PER_BET`…) pour être réglés sans redéployer le code.

### 8.2 Code

Dans `app/services/settlement.py`, après le calcul du gain mutuel :

```python
def outsider_multiplier(model_odds) -> float:
    if model_odds is None:
        return 1.0
    if model_odds >= 25:
        return 2.0
    if model_odds >= 10:
        return 1.5
    return 1.0

# dans la boucle des paris gagnants
base_gain = float(bet.amount) * float(final_odds)
bonus = min(base_gain * (outsider_multiplier(bet.model_odds) - 1), BONUS_MAX_PER_BET)
bet.bonus = bonus
user.wallet = float(user.wallet) + base_gain + bonus
db.add(TokenTransaction(user_id=user.id, amount=int(bonus), type="credit",
                        reason=f"Bonus outsider : {race.name}"))
```

Le plafond par course s'applique en deux passes : calculer tous les bonus, puis les réduire
proportionnellement si leur somme dépasse la limite.

### 8.3 Pourquoi des plafonds

Contrairement au pari mutuel, le bonus crée des APEX. Sans limite, les soldes gonflent et le
classement perd son sens. À surveiller dans le panneau admin : APEX créés par les bonus et APEX
dépensés en boutique, par semaine.

---

## 9. Option : explication de la cote par Claude

Une phrase par pilote, générée **au moment du calcul des cotes** (jamais pendant l'affichage de
la page) et stockée dans `odds.explanation`. Claude reformule des faits que le modèle a déjà
calculés : il ne calcule pas la cote.

```python
# app/services/odds/explain.py
import anthropic

client = anthropic.Anthropic()  # clé lue dans ANTHROPIC_API_KEY (.env)

SYSTEM = (
    "Tu rédiges pour GridBook, un jeu de pronostics sur les sports mécaniques sans argent réel. "
    "Explique en une ou deux phrases, en français, pourquoi ce pilote a cette cote, "
    "uniquement à partir des faits fournis. N'invente aucun chiffre. Pas d'incitation à parier."
)

def explain(facts: dict) -> str | None:
    try:
        response = client.beta.messages.create(
            model="claude-opus-5-5",
            max_tokens=1024,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM,
            messages=[{"role": "user", "content": json.dumps(facts, ensure_ascii=False)}],
        )
    except anthropic.APIError:
        return None  # l'explication est facultative : la cote s'affiche sans
    if response.stop_reason == "refusal":
        return None
    return next((b.text for b in response.content if b.type == "text"), None)
```

`facts` contient les données déjà calculées : position sur la grille, résultats récents,
historique sur le circuit, probabilité, cote. Par exemple :
`{"pilote": "Lando Norris", "grille": 2, "5_derniers": [1, 3, 1, 2, 5], "victoires_circuit": 0, "cote": 4.10}`.

Points de mise en œuvre :

- **Quand** : seulement pour la série `post_qualif` et pour les 5 favoris + les 3 plus hautes
  cotes, ce qui limite les appels et le coût.
- **Coût** : de l'ordre de quelques dixièmes de centime par explication avec `claude-opus-5-5`
  en effort faible ; quelques dollars par saison pour les trois championnats. À mesurer sur un
  premier week-end avant de généraliser.
- **Sécurité** : la clé reste dans `.env` (déjà exclu de Git et de l'image Docker) et le
  backend est le seul à appeler l'API.
- **Sans clé** : si `ANTHROPIC_API_KEY` est absent, la fonction n'est pas appelée et la page
  s'affiche sans explication.
- **Dépendance** : ajouter `anthropic` à `requirements.txt`.

---

## 10. Validation

1. **Backtest** : rejouer les saisons passées course par course (notes Elo calculées uniquement
   avec les courses précédentes), puis mesurer :
   - le **score de Brier** et la **log-loss** des probabilités de victoire ;
   - la **calibration** : les pilotes annoncés à 20 % gagnent-ils environ 1 course sur 5 ?
2. **Réglage** de `K`, `GRID_WEIGHT` et de la marge en minimisant la log-loss, séparément par
   championnat.
3. **Simulation économique** : sur une saison rejouée avec des mises fictives, APEX créés par
   les bonus par rapport aux APEX en circulation.
4. **Tests E2E** (`e2e/run.mjs`) :
   - la page de pari affiche les cotes GridBook ;
   - un pari enregistre `model_odds` ;
   - un pari gagnant sur un outsider reçoit le bonus et une transaction « Bonus outsider » ;
   - les plafonds sont respectés.

---

## 11. Plan de livraison

| Étape | Contenu | Prérequis |
|---|---|---|
| 1 | Table `odds`, modèle Elo, recalcul dans la synchro, backtest | aucun |
| 2 | Route `GET /races/{id}/odds` et affichage sur la page de pari | étape 1 |
| 3 | `bets.model_odds` enregistrée au pari | étape 1 |
| 4 | Bonus outsider et plafonds dans `settle_race`, suivi dans l'admin | étape 3 |
| 5 | Prise en compte des qualifications (`post_qualif`) | étape 1 |
| 6 | Explications générées par Claude | étape 5, clé API |

Les étapes 1 à 3 n'ont aucun effet sur les soldes : elles peuvent être mises en ligne sans
risque. Le bonus (étape 4) se met en ligne une fois le backtest et la simulation économique
validés.
