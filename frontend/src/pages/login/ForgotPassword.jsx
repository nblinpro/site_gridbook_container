import { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import Icon from "../../components/ui/Icon";
import AuthShell from "./AuthShell";

const BACK = <Link to="/login" className="btn-link"><Icon name="chevronRight" size={16} className="auth-back-icon" />Retour à la connexion</Link>;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Une erreur est survenue. Réessaie dans quelques instants.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Vérifie ta boîte mail" footer={BACK}>
        <div className="auth-success">
          <span className="auth-success-icon"><Icon name="check" size={22} /></span>
          <p>
            Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient d'être envoyé.
            Pense à regarder dans les courriers indésirables.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setSent(false)}>
          Utiliser une autre adresse
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Indique l'adresse email de ton compte : nous t'enverrons un lien pour choisir un nouveau mot de passe."
      footer={BACK}
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="info" size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label className="field-label" htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className="input"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder="prenom@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting} aria-busy={submitting}>
          {submitting ? <><span className="auth-spinner" aria-hidden />Envoi…</> : "Envoyer le lien"}
        </button>
      </form>
    </AuthShell>
  );
}
