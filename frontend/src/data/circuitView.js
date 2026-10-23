// Met au même format la fiche circuit F1 (écrite à la main, circuitData.js) et les
// fiches importées depuis les API MotoGP / NASCAR, pour un rendu unique dans PlaceBet.
// Libellés en casse normale : les majuscules éventuelles viennent du CSS.

const NASCAR_TYPES = {
  superspeedway: "Superspeedway",
  intermediate: "Ovale intermédiaire",
  "short track": "Ovale court",
  "road course": "Road course",
  "street course": "Circuit urbain",
};

const fmt = (n, digits = 2) => (n == null ? null : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: digits }));
const join = (...parts) => parts.filter(Boolean).join(", ");
// « 5.278 KM » (saisie manuelle) → « 5,278 km »
const unit = (s) => (s ? String(s).replace(/(\d)\.(\d)/g, "$1,$2").replace(/\bKM\b/g, "km").replace(/\bKM\/H\b/g, "km/h") : null);

function fromF1(info) {
  return {
    image: info.image,
    schematic: { type: "road course" },
    stats: [
      { label: "Longueur", value: unit(info.length) || "—" },
      { label: "Virages", value: info.turns || "—" },
      info.topSpeed ? { label: "Vitesse de pointe", value: unit(info.topSpeed) } : null,
      { label: "Record du tour", value: info.record || "—", wide: true },
    ].filter(Boolean),
    sections: [
      { title: "Ce qui fait la différence", text: info.difficulty },
      { title: "Le circuit", text: info.description },
      { title: "Histoire", text: info.history },
    ].filter((s) => s.text),
    highlight: info.lastWinner ? { label: "Dernier vainqueur", value: info.lastWinner, sub: "Édition précédente" } : null,
  };
}

// F1 sans fiche rédigée : seulement ce que l'API fournit (nom, ville) et l'image du tracé si elle existe
function fromF1Fallback(circuit, image) {
  return {
    image,
    schematic: { type: "road course" },
    stats: [
      { label: "Longueur", value: circuit?.length_km ? `${fmt(circuit.length_km)} km` : "—" },
      { label: "Virages", value: circuit?.turns ?? "—" },
    ],
    sections: [],
    highlight: null,
    partial: true,
  };
}

function fromMotoGP(c) {
  const d = c.details || {};
  const corners = d.left_corners && d.right_corners ? `${d.left_corners} à gauche, ${d.right_corners} à droite` : null;
  return {
    image: c.image_url,
    schematic: { type: "road course" },
    stats: [
      { label: "Longueur", value: c.length_km ? `${fmt(c.length_km)} km` : "—" },
      { label: "Virages", value: c.turns ?? "—", sub: d.left_corners ? `${d.left_corners} à gauche · ${d.right_corners} à droite` : null },
      { label: "Plus longue ligne droite", value: d.longest_straight_m ? `${fmt(d.longest_straight_m, 0)} m` : "—" },
      d.width_m ? { label: "Largeur de piste", value: `${fmt(d.width_m, 0)} m` } : null,
    ].filter(Boolean),
    sections: [
      {
        title: "Le tracé",
        text: [
          `${c.name} compte ${c.turns ?? "?"} virages${corners ? ` (${corners})` : ""}.`,
          d.longest_straight_m ? `Sa plus longue ligne droite mesure ${fmt(d.longest_straight_m, 0)} m` : null,
          d.width_m ? `pour une piste large de ${d.width_m} m.` : null,
        ].filter(Boolean).join(" ").replace(/ m$/, " m."),
      },
      {
        title: "Histoire",
        text: [d.constructed ? `Inauguré en ${d.constructed}.` : null, d.designer ? `Tracé dessiné par ${d.designer}.` : null].filter(Boolean).join(" "),
      },
    ].filter((s) => s.text),
    highlight: d.constructed ? { label: "Inauguration", value: d.constructed, sub: d.designer ? `Architecte : ${d.designer}` : null } : null,
  };
}

function fromNascar(c) {
  const d = c.details || {};
  const type = NASCAR_TYPES[(d.type || "").toLowerCase()] || d.type || "Ovale";
  return {
    image: c.image_url,
    schematic: { type: d.type, description: c.description },
    stats: [
      { label: "Longueur", value: d.length_miles ? `${fmt(d.length_miles)} mi` : "—", sub: c.length_km ? `${fmt(c.length_km)} km` : null },
      { label: "Virages", value: c.turns ?? "—" },
      { label: "Type de piste", value: type },
      d.capacity && d.capacity !== "0" ? { label: "Capacité", value: `${d.capacity.replace(/,/g, " ")} places` } : null,
    ].filter(Boolean),
    sections: [
      { title: "Le tracé", text: [c.description, d.banking ? `Inclinaison (degrés) : ${d.banking}.` : null].filter(Boolean).join(" ") },
      { title: "Le circuit", text: [`${c.name}, ${join(c.city, c.country)}.`, d.surface ? `Revêtement : ${d.surface}.` : null].filter(Boolean).join(" ") },
      { title: "Histoire", text: [d.year_built ? `Construit en ${d.year_built}.` : null, d.major_events ? `Épreuves majeures : ${d.major_events}.` : null].filter(Boolean).join(" ") },
    ].filter((s) => s.text),
    highlight: d.year_built ? { label: "Construit en", value: d.year_built, sub: type } : null,
  };
}

/**
 * Fiche circuit normalisée : { image, schematic, stats[], sections[], highlight, partial? }
 * ou null si rien n'est connu. `f1Fallback` : image du tracé à tenter pour une F1 sans fiche.
 */
export function buildCircuitView(discipline, f1Info, circuit, f1Fallback) {
  if (discipline === "f1") {
    if (f1Info) return fromF1(f1Info);
    return circuit || f1Fallback ? fromF1Fallback(circuit, f1Fallback) : null;
  }
  if (!circuit) return null;
  return discipline === "motogp" ? fromMotoGP(circuit) : fromNascar(circuit);
}
