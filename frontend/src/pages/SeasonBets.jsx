import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../services/apiClient";
import Layout from "../components/Layout";
import F1LightsLoader from "../components/loader/F1LightsLoader";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import "./placeBet.css";
import "./seasonBets.css";
import { formatApiError } from "../services/apiError";

function BetPanel({ title, betType, items, season, user, toast, onPlaced }) {
  const [selection, setSelection] = useState("");
  const [amount, setAmount] = useState(10);
  const [pool, setPool] = useState({ total_pool: 0, stats: {} });
  const [submitting, setSubmitting] = useState(false);

  const loadPool = useCallback(() => {
    apiClient.get(`/bets/season-pool/${season}/${betType}`)
      .then(res => setPool(res.data))
      .catch(() => setPool({ total_pool: 0, stats: {} }));
  }, [season, betType]);

  useEffect(() => { loadPool(); }, [loadPool]);

  const probableOdds = selection && pool.stats[selection] ? pool.stats[selection].probable_odds : "—";

  const handlePlace = async () => {
    if (!selection) return toast.warning("Sélectionne un favori avant de valider.");
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return toast.warning("Le montant doit être positif.");
    if (user && parsedAmount > parseFloat(user.wallet || 0)) return toast.warning("Solde insuffisant.");

    try {
      setSubmitting(true);
      await apiClient.post("/bets/place-season", {
        season_id: season,
        bet_type: betType,
        selection_id: parseInt(selection),
        amount: parsedAmount,
      });
      toast.success("Pari saison enregistré !");
      window.dispatchEvent(new Event("refreshDashboard"));
      setSelection("");
      loadPool();
      onPlaced?.();
    } catch (err) {
      toast.error(formatApiError(err, "Erreur lors de l'enregistrement du pari."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="season-panel">
      <div className="season-panel-header">
        <h3>{title}</h3>
        <span className="season-pool-total">CAGNOTTE : {pool.total_pool.toLocaleString()} APEX</span>
      </div>
      <div className="season-panel-body">
        <div className="input-block">
          <label className="terminal-label">FAVORI</label>
          <select className="hud-select" value={selection} onChange={e => setSelection(e.target.value)}>
            <option value="">-- SÉLECTIONNER --</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}{pool.stats[item.id] ? ` (cote ${pool.stats[item.id].probable_odds})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="input-block">
          <label className="terminal-label">MONTANT (APEX)</label>
          <input type="number" min="1" step="1" className="hud-input" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="season-odds-preview">Cote probable actuelle : <strong>{probableOdds}</strong></div>
        <button className="hud-btn-main" onClick={handlePlace} disabled={!selection || submitting}>
          {submitting ? "ENVOI..." : "PLACER LE PARI"}
        </button>
      </div>
    </div>
  );
}

export default function SeasonBets({ discipline }) {
  const { user } = useAuth();
  const toast = useToast();
  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { labels } = discipline;

  useEffect(() => {
    setLoading(true);
    const q = `?discipline=${discipline.slug}`;
    Promise.all([
      apiClient.get(`/seasons/${q}`),
      apiClient.get(`/drivers/${q}`),
      apiClient.get(`/teams/${q}`),
    ]).then(([sRes, dRes, tRes]) => {
      setSeasons(sRes.data);
      // Saison active par défaut (la plus récente sinon) : son id sert de clé aux paris
      setSeason((sRes.data.find(s => s.is_active) || sRes.data[0])?.id ?? null);
      setDrivers(dRes.data);
      setTeams(tRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [discipline.slug]);

  if (loading) return <F1LightsLoader label="CHARGEMENT_CLASSEMENTS..." />;

  return (
    <Layout>
      <div className="season-page f1-grid-bg" style={{ "--sport-accent": discipline.accent }}>
        <header className="hud-header">
          <div className="hud-title-group">
            <span className="hud-tag">// CHAMPIONSHIP_MARKETS · {discipline.name.toUpperCase()}</span>
            <h1 className="hud-main-title">PARIS DE SAISON</h1>
          </div>
          <div className="input-block season-select-block">
            <label className="terminal-label">SAISON</label>
            <select className="hud-select" value={season ?? ""} onChange={e => setSeason(parseInt(e.target.value))}>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.year}</option>)}
            </select>
          </div>
        </header>

        <p className="season-hint">
          Parie sur le {labels.championDriver.toLowerCase()} et le {labels.championTeam.toLowerCase()} de fin de saison. Un seul pari actif par classement et par saison.
        </p>

        {!season ? <p className="season-hint">Aucune saison disponible pour ce championnat.</p> : <div className="season-panels-grid">
          <BetPanel
            title={labels.championDriver.toUpperCase()}
            betType="season_driver"
            items={drivers}
            season={season}
            user={user}
            toast={toast}
          />
          <BetPanel
            title={labels.championTeam.toUpperCase()}
            betType="season_team"
            items={teams}
            season={season}
            user={user}
            toast={toast}
          />
        </div>}
      </div>
    </Layout>
  );
}
