import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import Icon from "../components/ui/Icon";
import "./patchnotes.css";

// Catégorie d'une modification → libellé + variante de badge
const KINDS = {
  new: { label: "Nouveau", badge: "badge-success" },
  improved: { label: "Amélioré", badge: "badge-info" },
  fixed: { label: "Corrigé", badge: "badge-warning" },
  security: { label: "Sécurité", badge: "badge-danger" },
};

const RELEASES = [
  {
    version: "2.1.0",
    date: "2026-10-25",
    dateLabel: "25 oct. 2026",
    title: "Nouvelle boutique et sécurité renforcée",
    summary: "Une vraie boutique avec collections, éditions limitées et récompenses à gagner, et un site plus sûr.",
    changes: [
      ["new", "Boutique repensée : vitrine « À la une », catalogue avec recherche, filtres et tri, fiche détaillée avec essayage sur ton profil."],
      ["new", "Collections achetables en lot avec remise, dont la collection éphémère « Nuit de Las Vegas » et l'« Édition Champion 2026 » numérotée."],
      ["new", "Récompenses à gagner en jouant (premier pronostic, série de victoires, Grand Chelem…), à récupérer dans la boutique."],
      ["new", "Couleur du pseudo, visible dans les classements et le menu du compte. Liste de souhaits et historique des achats."],
      ["improved", "Sécurité : contrôles renforcés sur les montants et les saisies, protection contre les tentatives de connexion répétées, base de données mise à jour."],
      ["fixed", "Une erreur réseau passagère ne déconnecte plus le joueur."],
    ],
  },
  {
    version: "2.0.0",
    date: "2026-10-23",
    dateLabel: "23 oct. 2026",
    title: "Nouvelle interface et trois championnats",
    summary: "La plus grosse mise à jour de GridBook : une interface entièrement repensée et l'arrivée du MotoGP et de la NASCAR.",
    changes: [
      ["new", "Refonte complète de l'interface dans un style broadcast : typographie plus lisible, une couleur par championnat et des composants identiques sur toutes les pages."],
      ["new", "Nouvelle navigation : barre supérieure avec le choix du championnat, sous-navigation propre à chaque championnat et panneau « Mes paris en cours » toujours à portée de main."],
      ["new", "MotoGP et NASCAR rejoignent la Formule 1, avec calendriers, engagés, résultats et classements issus des données officielles."],
      ["new", "Fiches circuits pour les épreuves MotoGP et NASCAR."],
      ["new", "Boutique cosmétique : dépense tes APEX pour personnaliser ton profil."],
      ["improved", "Pages de connexion et d'inscription repensées, avec affichage du mot de passe et messages d'erreur plus clairs."],
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-16",
    dateLabel: "16 mars 2026",
    title: "Suite aux retours des joueurs",
    changes: [
      ["improved", "Nouveau design de la page Calendrier, plus lisible et plus simple à parcourir."],
      ["fixed", "Correction de l'affichage du logo."],
      ["improved", "Nouveau design du bouton Déconnexion."],
      ["improved", "Le solde se met à jour juste après un pari, sans recharger la page."],
      ["improved", "Refonte visuelle du solde APEX."],
      ["new", "Clôture automatique des paris 10 minutes avant le départ de la course."],
    ],
  },
  {
    version: "1.1.0",
    date: "2026-02-25",
    dateLabel: "25 févr. 2026",
    title: "Ouverture du site au public",
    changes: [
      ["security", "Les pages du jeu sont désormais réservées aux joueurs connectés."],
      ["new", "Page de résultats de course avec les données réelles."],
      ["new", "En-tête dynamique avec indicateur de course en direct."],
      ["new", "Sélecteur pour passer d'une course simulée aux données réelles."],
      ["new", "Secteurs colorés (violet, vert, jaune) selon les performances des pilotes."],
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-21",
    dateLabel: "21 févr. 2026",
    title: "Première version : interface et performances",
    changes: [
      ["new", "Identité visuelle propre à GridBook : typographie, palette de couleurs et éléments graphiques."],
      ["improved", "Refonte complète de la mise en page pour une expérience plus cohérente."],
      ["new", "Page d'accueil inspirée des écrans de bord de Formule 1."],
    ],
  },
];

const ROADMAP = [
  { icon: "flag", title: "Fiches pilotes", text: "Une page par pilote avec son historique, ses victoires et ses résultats récents." },
  { icon: "info", title: "Météo de course", text: "Les conditions météo réelles affichées sur les pages de course." },
  { icon: "users", title: "Communauté", text: "Créer une équipe, suivre d'autres joueurs et comparer vos performances." },
];

export default function PatchNotes() {
  const [latest] = RELEASES;

  return (
    <Layout>
      <div className="page patchnotes">
        <PageHeader
          eyebrow="GridBook"
          title="Notes de version"
          subtitle="Toutes les nouveautés, améliorations et corrections apportées au jeu, de la plus récente à la plus ancienne."
          actions={<span className="badge badge-sport">Version actuelle : {latest.version}</span>}
        />

        <ol className="releases" aria-label="Historique des versions">
          {RELEASES.map((r, index) => (
            <li key={r.version} className="release">
              <div className="release-meta">
                <span className="release-version">v{r.version}</span>
                <time className="release-date" dateTime={r.date}>{r.dateLabel}</time>
                {index === 0 && <span className="badge badge-sport">Dernière version</span>}
              </div>

              <article className={`card release-card ${index === 0 ? "card-accent" : ""}`} aria-labelledby={`release-${r.version}`}>
                <header className="release-head">
                  <h2 id={`release-${r.version}`} className="release-title">{r.title}</h2>
                  {r.summary && <p className="release-summary">{r.summary}</p>}
                </header>
                <ul className="changes">
                  {r.changes.map(([kind, text]) => (
                    <li key={text} className="change">
                      <span className={`badge ${KINDS[kind].badge} change-kind`}>{KINDS[kind].label}</span>
                      <span className="change-text">{text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>

        <section className="section" aria-labelledby="roadmap-title">
          <div className="section-head">
            <h2 id="roadmap-title" className="section-title">Prochainement</h2>
            <span className="muted roadmap-note">Fonctionnalités en préparation, sans date de sortie.</span>
          </div>
          <div className="grid grid-3">
            {ROADMAP.map((f) => (
              <div key={f.title} className="card roadmap-card">
                <div className="roadmap-top">
                  <span className="roadmap-icon"><Icon name={f.icon} size={18} /></span>
                  <span className="badge">En préparation</span>
                </div>
                <h3 className="roadmap-title">{f.title}</h3>
                <p className="roadmap-text">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
