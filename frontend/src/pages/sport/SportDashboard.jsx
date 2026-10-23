import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import apiClient from "../../services/apiClient";
import { formatApiError } from "../../services/apiError";
import { countdown, formatApex, formatDay, formatTime } from "../../utils/format";
import { f1ResultsPath, formatPoints, orderRaces, placeOf, splitCountdown, teamColor, useNow } from "./sportFormat";
import { DateBlock, ErrorAlert, SkeletonRows } from "./SportBits";
import TrackSchematic from "../../components/circuit/TrackSchematic";
import { CIRCUIT_DETAILS } from "../../data/circuitData";
import "./sport.css";

// Résultat d'un appel : { data, error } ; data reste null pendant le chargement.
const settle = (res, fallback) =>
  res.status === "fulfilled" ? { data: res.value.data, error: null } : { data: null, error: formatApiError(res.reason, fallback) };

function useSportData(slug) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    Promise.allSettled([
      apiClient.get(`/races/?discipline=${slug}`),
      apiClient.get(`/drivers/?discipline=${slug}`),
      apiClient.get(`/standings/${slug}`),
      apiClient.get("/bets/my_bets"),
    ]).then(([races, drivers, standings, bets]) => {
      if (!alive) return;
      setState({
        loading: false,
        races: settle(races, "Le calendrier est indisponible pour le moment."),
        drivers: settle(drivers, "La liste des engagés est indisponible."),
        standings: settle(standings, "Le classement officiel est momentanément indisponible."),
        bets: settle(bets, "Impossible de charger tes paris."),
      });
    });
    return () => { alive = false; };
  }, [slug]);
  return state;
}

function Countdown({ iso }) {
  const now = useNow(1000);
  const t = splitCountdown(iso, now);
  if (t.done) return <span className="badge badge-live">Course en cours</span>;
  const parts = [["j", t.days], ["h", t.hours], ["min", t.minutes], ["s", t.seconds]];
  return (
    <div className="countdown" role="timer" aria-label={`Départ ${countdown(iso)}`}>
      {parts.map(([unit, value]) => (
        <span key={unit} className="countdown-part">
          <span className="countdown-value num">{String(value).padStart(2, "0")}</span>
          <span className="countdown-unit">{unit}</span>
        </span>
      ))}
    </div>
  );
}

// Image du tracé : fournie par l'API (MotoGP, NASCAR) ou fiche F1 locale (public/<grand_prix>.png)
const f1Image = (name) => CIRCUIT_DETAILS[name.toLowerCase().replace(/ grand prix/g, "").trim().replace(/\s+/g, "_")]?.image;

function NextEventHero({ race, discipline, entrants }) {
  const { circuit } = race;
  const [imageFailed, setImageFailed] = useState(false);
  const image = circuit?.image_url || (race.discipline === "f1" ? f1Image(race.name) : null);
  const facts = [
    circuit?.length_km && { label: "Longueur", value: `${Number(circuit.length_km).toLocaleString("fr-FR")} km` },
    circuit?.turns && { label: "Virages", value: circuit.turns },
    entrants > 0 && { label: "Engagés", value: entrants },
  ].filter(Boolean);

  return (
    <article className="next-hero card">
      <div className="next-hero-body">
        <div className="next-hero-tags">
          <span className="badge badge-sport">Manche {race.round}</span>
          <span className="next-hero-kicker">Prochain {discipline.labels.event.toLowerCase()}</span>
        </div>
        <h2 className="next-hero-name">{race.name}</h2>
        <ul className="next-hero-meta">
          {circuit?.name && (
            <li><Icon name="mapPin" size={16} /><span><strong>{circuit.name}</strong>{placeOf(circuit) && <span className="muted"> · {placeOf(circuit)}</span>}</span></li>
          )}
          <li><Icon name="calendar" size={16} /><span className="capitalize">{formatDay(race.start_datetime)}</span><span className="muted">à {formatTime(race.start_datetime)}</span></li>
        </ul>

        <div className="next-hero-countdown">
          <span className="stat-label">Départ dans</span>
          <Countdown iso={race.start_datetime} />
        </div>

        <div className="next-hero-actions">
          <Link to={`/place-bet/${race.id}`} className="btn btn-primary btn-lg">
            Parier sur cette course <Icon name="arrowRight" size={16} />
          </Link>
          {entrants > 0 && <span className="muted next-hero-entrants"><Icon name="users" size={16} />{entrants} {discipline.labels.participants.toLowerCase()} au départ</span>}
        </div>
      </div>

      <div className="next-hero-visual">
        {image && !imageFailed ? (
          <img src={image} alt={`Tracé du circuit ${circuit?.name || race.name}`} className="next-hero-track" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <TrackSchematic schematic={{ type: race.discipline === "nascar" ? circuit?.details?.type : "road course", description: circuit?.description }} />
        )}
        {facts.length > 0 && (
          <dl className="next-hero-facts">
            {facts.map((f) => (
              <div key={f.label}><dt>{f.label}</dt><dd className="num">{f.value}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

export default function SportDashboard({ discipline }) {
  const { labels } = discipline;
  const data = useSportData(discipline.slug);
  const { loading } = data;

  const races = useMemo(() => orderRaces(data.races?.data || []), [data.races]);
  const upcoming = races.filter((r) => r.status !== "finished");
  const nextRace = upcoming.find((r) => r.is_open) || upcoming[0];
  const finished = races.filter((r) => r.status === "finished");
  const lastResults = finished.slice(-3).reverse();
  const year = races[0]?.year || new Date().getFullYear();

  const drivers = data.drivers?.data || [];
  const standings = data.standings?.data;
  const leader = standings?.drivers?.[0];
  const myPending = (data.bets?.data || []).filter((b) => b.discipline === discipline.slug && b.status === "pending");
  const staked = myPending.reduce((s, b) => s + Number(b.amount || 0), 0);

  const popular = [...drivers].filter((d) => d.total_invested > 0).sort((a, b) => b.total_invested - a.total_invested).slice(0, 5);
  const totalInvested = drivers.reduce((s, d) => s + Number(d.total_invested || 0), 0);

  return (
    <Layout>
      <div className="page sport">
        <PageHeader
          eyebrow={`${discipline.name} · Saison ${year}`}
          title={discipline.name}
          subtitle={discipline.tagline}
          actions={<Link to={discipline.routes.calendar} className="btn btn-secondary"><Icon name="calendar" size={16} />Calendrier complet</Link>}
        />

        {data.races?.error && <ErrorAlert>{data.races.error}</ErrorAlert>}

        {/* Prochain rendez-vous */}
        {loading ? (
          <div className="skeleton" style={{ height: 320 }} />
        ) : nextRace ? (
          <NextEventHero race={nextRace} discipline={discipline} entrants={drivers.length} />
        ) : !data.races?.error && (
          <EmptyState icon="flag" title="Saison terminée" action={<Link to={discipline.routes.standings} className="btn btn-secondary">Voir le classement final</Link>}>
            Toutes les courses de la saison ont été disputées. Le calendrier de la saison suivante apparaîtra dès sa publication.
          </EmptyState>
        )}

        {/* Chiffres clés */}
        <div className="grid grid-3">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 128 }} />)
          ) : (
            <>
              <div className="card stat-card">
                <span className="stat-label">Avancement de la saison</span>
                <span className="stat-value num">{finished.length}<small>/ {races.length} {labels.events.toLowerCase()}</small></span>
                <div className="progress" aria-hidden><span style={{ width: `${(finished.length / Math.max(1, races.length)) * 100}%` }} /></div>
                <span className="stat-hint">{upcoming.length > 0 ? `${upcoming.length} restant${upcoming.length > 1 ? "s" : ""}` : "Saison terminée"}</span>
              </div>

              <div className="card stat-card">
                <span className="stat-label">Mes paris en cours · {discipline.short}</span>
                <span className="stat-value num">{myPending.length}</span>
                <span className="stat-hint">{myPending.length > 0 ? `${formatApex(staked)} APEX engagés` : "Aucune mise en attente sur ce championnat"}</span>
                <Link to={discipline.routes.history} className="btn-link stat-card-link">Mes paris <Icon name="chevronRight" size={14} /></Link>
              </div>

              <div className="card stat-card">
                <span className="stat-label">Leader du championnat</span>
                {leader ? (
                  <>
                    <span className="stat-leader"><span className="team-bar" style={{ "--team": teamColor(leader.team) }} />{leader.name}</span>
                    <span className="stat-hint"><span className="num strong">{formatPoints(leader.points)} pts</span> · {leader.team}</span>
                    {standings.drivers[1] && (
                      <span className="stat-hint muted">{formatPoints(leader.points - standings.drivers[1].points)} pts d'avance sur {standings.drivers[1].name}</span>
                    )}
                  </>
                ) : (
                  <span className="stat-hint muted">{data.standings?.error || "Classement pas encore publié."}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Calendrier proche + résultats */}
        <div className="sport-cols">
          <section className="card card-flush">
            <div className="card-head">
              <h2 className="card-title">Prochaines courses</h2>
              <Link to={discipline.routes.calendar} className="btn-link">Calendrier <Icon name="chevronRight" size={14} /></Link>
            </div>
            {loading ? <div className="card-pad"><SkeletonRows count={4} /></div> : upcoming.length === 0 ? (
              <div className="card-pad"><EmptyState icon="calendar" title="Aucune course à venir">La saison est terminée pour ce championnat.</EmptyState></div>
            ) : (
              <ul className="event-list">
                {upcoming.slice(0, 4).map((race) => (
                  <li key={race.id} className="event-row">
                    <DateBlock iso={race.start_datetime} />
                    <div className="event-row-main">
                      <span className="event-row-name">{race.name}</span>
                      <span className="event-row-sub">Manche {race.round}{placeOf(race.circuit) && ` · ${placeOf(race.circuit)}`}</span>
                    </div>
                    <div className="event-row-side">
                      {race.is_open ? (
                        <Link to={`/place-bet/${race.id}`} className="btn btn-secondary btn-sm" aria-label={`Parier sur ${race.name}`}>Parier</Link>
                      ) : (
                        <span className="badge badge-warning">Marché fermé</span>
                      )}
                      <span className="event-row-when">{countdown(race.start_datetime)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card card-flush">
            <div className="card-head">
              <h2 className="card-title">Derniers résultats</h2>
              <Link to={discipline.routes.calendar} className="btn-link">Tous les résultats <Icon name="chevronRight" size={14} /></Link>
            </div>
            {loading ? <div className="card-pad"><SkeletonRows count={3} /></div> : lastResults.length === 0 ? (
              <div className="card-pad"><EmptyState icon="flag" title="Aucune course disputée">Les vainqueurs apparaîtront ici après la première course.</EmptyState></div>
            ) : (
              <ul className="event-list">
                {lastResults.map((race) => {
                  const inner = (
                    <>
                      <DateBlock iso={race.start_datetime} />
                      <div className="event-row-main">
                        <span className="event-row-name">{race.name}</span>
                        <span className="event-row-winner">
                          <Icon name="trophy" size={14} />
                          {race.winner_name ? <strong>{race.winner_name}</strong> : <span className="muted">Résultat en attente</span>}
                        </span>
                      </div>
                      {discipline.slug === "f1" && <Icon name="chevronRight" size={16} className="event-row-chevron" />}
                    </>
                  );
                  return (
                    <li key={race.id}>
                      {discipline.slug === "f1" ? (
                        <Link to={f1ResultsPath(race)} className="event-row event-row-link" aria-label={`Résultats : ${race.name}`}>{inner}</Link>
                      ) : (
                        <div className="event-row">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Classement officiel + popularité */}
        <div className="sport-cols">
          <section className="card card-flush">
            <div className="card-head">
              <h2 className="card-title">Classement {labels.participants.toLowerCase()}</h2>
              <Link to={discipline.routes.standings} className="btn-link">Classements <Icon name="chevronRight" size={14} /></Link>
            </div>
            {loading ? <div className="card-pad"><SkeletonRows count={5} height={40} /></div> : data.standings?.error ? (
              <div className="card-pad"><ErrorAlert>{data.standings.error}</ErrorAlert></div>
            ) : !standings?.drivers?.length ? (
              <div className="card-pad"><EmptyState icon="trophy" title="Classement pas encore publié">Il apparaîtra après la première course de la saison.</EmptyState></div>
            ) : (
              <div className="table-wrap">
                <table className="table table-compact">
                  <thead><tr><th scope="col">Pos.</th><th scope="col">{labels.participant}</th><th scope="col" className="num">Points</th></tr></thead>
                  <tbody>
                    {standings.drivers.slice(0, 5).map((d) => (
                      <tr key={`${d.position}-${d.name}`}>
                        <td><span className={`pos ${d.position <= 3 ? `pos-${d.position}` : ""}`}>{d.position}</span></td>
                        <td>
                          <span className="driver-cell">
                            <span className="team-bar" style={{ "--team": teamColor(d.team) }} />
                            <span className="driver-cell-text"><span className="strong">{d.name}</span><span className="muted">{d.team}</span></span>
                          </span>
                        </td>
                        <td className="num strong">{formatPoints(d.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card card-flush">
            <div className="card-head">
              <h2 className="card-title">{labels.participants} les plus soutenus</h2>
              <span className="card-subtitle">Mises des joueurs GridBook</span>
            </div>
            {loading ? <div className="card-pad"><SkeletonRows count={5} height={40} /></div> : data.drivers?.error ? (
              <div className="card-pad"><ErrorAlert>{data.drivers.error}</ErrorAlert></div>
            ) : popular.length === 0 ? (
              <div className="card-pad">
                <EmptyState
                  icon="chart"
                  title="Aucune mise pour l'instant"
                  action={nextRace?.is_open && <Link to={`/place-bet/${nextRace.id}`} className="btn btn-secondary btn-sm">Placer le premier pari</Link>}
                >
                  Les {labels.participants.toLowerCase()} les plus joués par la communauté s'afficheront ici.
                </EmptyState>
              </div>
            ) : (
              <ol className="pop-list">
                {popular.map((d, i) => {
                  const share = (d.total_invested / Math.max(1, totalInvested)) * 100;
                  return (
                    <li key={d.id} className="pop-row">
                      <span className="pop-rank num">{i + 1}</span>
                      <div className="pop-main">
                        <div className="pop-line">
                          <span className="strong truncate">{d.name}</span>
                          <span className="num pop-amount">{formatApex(d.total_invested)} APEX</span>
                        </div>
                        <div className="pop-line">
                          <div className="progress pop-bar" aria-hidden><span style={{ width: `${share}%` }} /></div>
                          <span className="num muted pop-share">{Math.round(share)} %</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <p className="source-note">Données officielles : {discipline.source}.</p>
      </div>
    </Layout>
  );
}
