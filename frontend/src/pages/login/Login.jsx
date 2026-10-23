import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Icon from "../../components/ui/Icon";
import { formatApiError } from "../../services/apiError";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";

function loginErrorMessage(err) {
  if (!err.response) return "Impossible de joindre le serveur. Vérifie ta connexion et réessaie dans un instant.";
  const status = err.response.status;
  // 403 : compte désactivé · 429 : trop de tentatives. Le serveur explique la raison.
  if (status === 403 || status === 429) return formatApiError(err);
  return "Email ou mot de passe incorrect.";
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/sports");
    } catch (err) {
      setError(loginErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Content de te revoir. Connecte-toi pour retrouver tes paris et ton solde."
      footer={<p>Pas encore de compte ? <Link to="/register" className="btn-link">Créer un compte</Link></p>}
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="info" size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
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

        <PasswordField
          label="Mot de passe"
          labelAction={<Link to="/forgot-password" className="btn-link">Mot de passe oublié ?</Link>}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting} aria-busy={submitting}>
          {submitting ? <><span className="auth-spinner" aria-hidden />Connexion…</> : <>Se connecter<Icon name="arrowRight" size={18} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
