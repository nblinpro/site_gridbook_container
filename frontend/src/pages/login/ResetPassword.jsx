import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { formatApiError } from "../../services/apiError";
import Icon from "../../components/ui/Icon";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";

const MIN_LENGTH = 8;
const BACK = <Link to="/login" className="btn-link"><Icon name="chevronRight" size={16} className="auth-back-icon" />Retour à la connexion</Link>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const errors = {};
    if (password.length < MIN_LENGTH) errors.password = `Au moins ${MIN_LENGTH} caractères.`;
    if (password !== confirm) errors.confirm = "Les deux mots de passe ne correspondent pas.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(formatApiError(err, "Ce lien est invalide ou a expiré. Demande un nouveau lien."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Lien invalide" footer={BACK}>
        <div className="alert alert-danger" role="alert">
          <Icon name="info" size={18} />
          <span>Ce lien ne contient pas de jeton de réinitialisation. Il est peut-être incomplet : demande un nouveau lien.</span>
        </div>
        <Link to="/forgot-password" className="btn btn-primary btn-lg btn-block">Demander un nouveau lien</Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Mot de passe mis à jour" footer={BACK}>
        <div className="auth-success" role="status">
          <span className="auth-success-icon"><Icon name="check" size={22} /></span>
          <p>Ton nouveau mot de passe est enregistré. Redirection vers la connexion…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisis un mot de passe que tu n'utilises pas ailleurs."
      footer={BACK}
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="info" size={18} />
          <span>
            {error} <Link to="/forgot-password" className="btn-link">Nouveau lien</Link>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <PasswordField
          label="Nouveau mot de passe"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`${MIN_LENGTH} caractères minimum.`}
          error={fieldErrors.password}
          required
          autoFocus
        />
        <PasswordField
          label="Confirmation"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
          required
        />

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting} aria-busy={submitting}>
          {submitting ? <><span className="auth-spinner" aria-hidden />Mise à jour…</> : "Enregistrer le mot de passe"}
        </button>
      </form>
    </AuthShell>
  );
}
