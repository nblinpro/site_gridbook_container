// En-tête standard d'une page : surtitre (contexte), titre, sous-titre, actions à droite.
export default function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
