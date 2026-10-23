import "./trackSchematic.css";

// Schéma du tracé, utilisé quand l'image officielle est indisponible (les images
// NASCAR sont derrière une protection Cloudflare). Forme choisie d'après le type
// de piste fourni par l'API : ce n'est pas le tracé exact, et la légende le dit.
const SHAPES = {
  oval: "M60 20 H140 A40 40 0 0 1 140 100 H60 A40 40 0 0 1 60 20 Z",
  trioval: "M60 22 H140 A38 38 0 0 1 150 96 L100 108 L50 96 A38 38 0 0 1 60 22 Z",
  short: "M40 35 H160 A25 25 0 0 1 160 85 H40 A25 25 0 0 1 40 35 Z",
  road: "M30 90 L30 50 Q30 25 55 25 L95 25 Q110 25 115 40 L125 60 Q130 70 145 65 L165 55 Q180 50 180 70 L180 90 Q180 102 165 102 L120 102 Q105 102 100 92 L95 82 Q90 75 80 80 L60 95 Q50 102 40 100 Q30 98 30 90 Z",
};

function shapeFor({ type = "", description = "" } = {}) {
  const text = `${type} ${description}`.toLowerCase();
  if (text.includes("road") || text.includes("street")) return "road";
  if (text.includes("tri-oval") || text.includes("superspeedway")) return "trioval";
  if (text.includes("short")) return "short";
  return "oval";
}

// `accent` facultatif : par défaut la couleur du championnat courant (var(--sport))
export default function TrackSchematic({ schematic, accent }) {
  const shape = shapeFor(schematic || {});
  return (
    <figure className="track-schematic" style={accent ? { "--track": accent } : undefined}>
      <svg viewBox="0 0 210 130" role="img" aria-label="Schéma indicatif du tracé">
        <path d={SHAPES[shape]} className="track-schematic-bed" />
        <path d={SHAPES[shape]} className="track-schematic-line" />
        <line x1="100" y1={shape === "short" ? 80 : 95} x2="100" y2={shape === "short" ? 90 : 112} className="track-schematic-start" />
      </svg>
      <figcaption>Schéma indicatif · tracé officiel indisponible</figcaption>
    </figure>
  );
}
