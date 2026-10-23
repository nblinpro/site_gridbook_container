// Données officielles F1 (Jolpica, miroir de l'API Ergast) pour les pages Grand Prix.
const BASE_URL = "https://api.jolpi.ca/ergast/f1";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Données F1 indisponibles (${res.status})`);
  return res.json();
}

/** Grand Prix (circuit, date, programme du week-end) ; null s'il n'existe pas. */
export async function getRace(season, round) {
  const data = await fetchJson(`${BASE_URL}/${season}/${round}.json`);
  return data?.MRData?.RaceTable?.Races?.[0] || null;
}

/** Classement de la course ; [] tant que les résultats ne sont pas publiés. Lève une erreur si l'API ne répond pas. */
export async function getResults(season, round) {
  const data = await fetchJson(`${BASE_URL}/${season}/${round}/results.json`);
  return data?.MRData?.RaceTable?.Races?.[0]?.Results || [];
}
