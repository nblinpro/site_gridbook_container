// Formats d'affichage communs à toutes les pages (dates, comptes à rebours, montants).

// Les dates de course arrivent sans fuseau depuis l'API : elles sont stockées en UTC.
export const toDate = (iso) => (iso instanceof Date ? iso : new Date(String(iso).endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`));

/** 25 oct. 2026 */
export const formatDate = (iso) => toDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** dim. 25 oct. */
export const formatDay = (iso) => toDate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

/** 06:00 (heure locale du visiteur) */
export const formatTime = (iso) => toDate(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** dim. 25 oct. · 06:00 */
export const formatDateTime = (iso) => `${formatDay(iso)} · ${formatTime(iso)}`;

/** « dans 3 j 4 h », « dans 5 h 12 min », « en cours » */
export function countdown(iso) {
  const diff = toDate(iso).getTime() - Date.now();
  if (diff <= 0) return "En cours";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `dans ${days} j ${hours} h`;
  if (hours > 0) return `dans ${hours} h ${minutes} min`;
  return `dans ${minutes} min`;
}

/** 10 000 (entier, espaces insécables fr-FR) */
export const formatApex = (n) => Math.round(Number(n) || 0).toLocaleString("fr-FR");

/** 3,40 */
export const formatOdds = (n) => (Number(n) > 0 ? Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

/** Statut d'un pari → libellé + variante de badge */
export const BET_STATUS = {
  pending: { label: "En cours", badge: "badge-info" },
  won: { label: "Gagné", badge: "badge-success" },
  lost: { label: "Perdu", badge: "badge-danger" },
  cancelled: { label: "Annulé", badge: "" },
  refunded: { label: "Remboursé", badge: "badge-warning" },
};
