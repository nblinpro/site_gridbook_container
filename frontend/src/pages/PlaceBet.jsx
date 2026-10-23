import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../services/apiClient";
import { formatApiError } from "../services/apiError";
import Layout from "../components/Layout";
import Icon from "../components/ui/Icon";
import EmptyState from "../components/ui/EmptyState";
import TrackSchematic from "../components/circuit/TrackSchematic";
import ParticipantPicker from "../components/bets/ParticipantPicker";
import AmountField from "../components/bets/AmountField";
import { estimateOdds, stakeError } from "../components/bets/odds";
import { CIRCUIT_DETAILS } from "../data/circuitData";
import { buildCircuitView } from "../data/circuitView";
import { getDiscipline } from "../data/disciplines";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import { useDiscipline } from "../components/discipline/DisciplineContext";
import { countdown, formatApex, formatDateTime, formatOdds, toDate } from "../utils/format";
import "./placeBet.css";

// Clé des fiches F1 rédigées à la main : « Japanese Grand Prix » → « japanese »
const f1Key = (name) => name.toLowerCase().replace(/ grand prix/g, "").trim().replace(/\s+/g, "_");

// Horloge partagée par le compte à rebours (rafraîchie toutes les 30 s)
function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function marketState(race, now) {
  if (race.status === "finished") return { open: false, label: "Terminé", badge: "", reason: "finished" };
  if (!race.is_open) return { open: false, label: "Paris fermés", badge: "badge-danger", reason: "closed" };
  if (race.status !== "upcoming" || toDate(race.start_datetime).getTime() <= now) return { open: false, label: "Départ donné", badge: "badge-warning", reason: "started" };
  return { open: true, label: "Paris ouverts", badge: "badge-success", reason: null };
}

export default function PlaceBet() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const { setDiscipline } = useDiscipline();
  const now = useNow();

  const [race, setRace] = useState(null);
  const [f1Circuit, setF1Circuit] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [pool, setPool] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [amount, setAmount] = useState("10");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Le Layout rafraîchit l'objet user à chaque montage : dépendre de l'objet
  // entier relançait ce chargement en boucle. Seul l'identifiant compte ici.
  const userId = user?.id;

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { navigate("/login"); return; }

    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const { data: currentRace } = await apiClient.get(`/races/${parseInt(raceId)}`);
        setRace(currentRace);
        setDiscipline(currentRace.discipline);
        setImageFailed(false);

        // F1 : fiche rédigée à la main. MotoGP / NASCAR : fiche importée de l'API (race.circuit)
        setF1Circuit(currentRace.discipline === "f1" ? CIRCUIT_DETAILS[f1Key(currentRace.name)] || null : null);

        const [driversRes, poolRes] = await Promise.allSettled([
          apiClient.get(`/drivers/?discipline=${currentRace.discipline}`),
          apiClient.get(`/bets/pool/${currentRace.id}`),
        ]);
        if (driversRes.status !== "fulfilled") throw driversRes.reason;
        setDrivers(driversRes.value.data);
        // La cagnotte n'est qu'une aide à la décision : sans elle, le bulletin reste utilisable
        setPool(poolRes.status === "fulfilled" ? poolRes.value.data : null);
      } catch (err) {
        console.error("Fetch error:", err);
        setLoadError(true);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [raceId, navigate, userId, authLoading, setDiscipline]);

  const sport = getDiscipline(race?.discipline);
  const { labels } = sport;
  const view = useMemo(
    () => (race ? buildCircuitView(race.discipline, f1Circuit, race.circuit, race.discipline === "f1" ? `/${f1Key(race.name)}.png` : null) : null),
    [race, f1Circuit],
  );

  const wallet = Number(user?.wallet || 0);
  const error = stakeError(amount, wallet);
  const stake = error ? 0 : Number(amount);
  const driver = drivers.find((d) => String(d.id) === selectedDriver);
  const totalPool = Number(pool?.total_pool || 0);
  const selectionPool = Number(pool?.stats?.[selectedDriver]?.total_bet || 0);
  const estOdds = pool && driver && stake ? estimateOdds(totalPool, selectionPool, stake) : null;
  const oddsFor = pool ? (id) => Number(pool.stats?.[id]?.probable_odds) || null : undefined;

  const handlePlaceBet = async (e) => {
    e.preventDefault();
    if (!selectedDriver) return toast.warning(`Sélectionne un ${labels.participant.toLowerCase()} avant de valider.`);
    if (error) return toast.warning(error);

    try {
      setSubmitting(true);
      await apiClient.post("/bets/place", {
        race_id: parseInt(raceId),
        selection_id: parseInt(selectedDriver),
        amount: Number(amount),
      });

      // Le Layout écoute cet événement pour rafraîchir le solde et les paris en cours
      window.dispatchEvent(new Event("refreshDashboard"));
      toast.success(`Pari enregistré : ${formatApex(amount)} APEX sur ${driver?.name || "ta sélection"}.`);
      navigate(sport.routes.dashboard);
    } catch (err) {
      toast.error(formatApiError(err, "Erreur réseau, le pari n'a pas été enregistré."));
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <Layout rail={false}>
        <div className="page" aria-busy="true">
          <div className="skeleton" style={{ height: 168 }} />
          <div className="pb-layout">
            <div className="skeleton pb-skel-slip" />
            <div className="skeleton pb-skel-main" />
          </div>
        </div>
      </Layout>
    );
  }

  if (loadError || !race) {
    return (
      <Layout rail={false}>
        <div className="page">
          <EmptyState
            icon="flag"
            title="Course introuvable"
            action={<button className="btn btn-primary" onClick={() => navigate(sport.routes.calendar)}>Retour au calendrier</button>}
          >
            Cette course n'existe pas ou n'est plus disponible pour les paris.
          </EmptyState>
        </div>
      </Layout>
    );
  }

  const market = marketState(race, now);
  const circuit = race.circuit;
  const place = [circuit?.city, circuit?.country].filter(Boolean).join(", ");
  const showImage = view?.image && !imageFailed;
  const stats = (view?.stats || []).filter((s) => s.value !== "—" && s.value != null);
  const closedText = {
    finished: `Cette course est terminée${race.winner_name ? ` : victoire de ${race.winner_name}` : ""}. Les paris sont clos.`,
    closed: "La direction de course a fermé les paris pour cette épreuve.",
    started: "Le départ est donné : les paris ne sont plus acceptés.",
  }[market.reason];

  return (
    <Layout rail={false}>
      <div className="page pb">
        <Link to={sport.routes.calendar} className="pb-back">
          <Icon name="chevronRight" size={16} className="pb-back-icon" />
          Calendrier {sport.name}
        </Link>

        {/* En-tête de l'épreuve */}
        <header className="card pb-hero">
          <div className="pb-hero-main">
            <div className="pb-hero-badges">
              <span className="badge badge-sport">{sport.short}</span>
              <span className="pb-hero-kicker">{labels.event}{race.round ? ` · manche ${race.round}` : ""} · {race.year}</span>
            </div>
            <h1 className="page-title pb-title">{race.name}</h1>
            <ul className="pb-hero-meta">
              {(circuit?.name || place) && (
                <li><Icon name="mapPin" size={16} /><span><strong>{circuit?.name}</strong>{circuit?.name && place ? " · " : ""}{place}</span></li>
              )}
              <li><Icon name="calendar" size={16} /><span className="num">{formatDateTime(race.start_datetime)}</span><span className="muted">(heure locale)</span></li>
            </ul>
          </div>

          <div className="pb-hero-side">
            <span className={`badge ${market.badge}`}>
              {market.open && <span className="pb-dot" aria-hidden />}
              {market.label}
            </span>
            {race.status === "finished" ? (
              <div className="stat pb-hero-stat">
                <span className="stat-label">Vainqueur</span>
                <span className="pb-hero-value">{race.winner_name || "Résultat à venir"}</span>
              </div>
            ) : (
              <div className="stat pb-hero-stat">
                <span className="stat-label">Départ</span>
                <span className="pb-hero-value num" aria-live="polite">{countdown(race.start_datetime)}</span>
              </div>
            )}
          </div>
        </header>

        <div className="pb-layout">
          {/* Bulletin de pari */}
          <aside className="pb-slip-col" aria-label="Bulletin de pari">
            <form className="card card-flush pb-slip" onSubmit={handlePlaceBet} noValidate>
              <div className="card-head">
                <span className="card-title"><Icon name="ticket" size={16} />Ton pari</span>
                <span className="badge">Vainqueur</span>
              </div>

              <div className="pb-slip-body">
                {!market.open && (
                  <div className="alert alert-warning" role="status">
                    <Icon name="lock" size={16} />
                    <div className="pb-closed">
                      <span>{closedText}</span>
                      <Link to={sport.routes.calendar} className="btn-link">Voir les prochaines courses <Icon name="arrowRight" size={14} /></Link>
                    </div>
                  </div>
                )}

                {drivers.length === 0 ? (
                  <EmptyState icon="users" title="Aucun engagé">La liste des {labels.participants.toLowerCase()} n'est pas encore publiée.</EmptyState>
                ) : (
                  <ParticipantPicker
                    items={drivers}
                    value={selectedDriver}
                    onChange={setSelectedDriver}
                    legend={`${labels.participant} vainqueur · ${drivers.length} engagés`}
                    searchPlaceholder={`Rechercher un ${labels.participant.toLowerCase()} ou une ${labels.team.toLowerCase()}`}
                    oddsFor={oddsFor}
                    disabled={!market.open || submitting}
                  />
                )}

                <AmountField
                  id="pb-amount"
                  value={amount}
                  onChange={setAmount}
                  wallet={wallet}
                  error={market.open ? error : null}
                  disabled={!market.open || submitting}
                />

                <div className="slip-summary" aria-live="polite">
                  <div className="kv"><span>Sélection</span><strong className="truncate">{driver?.name || "—"}</strong></div>
                  <div className="kv"><span>Mise</span><strong>{stake ? `${formatApex(stake)} APEX` : "—"}</strong></div>
                  {pool && <div className="kv"><span>Cagnotte actuelle</span><strong>{formatApex(totalPool)} APEX</strong></div>}
                  {pool && <div className="kv"><span>Cote estimée</span><strong>{estOdds ? formatOdds(estOdds) : "—"}</strong></div>}
                  <hr className="divider" />
                  <div className="slip-total">
                    <span className="slip-total-label">Gain estimé</span>
                    <span className="slip-total-value">{estOdds ? formatApex(stake * estOdds) : "—"}<small>APEX</small></span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!market.open || submitting || !selectedDriver || !!error}>
                  {submitting ? (
                    <><span className="btn-spinner" aria-hidden />Enregistrement…</>
                  ) : !market.open ? (
                    <><Icon name="lock" size={16} />Paris fermés</>
                  ) : !selectedDriver ? (
                    `Choisis un ${labels.participant.toLowerCase()}`
                  ) : (
                    <>Valider le pari{stake ? ` · ${formatApex(stake)} APEX` : ""}</>
                  )}
                </button>

                <p className="slip-rule">
                  <Icon name="info" size={14} />
                  <span>
                    Pari mutuel : cote = cagnotte totale ÷ mises sur ton {labels.participant.toLowerCase()}. Elle évolue jusqu'au départ
                    selon les mises de tous les joueurs. Pari annulable tant que le marché est ouvert.
                  </span>
                </p>
              </div>
            </form>
          </aside>

          {/* Fiche circuit */}
          <div className="pb-main">
            <section className="card card-flush pb-circuit" aria-labelledby="pb-circuit-title">
              <div className="card-head">
                <div className="pb-circuit-head">
                  <h2 id="pb-circuit-title" className="card-title">Le circuit</h2>
                  {circuit?.name && <span className="card-subtitle">{circuit.name}</span>}
                </div>
                {view && !showImage && <span className="badge">Schéma</span>}
              </div>

              {view ? (
                <>
                  <div className={`pb-track ${showImage ? "" : "is-schematic"}`}>
                    {showImage ? (
                      <img src={view.image} alt={`Tracé du circuit ${circuit?.name || race.name}`} className="pb-track-img" onError={() => setImageFailed(true)} />
                    ) : (
                      <TrackSchematic schematic={view.schematic} />
                    )}
                  </div>

                  {(stats.length > 0 || view.highlight) && (
                    <dl className="pb-stats">
                      {stats.map((s) => (
                        <div key={s.label} className={`pb-stat ${s.wide ? "is-wide" : ""}`}>
                          <dt className="stat-label">{s.label}</dt>
                          <dd className="pb-stat-value num">{s.value}</dd>
                          {s.sub && <dd className="pb-stat-sub">{s.sub}</dd>}
                        </div>
                      ))}
                      {view.highlight && (
                        <div className="pb-stat is-accent">
                          <dt className="stat-label">{view.highlight.label}</dt>
                          <dd className="pb-stat-value">{view.highlight.value}</dd>
                          {view.highlight.sub && <dd className="pb-stat-sub">{view.highlight.sub}</dd>}
                        </div>
                      )}
                    </dl>
                  )}

                  {view.sections.length > 0 ? (
                    <div className="pb-sections">
                      {view.sections.map((s) => (
                        <section key={s.title} className="pb-section">
                          <h3 className="pb-section-title">{s.title}</h3>
                          <p>{s.text}</p>
                        </section>
                      ))}
                    </div>
                  ) : view.partial && (
                    <p className="pb-partial muted">La fiche détaillée de ce circuit n'est pas encore rédigée.</p>
                  )}
                </>
              ) : (
                <div className="pb-circuit-empty">
                  <EmptyState icon="mapPin" title="Fiche circuit indisponible">
                    Les données de ce circuit ne sont pas fournies par l'API officielle.
                  </EmptyState>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
