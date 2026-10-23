import { useEffect, useId, useRef } from "react";
import Icon from "../ui/Icon";
import "./confirmDialog.css";

/**
 * Boîte de confirmation modale. Échap ou clic hors de la boîte = annuler.
 * Le bouton de confirmation reçoit le focus à l'ouverture ; le focus revient
 * ensuite à l'élément qui l'avait.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false, onConfirm, onCancel }) {
  const boxRef = useRef(null);
  const confirmRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    confirmRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancelRef.current?.();
        return;
      }
      // Garde le focus dans la boîte
      if (e.key === "Tab" && boxRef.current) {
        const items = boxRef.current.querySelectorAll("button:not(:disabled)");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="confirm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div
        ref={boxRef}
        className={`confirm-box ${danger ? "confirm-danger" : ""}`}
        role={danger ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={message ? messageId : undefined}
      >
        <div className="confirm-body">
          {danger && <span className="confirm-icon" aria-hidden><Icon name="info" size={20} /></span>}
          <div className="confirm-text">
            {title && <h2 id={titleId} className="confirm-title">{title}</h2>}
            {message && <p id={messageId} className="confirm-message">{message}</p>}
          </div>
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button ref={confirmRef} type="button" className={`btn ${danger ? "confirm-btn-danger" : "btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
