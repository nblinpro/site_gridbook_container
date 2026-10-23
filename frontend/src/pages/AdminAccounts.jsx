import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";
import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import { formatApiError } from "../services/apiError";
import { formatApex, formatDate, formatDateTime } from "../utils/format";
import "./admin.css";
import "./adminAccounts.css";

const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "admin", label: "Admins" },
  { id: "banned", label: "Bannis" },
];
const REASONS = ["Compensation incident", "Remboursement", "Gain de concours", "Correction de solde"];
const EMPTY_USER = { username: "", email: "", password: "", role: "user" };

const initial = (name) => (name?.trim().charAt(0) || "?").toUpperCase();

function Avatar({ user, size = "md" }) {
  return <span className={`acc-avatar acc-avatar-${size} ${user.role === "admin" ? "is-admin" : ""}`} aria-hidden>{initial(user.username)}</span>;
}

const RoleBadge = ({ role }) => (role === "admin"
  ? <span className="badge badge-sport"><Icon name="shield" size={11} strokeWidth={2.5} />Admin</span>
  : <span className="badge">Joueur</span>);

const StatusBadge = ({ active }) => (active
  ? <span className="badge badge-success">Actif</span>
  : <span className="badge badge-danger">Banni</span>);

// Hook : ferme une fenêtre avec Échap
function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

export default function AdminAccounts() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const [userAction, setUserAction] = useState(null); // { type: "ban"|"promote", user }
  const [actionError, setActionError] = useState("");

  // Panneau de gestion d'un compte (solde + historique)
  const [detailId, setDetailId] = useState(null);
  const [walletMode, setWalletMode] = useState("credit");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletError, setWalletError] = useState("");
  const [confirmDebit, setConfirmDebit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");

  // Création de compte
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/users");
      setUsers(res.data);
      setLoadError("");
    } catch (error) {
      setLoadError(formatApiError(error, "Impossible de charger la liste des comptes."));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const fetchTransactions = useCallback(async (id) => {
    setTxLoading(true);
    setTxError("");
    try {
      const res = await apiClient.get(`/admin/users/${id}/transactions`);
      setTransactions(res.data);
    } catch (error) {
      setTxError(formatApiError(error, "Historique indisponible."));
    } finally {
      setTxLoading(false);
    }
  }, []);

  // --- Données dérivées ---
  const counts = useMemo(() => ({
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    banned: users.filter((u) => !u.is_active).length,
  }), [users]);
  const totalWallet = users.reduce((sum, u) => sum + Number(u.wallet || 0), 0);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (filter === "admin" ? u.role === "admin" : filter === "banned" ? !u.is_active : true))
      .filter((u) => !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .sort((a, b) => (a.username || "").localeCompare(b.username || "", "fr"));
  }, [users, query, filter]);

  const detailUser = users.find((u) => u.id === detailId) || null;
  const isSelf = (u) => u && me && u.id === me.id;

  // --- Statut / rôle ---
  const requestToggleBan = (u) => { setActionError(""); setUserAction({ type: "ban", user: u }); };
  const requestPromote = (u) => { setActionError(""); setUserAction({ type: "promote", user: u }); };

  const confirmUserAction = async () => {
    if (!userAction) return;
    const { type, user: targetUser } = userAction;
    setUserAction(null);
    try {
      if (type === "ban") {
        await apiClient.patch(`/admin/users/${targetUser.id}/toggle-status`, {});
        toast.success(targetUser.is_active ? `Compte « ${targetUser.username} » banni.` : `Compte « ${targetUser.username} » réactivé.`);
      } else {
        await apiClient.patch(`/admin/users/${targetUser.id}/promote`, {});
        toast.success(targetUser.role === "admin" ? "Droits admin retirés." : "Utilisateur promu admin.");
      }
      void fetchUsers();
    } catch (err) {
      const message = formatApiError(err, "Action impossible.");
      setActionError(message);
      toast.error(message);
    }
  };

  // --- Panneau de gestion ---
  const openDetail = (u) => {
    setDetailId(u.id);
    setWalletMode("credit");
    setWalletAmount("");
    setWalletReason("");
    setWalletError("");
    setActionError("");
    setTransactions([]);
    void fetchTransactions(u.id);
  };
  const closeDetail = useCallback(() => setDetailId(null), []);
  useEscape(detailId !== null && !userAction && !confirmDebit, closeDetail);

  const amountValue = Math.abs(parseFloat(walletAmount)) || 0;
  const signedAmount = walletMode === "credit" ? amountValue : -amountValue;
  const projected = detailUser ? Number(detailUser.wallet || 0) + signedAmount : 0;

  const validateWallet = () => {
    if (!amountValue) return "Entre un montant supérieur à zéro.";
    if (walletReason.trim().length < 3) return "Indique un motif (3 caractères minimum).";
    if (projected < 0) return "Le solde ne peut pas devenir négatif.";
    return "";
  };

  const submitWalletAdjust = async (e) => {
    e?.preventDefault();
    const problem = validateWallet();
    if (problem) { setWalletError(problem); return toast.warning(problem); }
    if (walletMode === "debit" && !confirmDebit) { setConfirmDebit(true); return; }
    setConfirmDebit(false);
    setWalletError("");
    try {
      setSubmitting(true);
      const res = await apiClient.patch(`/admin/users/${detailUser.id}/adjust-wallet`, {
        amount: signedAmount,
        reason: walletReason.trim(),
      });
      toast.success(`Solde ajusté : ${formatApex(res.data.new_wallet_balance)} APEX`);
      setWalletAmount("");
      setWalletReason("");
      void fetchUsers();
      void fetchTransactions(detailUser.id);
    } catch (err) {
      const message = formatApiError(err, "Ajustement impossible.");
      setWalletError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Création ---
  const openCreateUser = () => {
    setNewUser(EMPTY_USER);
    setCreateError("");
    setShowCreateUser(true);
  };
  const closeCreateUser = useCallback(() => setShowCreateUser(false), []);
  useEscape(showCreateUser, closeCreateUser);

  const submitCreateUser = async (e) => {
    e.preventDefault();
    let problem = "";
    if (newUser.username.trim().length < 3) problem = "Le pseudo doit faire au moins 3 caractères.";
    else if (!newUser.email.trim()) problem = "Indique une adresse e-mail.";
    else if (newUser.password.length < 8) problem = "Le mot de passe doit faire au moins 8 caractères.";
    if (problem) { setCreateError(problem); return toast.warning(problem); }

    try {
      setCreating(true);
      setCreateError("");
      await apiClient.post("/admin/users", { ...newUser, username: newUser.username.trim(), email: newUser.email.trim() });
      toast.success(`Compte « ${newUser.username.trim()} » créé (${newUser.role === "admin" ? "admin" : "joueur"}).`);
      setShowCreateUser(false);
      void fetchUsers();
    } catch (err) {
      const message = formatApiError(err, "Création impossible.");
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const banLabel = (u) => (u.is_active ? "Bannir" : "Réactiver");

  return (
    <Layout rail={false}>
      <div className="page acc">
        <PageHeader
          eyebrow="Administration"
          title="Comptes & crédits"
          subtitle="Rôles, statuts des comptes et ajustements de solde. Chaque ajustement est tracé dans l'historique du joueur."
          actions={<button type="button" className="btn btn-primary" onClick={openCreateUser}><Icon name="plus" size={16} />Créer un compte</button>}
        />

        {/* Synthèse */}
        <div className="acc-summary card">
          {[
            ["Comptes", counts.all],
            ["Administrateurs", counts.admin],
            ["Bannis", counts.banned],
            ["Soldes cumulés", formatApex(totalWallet), "APEX"],
          ].map(([label, value, unit]) => (
            <div key={label} className="stat acc-summary-item">
              <span className="stat-label">{label}</span>
              {loading ? <span className="skeleton acc-stat-skel" /> : <span className="stat-value">{value}{unit && <small>{unit}</small>}</span>}
            </div>
          ))}
        </div>

        {loadError && (
          <div className="alert alert-danger" role="alert">
            <Icon name="info" size={18} />
            <span className="acc-grow">{loadError}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); void fetchUsers(); }}>Réessayer</button>
          </div>
        )}
        {actionError && !detailUser && (
          <div className="alert alert-danger" role="alert">
            <Icon name="info" size={18} /><span className="acc-grow">{actionError}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActionError("")}>Fermer</button>
          </div>
        )}

        <section className="card card-flush">
          <div className="acc-toolbar">
            <label className="acc-search">
              <span className="sr-only">Rechercher un compte</span>
              <Icon name="search" size={16} className="acc-search-icon" />
              <input
                type="search"
                className="input"
                placeholder="Rechercher par pseudo ou e-mail"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="segmented" role="group" aria-label="Filtrer les comptes">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}<span className="acc-count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="acc-skel-list">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}</div>
          ) : visibleUsers.length === 0 ? (
            <div className="acc-empty">
              <EmptyState
                icon={query ? "search" : "users"}
                title={query || filter !== "all" ? "Aucun compte ne correspond" : "Aucun compte"}
                action={(query || filter !== "all") && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setQuery(""); setFilter("all"); }}>Réinitialiser les filtres</button>}
              >
                {query || filter !== "all" ? "Modifie ta recherche ou change de filtre." : "Crée un premier compte avec le bouton « Créer un compte »."}
              </EmptyState>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table acc-table">
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>E-mail</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Inscription</th>
                    <th className="num">Solde</th>
                    <th className="num"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => (
                    <tr key={u.id} className={u.is_active ? "" : "is-banned"}>
                      <td className="acc-cell-user">
                        <span className="acc-user">
                          <Avatar user={u} />
                          <span className="acc-user-text">
                            <span className="strong acc-user-name">{u.username}{isSelf(u) && <span className="acc-you">Vous</span>}</span>
                            <span className="acc-user-mail">{u.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="acc-cell-email">{u.email}</td>
                      <td className="acc-cell-role" data-label="Rôle"><RoleBadge role={u.role} /></td>
                      <td className="acc-cell-status" data-label="Statut"><StatusBadge active={u.is_active} /></td>
                      <td className="acc-cell-date" data-label="Inscription">{u.created_at ? formatDate(u.created_at) : "—"}</td>
                      <td className="num acc-cell-wallet" data-label="Solde"><span><span className="acc-wallet">{formatApex(u.wallet)}</span><span className="unit">APEX</span></span></td>
                      <td className="num acc-cell-actions">
                        <div className="acc-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openDetail(u)}>
                            <Icon name="wallet" size={14} />Gérer
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${u.is_active ? "btn-ghost acc-ban" : "btn-secondary"}`}
                            onClick={() => requestToggleBan(u)}
                            disabled={isSelf(u)}
                            title={isSelf(u) ? "Tu ne peux pas bannir ton propre compte" : undefined}
                          >
                            {banLabel(u)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && visibleUsers.length > 0 && (
            <div className="acc-table-foot muted">{visibleUsers.length} compte{visibleUsers.length > 1 ? "s" : ""} affiché{visibleUsers.length > 1 ? "s" : ""} sur {users.length}</div>
          )}
        </section>
      </div>

      {/* --- Panneau de gestion d'un compte --- */}
      {detailUser && (
        <div className="adm-overlay adm-overlay-side" onClick={closeDetail}>
          <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="acc-detail-title" onClick={(e) => e.stopPropagation()}>
            <div className="adm-dialog-head">
              <div className="acc-user">
                <Avatar user={detailUser} size="lg" />
                <span className="acc-user-text">
                  <h2 id="acc-detail-title" className="adm-dialog-title">{detailUser.username}{isSelf(detailUser) && <span className="acc-you">Vous</span>}</h2>
                  <span className="adm-dialog-sub">{detailUser.email}</span>
                  <span className="acc-badges"><RoleBadge role={detailUser.role} /><StatusBadge active={detailUser.is_active} /></span>
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-icon adm-close" onClick={closeDetail} aria-label="Fermer"><Icon name="close" size={18} /></button>
            </div>

            <div className="adm-dialog-body acc-detail">
              <div className="acc-balance">
                <span className="stat-label">Solde actuel</span>
                <span className="stat-value">{formatApex(detailUser.wallet)}<small>APEX</small></span>
                {detailUser.created_at && <span className="muted acc-since">Inscrit le {formatDate(detailUser.created_at)}</span>}
              </div>

              {/* Ajustement */}
              <form className="acc-panel" onSubmit={submitWalletAdjust} noValidate>
                <h3 className="acc-panel-title">Ajuster le solde</h3>
                <div className="segmented acc-seg-block" role="group" aria-label="Type d'ajustement">
                  <button type="button" aria-pressed={walletMode === "credit"} onClick={() => { setWalletMode("credit"); setWalletError(""); }}><Icon name="plus" size={14} />Créditer</button>
                  <button type="button" aria-pressed={walletMode === "debit"} onClick={() => { setWalletMode("debit"); setWalletError(""); }}><span className="acc-minus" aria-hidden>−</span>Débiter</button>
                </div>
                <label className="field">
                  <span className="field-label">Montant</span>
                  <span className="input-group">
                    <input type="number" min="1" step="1" inputMode="numeric" className="input" placeholder="500" value={walletAmount} onChange={(e) => { setWalletAmount(e.target.value); setWalletError(""); }} />
                    <span className="input-suffix">APEX</span>
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Motif</span>
                  <input type="text" className="input" maxLength={255} placeholder="Ex. compensation après un incident" value={walletReason} onChange={(e) => { setWalletReason(e.target.value); setWalletError(""); }} />
                  <span className="acc-chips">
                    {REASONS.map((r) => <button key={r} type="button" className="acc-chip" onClick={() => setWalletReason(r)}>{r}</button>)}
                  </span>
                </label>
                {amountValue > 0 && (
                  <div className={`acc-preview ${projected < 0 ? "is-negative" : ""}`}>
                    <span>Nouveau solde</span>
                    <strong className="num">{formatApex(projected)} APEX</strong>
                  </div>
                )}
                {walletError && <div className="alert alert-danger" role="alert"><Icon name="info" size={16} /><span>{walletError}</span></div>}
                <button type="submit" className={`btn btn-block ${walletMode === "debit" ? "btn-danger" : "btn-primary"}`} disabled={submitting}>
                  {submitting ? "Enregistrement…" : walletMode === "credit" ? `Créditer ${amountValue ? `${formatApex(amountValue)} APEX` : ""}` : `Débiter ${amountValue ? `${formatApex(amountValue)} APEX` : ""}`}
                </button>
              </form>

              {/* Droits et statut */}
              <div className="acc-panel">
                <h3 className="acc-panel-title">Droits et statut</h3>
                {isSelf(detailUser) && <p className="field-hint">Tu ne peux pas modifier ton propre rôle ni bannir ton propre compte.</p>}
                {actionError && <div className="alert alert-danger" role="alert"><Icon name="info" size={16} /><span>{actionError}</span></div>}
                <div className="acc-rights">
                  <div className="acc-right-row">
                    <span>
                      <strong>Administrateur</strong>
                      <span className="muted">Accès à la direction de course et aux comptes.</span>
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => requestPromote(detailUser)} disabled={isSelf(detailUser)}>
                      {detailUser.role === "admin" ? "Retirer les droits" : "Promouvoir"}
                    </button>
                  </div>
                  <div className="acc-right-row">
                    <span>
                      <strong>{detailUser.is_active ? "Compte actif" : "Compte banni"}</strong>
                      <span className="muted">{detailUser.is_active ? "Un compte banni ne peut plus se connecter." : "Le joueur ne peut plus se connecter."}</span>
                    </span>
                    <button type="button" className={`btn btn-sm ${detailUser.is_active ? "btn-danger" : "btn-secondary"}`} onClick={() => requestToggleBan(detailUser)} disabled={isSelf(detailUser)}>
                      {banLabel(detailUser)}
                    </button>
                  </div>
                </div>
              </div>

              {/* Historique */}
              <div className="acc-panel">
                <div className="acc-panel-head">
                  <h3 className="acc-panel-title">Historique des ajustements</h3>
                  {!txLoading && transactions.length > 0 && <span className="muted acc-tx-count">{transactions.length}</span>}
                </div>
                {txLoading ? (
                  <div className="acc-skel-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>
                ) : txError ? (
                  <div className="alert alert-danger" role="alert">
                    <Icon name="info" size={16} /><span className="acc-grow">{txError}</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchTransactions(detailUser.id)}>Réessayer</button>
                  </div>
                ) : transactions.length === 0 ? (
                  <EmptyState icon="history" title="Aucune opération">Les crédits et débits manuels apparaîtront ici.</EmptyState>
                ) : (
                  <ul className="acc-tx-list">
                    {transactions.map((t) => {
                      const credit = t.type === "credit";
                      return (
                        <li key={t.id} className="acc-tx">
                          <span className={`acc-tx-icon ${credit ? "is-credit" : "is-debit"}`} aria-hidden>{credit ? "+" : "−"}</span>
                          <span className="acc-tx-text">
                            <span className="acc-tx-reason">{t.reason || (credit ? "Crédit" : "Débit")}</span>
                            <span className="muted acc-tx-date">{t.created_at ? formatDateTime(t.created_at) : ""}</span>
                          </span>
                          <span className={`num acc-tx-amount ${credit ? "is-credit" : "is-debit"}`}>{credit ? "+" : "−"}{formatApex(t.amount)} <span className="unit">APEX</span></span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* --- Création de compte --- */}
      {showCreateUser && (
        <div className="adm-overlay" onClick={closeCreateUser}>
          <form className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="acc-create-title" onClick={(e) => e.stopPropagation()} onSubmit={submitCreateUser} noValidate>
            <div className="adm-dialog-head">
              <div>
                <h2 id="acc-create-title" className="adm-dialog-title">Créer un compte</h2>
                <p className="adm-dialog-sub">Le compte est actif immédiatement, avec le solde de départ habituel.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon adm-close" onClick={closeCreateUser} aria-label="Fermer"><Icon name="close" size={18} /></button>
            </div>
            <div className="adm-dialog-body">
              <label className="field">
                <span className="field-label">Pseudo</span>
                <input type="text" className="input" placeholder="jdupont" autoComplete="off" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} autoFocus />
                <span className="field-hint">3 à 50 caractères.</span>
              </label>
              <label className="field">
                <span className="field-label">E-mail</span>
                <input type="email" className="input" placeholder="jdupont@exemple.fr" autoComplete="off" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Mot de passe</span>
                <input type="password" className="input" placeholder="8 caractères minimum" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                <span className="field-hint">Communique-le au joueur par un canal sûr.</span>
              </label>
              <label className="field">
                <span className="field-label">Rôle</span>
                <select className="select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="user">Joueur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </label>
              {createError && <div className="alert alert-danger" role="alert"><Icon name="info" size={16} /><span>{createError}</span></div>}
            </div>
            <div className="adm-dialog-foot">
              <button type="button" className="btn btn-ghost" onClick={closeCreateUser}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Création…" : "Créer le compte"}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={userAction !== null}
        title={userAction?.type === "ban"
          ? (userAction.user.is_active ? "Bannir ce compte ?" : "Réactiver ce compte ?")
          : (userAction?.user.role === "admin" ? "Retirer les droits admin ?" : "Promouvoir administrateur ?")}
        message={
          userAction?.type === "ban"
            ? (userAction.user.is_active
              ? `« ${userAction.user.username} » ne pourra plus se connecter ni parier. Tu pourras le réactiver plus tard.`
              : `« ${userAction.user.username} » pourra de nouveau se connecter et parier.`)
            : (userAction?.user.role === "admin"
              ? `« ${userAction?.user.username} » perdra l'accès à la direction de course et à la gestion des comptes.`
              : `« ${userAction?.user.username} » aura accès à la direction de course, aux comptes et aux soldes.`)
        }
        confirmLabel={userAction?.type === "ban" ? (userAction.user.is_active ? "Bannir" : "Réactiver") : (userAction?.user.role === "admin" ? "Retirer les droits" : "Promouvoir")}
        danger={userAction?.type === "ban" ? userAction.user.is_active : userAction?.user.role === "admin"}
        onConfirm={confirmUserAction}
        onCancel={() => setUserAction(null)}
      />
      <ConfirmDialog
        open={confirmDebit}
        title="Débiter ce compte ?"
        message={detailUser ? `${formatApex(amountValue)} APEX seront retirés du solde de « ${detailUser.username} » (nouveau solde : ${formatApex(projected)} APEX).` : ""}
        confirmLabel="Débiter"
        danger
        onConfirm={() => submitWalletAdjust()}
        onCancel={() => setConfirmDebit(false)}
      />
    </Layout>
  );
}
