/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { formatApiError } from "../../services/apiError";
import Icon from "../ui/Icon";
import "./toast.css";

const ToastContext = createContext(null);

let idCounter = 0;

const ICONS = { success: "check", error: "x", warning: "info", info: "info" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback((rawMessage, type = "info", duration = 4000) => {
    const message = typeof rawMessage === "string" ? rawMessage : formatApiError(rawMessage);
    const id = ++idCounter;
    setToasts((current) => [...current, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Objet stable : les pages peuvent le mettre en dépendance d'un effet sans le relancer à chaque toast
  const toast = useMemo(() => ({
    success: (message, duration) => showToast(message, "success", duration),
    error: (message, duration) => showToast(message, "error", duration),
    info: (message, duration) => showToast(message, "info", duration),
    warning: (message, duration) => showToast(message, "warning", duration),
  }), [showToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <span className="toast-icon" aria-hidden><Icon name={ICONS[t.type] || "info"} size={14} strokeWidth={3} /></span>
            <p className="toast-message">{t.message}</p>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Fermer la notification">
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
