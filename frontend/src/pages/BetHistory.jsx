import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import { getDiscipline } from "../data/disciplines";
import { useDiscipline } from "../components/discipline/DisciplineContext";
import apiClient from "../services/apiClient";
import { formatApiError } from "../services/apiError";
import { BET_STATUS, formatApex, formatDate, formatOdds } from "../utils/format";
import "./betHistory.css";

const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En cours" },
  { key: "won", label: "Gagnés" },
  { key: "lost", label: "Perdus" },
];

// Gain réel d'un pari réglé : la cote finale est figée à l'arrivée
const payout = (b) => (b.status === "won" ? Number(b.potential_gain || 0) : 0);

/**
 * Historique des paris : d'un championnat (`discipline`) ou de tous (`/bet-history`).
 */
export default function BetHistory({ discipline }) {
  const { fetchUser } = useAuth();
  const toast = useToast();
  const { discipline: current } = useDiscipline();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");
  const [toCancel, setToCancel] = useState(null);

  const load = useCallback(() => {
    setError(false);
    return apiClient.get("/bets/my_bets")
      .then((res) => setBets(discipline ? res.data.filter((b) => b.discipline === discipline.slug) : res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [discipline]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const stats = useMemo(() => {
    const settled = bets.filter((b) => b.status === "won" || b.status === "lost");
    const won = settled.filter((b) => b.status === "won");
    const pending = bets.filter((b) => b.status === "pending");
    const stakeSettled = settled.reduce((s, b) => s + Number(b.amount || 0), 0);
    const gains = won.reduce((s, b) => s + payout(b), 0);
    return {
      total: bets.length,
      pending: pending.length,
      pendingStake: pending.reduce((s, b) => s + Number(b.amount || 0), 0),
      staked: bets.reduce((s, b) => s + Number(b.amount || 0), 0),
      winRate: settled.length ? Math.round((won.length / settled.length) * 100) : null,
      won: won.length,
      settled: settled.length,
      net: gains - stakeSettled,
    };
  }, [bets]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, f.key === "all" ? bets.length : bets.filter((b) => b.status === f.key).length])), [bets]);
  const shown = filter === "all" ? bets : bets.filter((b) => b.status === filter);

  const confirmCancel = async () => {
    const bet = toCancel;
    setToCancel(null);
    try {
      await apiClient.delete(`/bets/${bet.id}`);
      toast.success(`Pari annulé : ${formatApex(bet.amount)} APEX recrédités.`);
      fetchUser();
      window.dispatchEvent(new Event("refreshDashboard"));
      load();
    } catch (err) {
      toast.error(formatApiError(err, "Impossible d'annuler ce pari."));
    }
  };

  const calendar = (discipline || current).routes.calendar;

  return (
    <Layout>
      <div className="page">
        <PageHeader
          eyebrow={discipline ? discipline.name : "Tous les championnats"}
          title="Mes paris"
          subtitle="Suis tes paris en cours, tes gains et ton taux de réussite."
          actions={discipline
            ? <Link to="/bet-history" className="btn btn-secondary">Tous les championnats</Link>
            : null}
        />

        <div className="grid grid-4">
          <div className="card stat"><span className="stat-label">Paris placés</span><span className="stat-value num">{stats.total}</span><span className="stat-hint">{stats.pending} en cours</span></div>
          <div className="card stat"><span className="stat-label">Taux de réussite</span><span className="stat-value num">{stats.winRate == null ? "—" : `${stats.winRate} %`}</span><span className="stat-hint">{stats.settled ? `${stats.won} gagné${stats.won > 1 ? "s" : ""} sur ${stats.settled} réglé${stats.settled > 1 ? "s" : ""}` : "Aucun pari réglé"}</span></div>
          <div className="card stat"><span className="stat-label">Total misé</span><span className="stat-value num">{formatApex(stats.staked)}<small>APEX</small></span><span className="stat-hint">dont {formatApex(stats.pendingStake)} en jeu</span></div>
          <div className="card stat"><span className="stat-label">Bilan des paris réglés</span><span className={`stat-value num ${stats.net > 0 ? "bh-up" : stats.net < 0 ? "bh-down" : ""}`}>{stats.net > 0 ? "+" : ""}{formatApex(stats.net)}<small>APEX</small></span><span className="stat-hint">Gains moins mises</span></div>
        </div>

        <section className="card card-flush">
          <div className="card-head bh-head">
            <div className="segmented" role="group" aria-label="Filtrer par statut">
              {FILTERS.map((f) => (
                <button key={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label} <span className="bh-count num">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bh-pad"><div className="skeleton" style={{ height: 220 }} /></div>
          ) : error ? (
            <div className="bh-pad"><div className="alert alert-danger"><Icon name="info" size={16} />Impossible de charger tes paris. <button className="btn-link" onClick={load}>Réessayer</button></div></div>
          ) : shown.length === 0 ? (
            <div className="bh-pad">
              <EmptyState
                icon="ticket"
                title={bets.length === 0 ? "Aucun pari pour l'instant" : "Aucun pari dans cette catégorie"}
                action={bets.length === 0 && <Link to={calendar} className="btn btn-primary">Voir les prochaines courses</Link>}
              >
                {bets.length === 0 ? "Choisis une course ouverte dans le calendrier et place ton premier pronostic." : "Change de filtre pour voir tes autres paris."}
              </EmptyState>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table bh-table">
                <thead>
                  <tr>
                    <th>Épreuve</th>
                    <th>Sélection</th>
                    <th className="num">Mise</th>
                    <th className="num">Cote</th>
                    <th className="num">Gain</th>
                    <th>Statut</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => {
                    const sport = getDiscipline(b.discipline);
                    const status = BET_STATUS[b.status] || { label: b.status, badge: "" };
                    const isSeason = b.race_id == null;
                    return (
                      <tr key={b.id} style={{ "--item": sport.accent }}>
                        <td data-label="Épreuve">
                          <div className="bh-event">
                            <span className="bh-sport">{sport.short}</span>
                            <span className="strong">{b.race_name}</span>
                            <span className="muted bh-sub">{isSeason ? "Pari de saison" : b.race_date ? formatDate(b.race_date) : ""}</span>
                          </div>
                        </td>
                        <td data-label="Sélection" className="strong">{b.driver_name}</td>
                        <td data-label="Mise" className="num">{formatApex(b.amount)} APEX</td>
                        <td data-label="Cote" className="num">{formatOdds(b.odds)}</td>
                        <td data-label="Gain" className={`num ${b.status === "won" ? "bh-up" : b.status === "lost" ? "bh-down" : ""}`}>
                          {b.status === "won" ? `+${formatApex(payout(b))}` : b.status === "lost" ? `−${formatApex(b.amount)}` : `${formatApex(b.potential_gain)} potentiel`}
                        </td>
                        <td data-label="Statut"><span className={`badge ${status.badge}`}>{status.label}</span></td>
                        <td className="bh-actions">
                          {b.status === "pending" && b.is_open !== false && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setToCancel(b)}>Annuler</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        title="Annuler ce pari ?"
        message={toCancel ? `${formatApex(toCancel.amount)} APEX misés sur ${toCancel.driver_name} seront recrédités sur ton solde.` : ""}
        confirmLabel="Annuler le pari"
        cancelLabel="Garder le pari"
        danger
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </Layout>
  );
}
