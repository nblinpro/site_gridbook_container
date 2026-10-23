import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Icon from "../../components/ui/Icon";
import { formatApiError } from "../../services/apiError";
import AuthShell from "../login/AuthShell";
import PasswordField from "../login/PasswordField";

// Mêmes règles que le serveur (app/schemas/auth_schemas.py)
const NAME_MIN = 3;
const NAME_MAX = 50;
const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, password }) {
  const errors = {};
  const n = name.trim();
  if (n.length < NAME_MIN) errors.name = `Au moins ${NAME_MIN} caractères.`;
  else if (n.length > NAME_MAX) errors.name = `${NAME_MAX} caractères maximum.`;
  if (!EMAIL_RE.test(email.trim())) errors.email = "Saisis une adresse email valide.";
  if (password.length < PASSWORD_MIN) errors.password = `Au moins ${PASSWORD_MIN} caractères.`;
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Après une première tentative, les erreurs se mettent à jour pendant la saisie
  const update = (key) => (e) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    if (submitted) setErrors(validate(next));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate("/sports");
    } catch (err) {
      setError(err.response
        ? formatApiError(err, "Impossible de créer le compte.")
        : "Impossible de joindre le serveur. Vérifie ta connexion et réessaie dans un instant.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Inscription gratuite : 10 000 APEX te sont offerts pour tes premiers paris."
      footer={<p>Déjà inscrit ? <Link to="/login" className="btn-link">Se connecter</Link></p>}
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          <Icon name="info" size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="field">
          <label className="field-label" htmlFor="register-name">Pseudo</label>
          <input
            id="register-name"
            className="input"
            type="text"
            name="username"
            autoComplete="username"
            placeholder="Ton nom au classement"
            maxLength={NAME_MAX}
            value={form.name}
            onChange={update("name")}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby="register-name-msg"
            required
            autoFocus
          />
          {errors.name
            ? <span id="register-name-msg" className="field-error">{errors.name}</span>
            : <span id="register-name-msg" className="field-hint">Visible par les autres joueurs dans le classement.</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-email">Email</label>
          <input
            id="register-email"
            className="input"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder="prenom@exemple.fr"
            value={form.email}
            onChange={update("email")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "register-email-msg" : undefined}
            required
          />
          {errors.email && <span id="register-email-msg" className="field-error">{errors.email}</span>}
        </div>

        <PasswordField
          label="Mot de passe"
          name="new-password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          hint={`${PASSWORD_MIN} caractères minimum.`}
          error={errors.password}
          required
        />

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting} aria-busy={submitting}>
          {submitting ? <><span className="auth-spinner" aria-hidden />Création du compte…</> : <>Créer mon compte<Icon name="arrowRight" size={18} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
