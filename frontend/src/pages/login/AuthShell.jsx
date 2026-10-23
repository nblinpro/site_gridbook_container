import { Link } from "react-router-dom";
import Icon from "../../components/ui/Icon";
import { DISCIPLINES } from "../../data/disciplines";
import "./login.css";

const VALUE_POINTS = [
  {
    icon: "chart",
    title: "Données officielles",
    text: "Calendriers, grilles et résultats réels de la F1, du MotoGP et de la NASCAR.",
  },
  {
    icon: "ticket",
    title: "Cotes en pari mutuel",
    text: "Les cotes évoluent avec les mises de tous les joueurs, jusqu'à la clôture.",
  },
  {
    icon: "bag",
    title: "Boutique cosmétique",
    text: "Dépense tes gains en APEX pour personnaliser ton profil.",
  },
];

/**
 * Écran des pages d'authentification (hors Layout) : panneau de marque à gauche,
 * formulaire à droite. Sur mobile, la marque se réduit à un bandeau au-dessus du formulaire.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-brand" aria-label="Présentation de GridBook">
        <Link to="/login" className="auth-logo" aria-label="GridBook, connexion">
          <img src="/logo_grid_book_2.png" alt="" width="44" height="44" />
          <span className="auth-logo-name">GridBook</span>
        </Link>

        <div className="auth-pitch">
          <span className="eyebrow">Saison 2026</span>
          <h1 className="auth-headline">Prends position avant le départ.</h1>
          <p className="auth-lead">
            Le jeu de pronostics sur les courses de Formule 1, de MotoGP et de NASCAR.
          </p>

          <ul className="auth-sports" aria-label="Championnats disponibles">
            {DISCIPLINES.map((d) => (
              <li key={d.slug} className="auth-sport" style={{ "--sport": d.accent }}>
                <span className="dot" aria-hidden />
                {d.name}
              </li>
            ))}
          </ul>

          <ul className="auth-values">
            {VALUE_POINTS.map((v) => (
              <li key={v.title} className="auth-value">
                <span className="auth-value-icon"><Icon name={v.icon} size={18} /></span>
                <span>
                  <strong>{v.title}</strong>
                  <span className="auth-value-text">{v.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-note">
          <Icon name="shield" size={16} />
          Jeu sans argent réel : on mise uniquement des APEX, une monnaie virtuelle.
        </p>

        <div className="auth-livery" aria-hidden>
          {DISCIPLINES.map((d) => <span key={d.slug} style={{ "--sport": d.accent }} />)}
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <header className="auth-card-head">
            <h2 className="auth-title">{title}</h2>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </header>
          {children}
          {footer && <div className="auth-card-foot">{footer}</div>}
        </div>
        <p className="auth-legal">Jeu sans argent réel · Monnaie virtuelle APEX</p>
      </main>
    </div>
  );
}
