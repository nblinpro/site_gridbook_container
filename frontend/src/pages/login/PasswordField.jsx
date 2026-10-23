import { useId, useState } from "react";

// Icônes œil / œil barré : absentes du jeu commun (components/ui/Icon), dessinées ici.
const EYE = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";
const EYE_OFF = "M10.7 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20";

/** Champ mot de passe avec bouton Afficher / Masquer. */
export default function PasswordField({ label, labelAction, value, onChange, autoComplete = "current-password", hint, error, ...rest }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="field">
      <div className="auth-label-row">
        <label className="field-label" htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="auth-password">
        <input
          id={id}
          className="input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          aria-controls={id}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={visible ? EYE_OFF : EYE} />
          </svg>
        </button>
      </div>
      {hint && !error && <span id={hintId} className="field-hint">{hint}</span>}
      {error && <span id={errorId} className="field-error">{error}</span>}
    </div>
  );
}
