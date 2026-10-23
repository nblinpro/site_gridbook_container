import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import Icon from "../components/ui/Icon";
import ParticipantPicker from "../components/bets/ParticipantPicker";
import AmountField from "../components/bets/AmountField";
import { estimateOdds, stakeError } from "../components/bets/odds";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import apiClient from "../services/apiClient";
import { formatApiError } from "../services/apiError";
import { formatApex, formatOdds } from "../utils/format";
import "./seasonBets.css";

const EMPTY_POOL = { total_pool: 0, stats: {} };

/** Un marché de fin de saison (champion pilotes ou champion équipes). */
function SeasonMarket({ title, betType, items, season, leader, activeBet, wallet, onPlaced }) {
  const toast = useToast();
  const amountId = useId();
  const [selection, setSelection] = useState("");
  const [amount, setAmount] = useState("50");
  const [pool, setPool] = useState(EMPTY_POOL);
  const [poolError, setPoolError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const loadPool = useCallback(() => {
    apiClient.get(`/bets/season-pool/${season}/${betType}`)
      .then((res) => { setPool(res.data); setPoolError(false); })
      .catch(() => { setPool(EMPTY_POOL); setPoolError(true); });
  }, [season, betType]);

  useEffect(() => { loadPool(); }, [loadPool]);

  const oddsFor = (id) => pool.stats[id]?.probable_odds || null;
  const error = stakeError(amount, wallet);
  const selected = items.find((it) => String(it.id) === selection);
  const estimate = selection && !error ? estimateOdds(pool.total_pool, pool.stats[selection]?.total_bet, amount) : 0;

  const place = async () => {
    setTouched(true);
    if (!selection || error) return;
    try {
      setSubmitting(true);
      await apiClient.post("/bets/place-season", {
        season_id: season,
        bet_type: betType,
        selection_id: Number(selection),
        amount: Number(amount),
      });
      toast.success(`Pari enregistré : ${selected?.name} ${title.toLowerCase()}.`);
      window.dispatchEvent(new Event("refreshDashboard"));
      setSelection("");
      setTouched(false);
      loadPool();
      onPlaced();
    } catch (err) {
      toast.error(formatApiError(err, "Le pari n'a pas été enregistré."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card card-flush card-accent sb-market" aria-labelledby={`${betType}-title`}>
      <div className="card-head">
        <div>
          <h2 id={`${betType}-title`} className="card-title">{title}</h2>
          {leader && <span className="card-subtitle">En tête aujourd'hui : <strong>{leader.name}</strong> · {formatApex(leader.points)} pts</span>}
        </div>
        <div className="sb-pot">
          <span className="stat-label">Cagnotte</span>
          <span className="sb-pot-value num">{formatApex(pool.total_pool)} <small>APEX</small></span>
        </div>
      </div>

      <div className="sb-body">
        {poolError && <div className="alert alert-warning"><Icon name="info" size={16} />Cotes momentanément indisponibles.</div>}

        {activeBet ? (
          <div className="sb-active">
            <span className="badge badge-info">Pari en cours</span>
            <strong className="sb-active-pick">{activeBet.driver_name}</strong>
            <div className="sb-active-grid">
              <div className="stat"><span className="stat-label">Mise</span><span className="sb-active-value num">{formatApex(activeBet.amount)} <small>APEX</small></span></div>
              <div className="stat"><span className="stat-label">Cote actuelle</span><span className="sb-active-value num">{formatOdds(activeBet.odds)}</span></div>
              <div className="stat"><span className="stat-label">Gain potentiel</span><span className="sb-active-value num up">{formatApex(activeBet.potential_gain)} <small>APEX</small></span></div>
            </div>
            <p className="muted sb-note">Un seul pari par classement et par saison. Il sera réglé à la clôture du championnat.</p>
          </div>
        ) : (
          <>
            <ParticipantPicker
              items={items}
              value={selection}
              onChange={setSelection}
              legend={`Ton favori · ${items.length} engagés`}
              searchPlaceholder="Rechercher"
              oddsFor={oddsFor}
            />
            {touched && !selection && <span className="field-error">Choisis un favori.</span>}

            <AmountField id={amountId} value={amount} onChange={setAmount} wallet={wallet} error={touched ? error : null} />

            <dl className="sb-summary">
              <div className="kv"><dt>Sélection</dt><dd><strong>{selected?.name || "—"}</strong></dd></div>
              <div className="kv"><dt>Cote estimée</dt><dd><strong className="num">{estimate ? formatOdds(estimate) : "—"}</strong></dd></div>
              <div className="kv sb-gain"><dt>Gain estimé</dt><dd><strong className="num">{estimate ? `${formatApex(estimate * Number(amount))} APEX` : "—"}</strong></dd></div>
            </dl>

            <button className="btn btn-primary btn-lg btn-block" onClick={place} disabled={submitting}>
              {submitting ? "Enregistrement…" : selected ? `Parier ${formatApex(amount)} APEX sur ${selected.name}` : "Choisis un favori"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default function SeasonBets({ discipline }) {
  const { user } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState(null);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { labels } = discipline;

  const loadMyBets = useCallback(() => {
    apiClient.get("/bets/my_bets").then((res) => setMyBets(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const q = `?discipline=${discipline.slug}`;
    Promise.all([apiClient.get(`/seasons/${q}`), apiClient.get(`/drivers/${q}`), apiClient.get(`/teams/${q}`)])
      .then(([s, d, t]) => {
        setSeasons(s.data);
        // Saison active par défaut (sinon la plus récente) : son id sert de clé aux paris
        setSeason((s.data.find((x) => x.is_active) || s.data[0])?.id ?? null);
        setDrivers([...d.data].sort((a, b) => a.name.localeCompare(b.name)));
        setTeams([...t.data].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    // Classement officiel : contexte utile mais facultatif
    apiClient.get(`/standings/${discipline.slug}`).then((res) => setStandings(res.data)).catch(() => setStandings(null));
    loadMyBets();
  }, [discipline.slug, loadMyBets]);

  const activeBet = useMemo(() => {
    const pending = myBets.filter((b) => b.status === "pending" && b.race_id == null && b.season_id === season);
    return { season_driver: pending.find((b) => b.bet_type === "season_driver"), season_team: pending.find((b) => b.bet_type === "season_team") };
  }, [myBets, season]);

  const year = seasons.find((s) => s.id === season)?.year;
  const seasonSelect = seasons.length > 1 && (
    <label className="sb-season">
      <span className="sr-only">Saison</span>
      <select className="select" value={season ?? ""} onChange={(e) => setSeason(Number(e.target.value))}>
        {seasons.map((s) => <option key={s.id} value={s.id}>Saison {s.year}</option>)}
      </select>
    </label>
  );

  return (
    <Layout>
      <div className="page">
        <PageHeader
          eyebrow={`${discipline.name}${year ? ` · saison ${year}` : ""}`}
          title="Paris de saison"
          subtitle={`Désigne le ${labels.championDriver.toLowerCase()} et le ${labels.championTeam.toLowerCase()} avant la fin du championnat. Plus tu paries tôt, plus la cote peut être élevée.`}
          actions={seasonSelect}
        />

        {loading ? (
          <div className="grid grid-2"><div className="skeleton" style={{ height: 560 }} /><div className="skeleton" style={{ height: 560 }} /></div>
        ) : loadError ? (
          <div className="alert alert-danger"><Icon name="info" size={16} />Impossible de charger les marchés de saison. Réessaie dans un instant.</div>
        ) : !season ? (
          <div className="empty-state"><span className="empty-state-title">Aucune saison ouverte</span><p>Les marchés de ce championnat ouvriront avec la prochaine saison.</p></div>
        ) : (
          <div className="grid grid-2 sb-grid">
            <SeasonMarket
              key={`d-${season}`}
              title={labels.championDriver}
              betType="season_driver"
              items={drivers}
              season={season}
              leader={standings?.drivers?.[0]}
              activeBet={activeBet.season_driver}
              wallet={user?.wallet}
              onPlaced={loadMyBets}
            />
            <SeasonMarket
              key={`t-${season}`}
              title={labels.championTeam}
              betType="season_team"
              items={teams}
              season={season}
              leader={standings?.teams?.[0]}
              activeBet={activeBet.season_team}
              wallet={user?.wallet}
              onPlaced={loadMyBets}
            />
          </div>
        )}

        <p className="muted sb-footnote">
          Pari mutuel : la cagnotte est partagée entre les joueurs qui ont trouvé le champion, au prorata de leur mise.{" "}
          <Link to={discipline.routes.standings} className="btn-link">Voir les classements <Icon name="arrowRight" size={14} /></Link>
        </p>
      </div>
    </Layout>
  );
}
