import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";
import Layout from "../components/Layout";
import F1LightsLoader from "../components/loader/F1LightsLoader";
import "./betHistory.css";

const FILTERS = [
  { key: "all", label: "TOUS" },
  { key: "pending", label: "EN ATTENTE" },
  { key: "won", label: "GAGNÉS" },
  { key: "lost", label: "PERDUS" },
];

export default function BetHistory({ discipline }) {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    apiClient.get("/bets/my_bets")
      .then(res => setBets(discipline ? res.data.filter(b => b.discipline === discipline.slug) : res.data))
      .catch(() => setBets([]))
      .finally(() => setLoading(false));
  }, [discipline]);

  const stats = useMemo(() => {
    const resolved = bets.filter(b => b.status === "won" || b.status === "lost");
    const won = bets.filter(b => b.status === "won");
    const totalWagered = bets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const totalWon = won.reduce((sum, b) => sum + parseFloat(b.potential_gain || 0), 0);
    const winRate = resolved.length > 0 ? Math.round((won.length / resolved.length) * 100) : 0;
    return {
      count: bets.length,
      winRate,
      totalWagered,
      net: totalWon - totalWagered + bets.filter(b => b.status === "pending").reduce((s, b) => s + parseFloat(b.amount || 0), 0),
    };
  }, [bets]);

  const filteredBets = filter === "all" ? bets : bets.filter(b => b.status === filter);

  if (loading) return <F1LightsLoader label="CHARGEMENT_HISTORIQUE..." />;

  return (
    <Layout>
      <div className="history-page" style={discipline ? { "--sport-accent": discipline.accent } : undefined}>
        <header className="history-header">
          <span className="history-tag">// MES_PARIS{discipline ? ` · ${discipline.name.toUpperCase()}` : ""}</span>
          <h1 className="history-title">HISTORIQUE DES PARIS</h1>
        </header>

        <div className="history-stats-grid">
          <div className="history-stat">
            <label>TOTAL PARIS</label>
            <div className="val">{stats.count}</div>
          </div>
          <div className="history-stat">
            <label>TAUX DE RÉUSSITE</label>
            <div className="val">{stats.winRate}%</div>
          </div>
          <div className="history-stat">
            <label>TOTAL MISÉ</label>
            <div className="val">{stats.totalWagered.toLocaleString()} <span className="unit">APEX</span></div>
          </div>
          <div className={`history-stat ${stats.net >= 0 ? "positive" : "negative"}`}>
            <label>BILAN NET</label>
            <div className="val">{stats.net >= 0 ? "+" : ""}{Math.round(stats.net).toLocaleString()} <span className="unit">APEX</span></div>
          </div>
        </div>

        <div className="history-filters">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="history-list">
          {filteredBets.length === 0 ? (
            <div className="history-empty">Aucun pari dans cette catégorie.</div>
          ) : (
            filteredBets.map(bet => (
              <div key={bet.id} className={`history-row status-${bet.status}`}>
                <div className="history-row-main">
                  <span className="history-race">{bet.race_name}</span>
                  <span className="history-driver">{bet.driver_name}</span>
                </div>
                <div className="history-row-amounts">
                  <span className="history-amount">{bet.amount} APEX</span>
                  <span className="history-odds">cote {bet.odds}</span>
                </div>
                <span className={`history-badge badge-${bet.status}`}>{bet.status.toUpperCase()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
