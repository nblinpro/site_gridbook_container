import "./f1LightsLoader.css";

const ACRONYMS = { F1: "F1", MOTOGP: "MotoGP", NASCAR: "NASCAR", APEX: "APEX", GRIDBOOK: "GridBook" };

// Certains appels passent encore un libellé façon code (« CHARGEMENT_COMPTES... ») :
// on le ramène à une phrase normale (« Chargement comptes… »).
function toSentence(label) {
  let text = String(label).replace(/_+/g, " ").replace(/\.{3}$/, "…").trim();
  if (/[a-zà-ÿ]/.test(text)) return text;
  text = text.toLowerCase().replace(/[^\s…]+/g, (w) => ACRONYMS[w.toUpperCase()] || w);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Écran de chargement pleine page : les cinq feux de départ s'allument puis s'éteignent. */
export default function F1LightsLoader({ label = "Chargement…" }) {
  return (
    <div className="lights-loader" role="status" aria-live="polite">
      <div className="lights-gantry" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="lights-pod">
            <span className="lights-lamp" />
            <span className={`lights-lamp lights-lamp-on lights-lamp-${i}`} />
          </span>
        ))}
      </div>
      <p className="lights-label">{toSentence(label)}</p>
    </div>
  );
}
