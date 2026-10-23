// Aides partagées par les pages championnat (accueil, calendrier, classements, F1).
import { useEffect, useState } from "react";
import { toDate } from "../../utils/format";

/** Courses triées par date, avec un numéro de manche (fourni par l'API en F1, déduit ailleurs). */
export function orderRaces(races = []) {
  return [...races]
    .sort((a, b) => toDate(a.start_datetime) - toDate(b.start_datetime))
    .map((r, i) => ({ ...r, round: r.round ?? i + 1 }));
}

/** Statut d'une course pour l'affichage : libellé + variante de badge. */
export function raceState(race) {
  if (race.status === "finished") return { key: "finished", label: "Terminé", badge: "" };
  if (race.is_open) return { key: "open", label: "Ouvert aux paris", badge: "badge-success" };
  return { key: "closed", label: "Marché fermé", badge: "badge-warning" };
}

/** « Melbourne, Australia » */
export const placeOf = (circuit) => [circuit?.city, circuit?.country].filter(Boolean).join(", ");

/** Page de résultats officiels (F1 uniquement : données Ergast). */
export const f1ResultsPath = (race) => `/f1/${race.year}/race/${race.round}/results`;
export const f1DetailsPath = (race) => `/f1/${race.year}/race/${race.round}`;

/** Points sans décimale inutile : 340, 12,5 */
export const formatPoints = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

// Couleurs officielles des écuries F1 (filet à gauche du nom dans les tableaux)
const F1_TEAM_COLORS = {
  mercedes: "#27f4d2",
  ferrari: "#e8002d",
  mclaren: "#ff8000",
  "red bull": "#3671c6",
  "aston martin": "#229971",
  alpine: "#ff87bc",
  williams: "#64c4ff",
  rb: "#6692ff",
  "racing bulls": "#6692ff",
  haas: "#b6babd",
  audi: "#f50537",
  sauber: "#52e252",
  cadillac: "#c9cdd2",
};

export function teamColor(team) {
  const name = String(team || "").toLowerCase();
  const key = Object.keys(F1_TEAM_COLORS).find((k) => name === k || name.startsWith(`${k} `));
  return key ? F1_TEAM_COLORS[key] : undefined;
}

/** Heure courante rafraîchie à intervalle régulier (comptes à rebours). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Temps restant découpé en jours / heures / minutes / secondes. */
export function splitCountdown(iso, now = Date.now()) {
  const diff = Math.max(0, toDate(iso).getTime() - now);
  return {
    done: diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

// --- Anciennes fonctions : encore utilisées par PlaceBet ---
export function formatEventDate(iso) {
  return toDate(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
export { countdown } from "../../utils/format";
