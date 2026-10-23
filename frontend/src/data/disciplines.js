// Disciplines disponibles : uniquement celles dont les données viennent d'une API
// publique (calendrier, engagés, résultats, classements). Voir README.
// Les pages partagées (pari, comptes, admin) gardent le sport choisi en dernier.
export const DISCIPLINES = [
  {
    slug: "f1",
    name: "Formule 1",
    short: "F1",
    icon: "🏎️",
    tagline: "Grands Prix, pilotes & constructeurs",
    accent: "#e10600",
    contrast: "#ffffff", // texte posé sur la couleur du sport (contraste AA)
    source: "Jolpica (Ergast) · OpenF1",
    routes: {
      dashboard: "/dashboard",
      calendar: "/f1/calendar",
      standings: "/f1/standings",
      seasonBets: "/season-bets",
      history: "/f1/history",
    },
    matchPrefixes: ["/dashboard", "/f1", "/season-bets"],
    labels: {
      event: "Grand Prix", events: "Grands Prix",
      participant: "Pilote", participants: "Pilotes",
      team: "Écurie", teams: "Écuries",
      championDriver: "Champion pilotes", championTeam: "Champion constructeurs",
    },
  },
  {
    slug: "motogp",
    name: "MotoGP",
    short: "MotoGP",
    icon: "🏍️",
    tagline: "Grands Prix moto, pilotes & équipes",
    accent: "#ff6a13",
    contrast: "#1a0a00",
    source: "API résultats MotoGP (Dorna / Pulselive)",
    routes: {
      dashboard: "/motogp",
      calendar: "/motogp/calendar",
      standings: "/motogp/standings",
      seasonBets: "/motogp/season-bets",
      history: "/motogp/history",
    },
    matchPrefixes: ["/motogp"],
    labels: {
      event: "Grand Prix", events: "Grands Prix",
      participant: "Pilote", participants: "Pilotes",
      team: "Équipe", teams: "Équipes",
      championDriver: "Champion pilotes", championTeam: "Champion équipes",
    },
  },
  {
    slug: "nascar",
    name: "NASCAR Cup",
    short: "NASCAR",
    icon: "🏁",
    tagline: "Cup Series : ovales, road courses & playoffs",
    accent: "#ffd659",
    contrast: "#1a1400",
    source: "Flux de données NASCAR.com",
    routes: {
      dashboard: "/nascar",
      calendar: "/nascar/calendar",
      standings: "/nascar/standings",
      seasonBets: "/nascar/season-bets",
      history: "/nascar/history",
    },
    matchPrefixes: ["/nascar"],
    labels: {
      event: "Course", events: "Courses",
      participant: "Pilote", participants: "Pilotes",
      team: "Écurie", teams: "Écuries",
      championDriver: "Champion pilotes", championTeam: "Champion écuries",
    },
  },
];

export const getDiscipline = (slug) => DISCIPLINES.find((d) => d.slug === slug) || DISCIPLINES[0];
