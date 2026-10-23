// FastAPI renvoie `detail` soit en texte, soit (erreurs de validation 422) en
// liste d'objets { loc, msg, ... }. Afficher la liste telle quelle fait planter React.
const FIELD_LABELS = { password: "mot de passe", new_password: "mot de passe", email: "email", username: "nom d'utilisateur", amount: "montant", reason: "motif" };

export function formatApiError(err, fallback = "Une erreur est survenue.") {
  const detail = err?.response?.data?.detail ?? err;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
        const label = FIELD_LABELS[field] || field;
        return label ? `${label} : ${d?.msg ?? "invalide"}` : d?.msg;
      })
      .filter(Boolean)
      .join(" · ") || fallback;
  }
  return fallback;
}
