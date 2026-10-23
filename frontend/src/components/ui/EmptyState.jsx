import Icon from "./Icon";

// Bloc affiché quand une liste est vide : dit pourquoi et propose l'action suivante.
export default function EmptyState({ icon = "info", title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={28} /></span>
      {title && <span className="empty-state-title">{title}</span>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
