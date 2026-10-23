// Petits blocs communs aux pages championnat et F1.
import Icon from "../../components/ui/Icon";
import { toDate } from "../../utils/format";

/** Pavé date « 25 / oct » façon grille télé. */
export function DateBlock({ iso }) {
  const d = toDate(iso);
  return (
    <span className="date-block" aria-hidden>
      <span className="date-block-day num">{d.getDate()}</span>
      <span className="date-block-month">{d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span>
    </span>
  );
}

export function SkeletonRows({ count = 3, height = 56 }) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: count }, (_, i) => <div key={i} className="skeleton" style={{ height }} />)}
    </div>
  );
}

export function ErrorAlert({ children }) {
  return <div className="alert alert-danger" role="alert"><Icon name="info" size={18} /><span>{children}</span></div>;
}
