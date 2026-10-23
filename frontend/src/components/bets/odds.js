// Pari mutuel : toutes les mises d'un marché forment la cagnotte, partagée entre ceux
// qui ont trouvé le bon résultat. Cote = cagnotte totale / mises sur la sélection.

/** Cote estimée si l'on ajoute `stake` sur une sélection qui a déjà `selectionPool` APEX. */
export function estimateOdds(totalPool, selectionPool, stake) {
  const s = Number(stake) || 0;
  const total = (Number(totalPool) || 0) + s;
  const mine = (Number(selectionPool) || 0) + s;
  return mine > 0 ? total / mine : 0;
}

/** Message d'erreur de la mise, ou null si elle est valide. */
export function stakeError(amount, wallet) {
  if (amount === "" || amount == null) return "Indique une mise.";
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "La mise doit être supérieure à 0.";
  if (n > Number(wallet || 0)) return "Solde insuffisant pour cette mise.";
  return null;
}
