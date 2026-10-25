"""Catalogue de la boutique (inséré ou mis à jour au démarrage par app/seed.py).

Le prix, la mise en vente et la mise en avant d'un article existant ne sont jamais écrasés :
ils appartiennent à l'admin une fois l'article créé. Le reste (nom, description, rareté,
collection…) suit ce fichier.

Noms et couleurs inspirés des sports mécaniques, sans logo ni nom déposé (écuries, championnats).
"""
from datetime import datetime

COLLECTIONS = [
    # slug, nom, description, remise %, couleur d'ambiance, à la une, fin de vente
    ("las_vegas", "Nuit de Las Vegas", "Néons, jetons et ligne droite du Strip. Collection éphémère du Grand Prix de nuit.", 20, "#ff2bd6", True, datetime(2026, 11, 23, 8, 0)),
    ("champion_2026", "Édition Champion 2026", "Pièces numérotées et tirées à petit nombre. Une fois épuisées, elles ne reviendront pas.", 0, "#f5c542", True, None),
    ("pit_stop", "Arrêt aux stands", "Clés, pneus et chronos : l'équipe de l'ombre qui fait gagner les courses.", 15, "#ff8000", False, None),
    ("rosso", "Tifosi", "Le rouge des passionnés de Formule 1.", 10, "#e10600", False, None),
    ("genou_a_terre", "Genou à terre", "Pour les fous d'angle et de freinages tardifs en MotoGP.", 10, "#ff6a13", False, None),
    ("ovale", "Ovale américain", "Pare-chocs contre pare-chocs, toujours à gauche.", 10, "#ffd659", False, None),
    ("essentiels", "Essentiels du paddock", "Les classiques pour débuter ta collection.", 10, "#8a8a98", False, None),
]

# slug, catégorie, nom, valeur, prix, rareté, sport, collection, description, options
# options : stock (édition numérotée), until (fin de vente), rule (récompense à gagner)
PRODUCTS = [
    # --- Essentiels ---
    ("av_flag", "avatar", "Drapeau à damier", "🏁", 500, "common", None, "essentiels", "L'avatar de ceux qui voient l'arrivée.", {}),
    ("fr_orange", "frame", "Cadre Papaya", "#ff8000", 800, "common", None, "essentiels", "Orange vif, impossible à rater.", {}),
    ("bd_target", "badge", "Sniper", "🎯", 600, "common", None, "essentiels", "Pour ceux qui visent juste.", {}),
    ("ti_rookie", "title", "Titre « Rookie de l'année »", "Rookie de l'année", 400, "common", None, "essentiels", "Le titre des débuts prometteurs.", {}),
    ("fr_cyan", "frame", "Cadre Télémétrie", "#00e5ff", 2000, "rare", None, "essentiels", "Les données ne mentent pas.", {}),
    ("fr_purple", "frame", "Cadre Secteur violet", "#b14cff", 2500, "rare", None, "essentiels", "La couleur du meilleur temps absolu.", {}),
    ("av_fire", "avatar", "Moteur en feu", "🔥", 1500, "rare", None, "essentiels", "Ça chauffe sous le capot.", {}),
    ("bd_bolt", "badge", "Pole position", "⚡", 1500, "rare", None, "essentiels", "Toujours devant au départ.", {}),
    ("bd_brain", "badge", "Stratège", "🧠", 1500, "rare", None, "essentiels", "Le bon pneu au bon moment.", {}),
    ("av_trophy", "avatar", "Trophée", "🏆", 4000, "epic", None, "essentiels", "Réservé à ceux qui gagnent souvent.", {}),
    ("bd_diamond", "badge", "High roller", "💎", 5000, "epic", None, "essentiels", "Les grosses mises ne te font pas peur.", {}),
    ("bd_goat", "badge", "GOAT", "🐐", 12000, "legendary", None, "essentiels", "Le plus grand de tous les temps.", {}),
    ("nc_white", "name_color", "Pseudo Blanc carbone", "#f4f4f6", 300, "common", None, "essentiels", "Ton pseudo en blanc éclatant, net et lisible.", {}),
    ("nc_cyan", "name_color", "Pseudo Télémétrie", "#00e5ff", 1200, "rare", None, "essentiels", "Ton pseudo aux couleurs des écrans du muret.", {}),
    # --- Tifosi (F1) ---
    ("av_f1", "avatar", "Monoplace", "🏎️", 500, "common", "f1", "rosso", "Pour les fidèles de la Formule 1.", {}),
    ("fr_red", "frame", "Cadre Rosso Corsa", "#e10600", 800, "common", "f1", "rosso", "Le rouge des tifosi.", {}),
    ("ti_paddock", "title", "Titre « Roi du paddock »", "Roi du paddock", 2000, "rare", "f1", "rosso", "Tout le monde connaît ton nom.", {}),
    ("nc_rosso", "name_color", "Pseudo Rosso", "#ff2a1f", 1500, "rare", "f1", "rosso", "Ton pseudo en rouge course.", {}),
    # --- Genou à terre (MotoGP) ---
    ("av_moto", "avatar", "Prototype MotoGP", "🏍️", 500, "common", "motogp", "genou_a_terre", "Genou au sol, coude au sol.", {}),
    ("ti_knee", "title", "Titre « Genou à terre »", "Genou à terre", 2000, "rare", "motogp", "genou_a_terre", "Angle maximal dans chaque virage.", {}),
    ("bd_helmet", "badge", "Casque intégral", "🪖", 1200, "rare", "motogp", "genou_a_terre", "Visière baissée, regard au point de corde.", {}),
    # --- Ovale américain (NASCAR) ---
    ("av_stock", "avatar", "Stock car", "🚘", 500, "common", "nascar", "ovale", "Pare-chocs contre pare-chocs.", {}),
    ("fr_yellow", "frame", "Cadre Daytona", "#ffd659", 800, "common", "nascar", "ovale", "Le jaune des ovales américains.", {}),
    ("ti_oval", "title", "Titre « Maître des ovales »", "Maître des ovales", 2000, "rare", "nascar", "ovale", "Toujours à gauche, toujours plus vite.", {}),
    ("bd_eagle", "badge", "Aigle de l'Indiana", "🦅", 1500, "rare", "nascar", "ovale", "Plane au-dessus du peloton.", {}),
    # --- Arrêt aux stands ---
    ("bd_wrench", "badge", "Clé à choc", "🔧", 600, "common", None, "pit_stop", "Quatre roues changées, zéro seconde perdue.", {}),
    ("av_wheel", "avatar", "Pneu tendre", "🛞", 1200, "rare", None, "pit_stop", "Le pneu des qualifications.", {}),
    ("ti_pit", "title", "Titre « Chef de stand »", "Chef de stand", 700, "common", None, "pit_stop", "Arrêt aux stands en 2 secondes.", {}),
    ("ti_two", "title", "Titre « Deux secondes chrono »", "Deux secondes chrono", 1500, "rare", None, "pit_stop", "Le temps d'un arrêt parfait.", {}),
    ("nc_papaya", "name_color", "Pseudo Papaya", "#ff8000", 1500, "rare", None, "pit_stop", "Ton pseudo en orange vif.", {}),
    # --- Nuit de Las Vegas (éphémère) ---
    ("av_vegas", "avatar", "Jackpot", "🎰", 3500, "epic", None, "las_vegas", "Le Strip s'illumine pour toi.", {"until": datetime(2026, 11, 23, 8, 0)}),
    ("fr_neon", "frame", "Cadre Néon", "#ff2bd6", 3000, "epic", None, "las_vegas", "Un contour rose néon, visible de loin.", {"until": datetime(2026, 11, 23, 8, 0)}),
    ("nc_neon", "name_color", "Pseudo Néon", "linear-gradient(90deg, #ff2bd6, #7c4dff)", 2500, "epic", None, "las_vegas", "Dégradé rose-violet des enseignes du Strip.", {"until": datetime(2026, 11, 23, 8, 0)}),
    ("ti_strip", "title", "Titre « Roi du Strip »", "Roi du Strip", 1800, "rare", None, "las_vegas", "La ligne droite la plus brillante du calendrier.", {"until": datetime(2026, 11, 23, 8, 0)}),
    ("bd_dice", "badge", "Coup de dés", "🎲", 1200, "rare", None, "las_vegas", "Pour les paris les plus audacieux.", {"until": datetime(2026, 11, 23, 8, 0)}),
    # --- Édition Champion 2026 (numérotée) ---
    ("fr_gold", "frame", "Cadre Champion", "#ffd700", 8000, "legendary", None, "champion_2026", "Or massif, animé.", {}),
    ("av_crown", "avatar", "Couronne", "👑", 10000, "legendary", None, "champion_2026", "Le roi de la grille.", {"stock": 100}),
    ("nc_gold", "name_color", "Pseudo Or 2026", "linear-gradient(90deg, #f5c542, #fff1b8, #c9971c)", 9000, "legendary", None, "champion_2026", "Ton pseudo en or, édition numérotée.", {"stock": 50}),
    ("ti_legend", "title", "Titre « Légende de la grille »", "Légende de la grille", 10000, "legendary", None, "champion_2026", "Ton nom est gravé dans l'histoire.", {"stock": 50}),
    # --- Récompenses à gagner (non achetables) ---
    ("rw_first", "badge", "Premier départ", "🚦", 0, "common", None, None, "Ton tout premier pronostic.", {"rule": {"type": "bets", "count": 1}}),
    ("rw_loyal", "badge", "Fidèle au paddock", "📅", 0, "rare", None, None, "Dix pronostics placés.", {"rule": {"type": "bets", "count": 10}}),
    ("rw_winner", "title", "Titre « Pronostiqueur »", "Pronostiqueur", 0, "rare", None, None, "Trois pronostics gagnants.", {"rule": {"type": "wins", "count": 3}}),
    ("rw_visionary", "title", "Titre « Visionnaire »", "Visionnaire", 0, "epic", None, None, "Gagner un pari à une cote de 10 ou plus.", {"rule": {"type": "win_odds", "min": 10}}),
    ("rw_slam", "frame", "Cadre Grand Chelem", "#22c55e", 0, "epic", None, None, "Gagner au moins un pari en F1, en MotoGP et en NASCAR.", {"rule": {"type": "sports_won"}}),
    ("rw_nostradamus", "title", "Titre « Nostradamus »", "Nostradamus", 0, "legendary", None, None, "Trouver un champion de fin de saison.", {"rule": {"type": "season_win"}}),
]
