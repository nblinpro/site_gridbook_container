import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import apiClient from "../../services/apiClient";
import { formatApiError } from "../../services/apiError";
import { countdown, formatDay, formatTime, toDate } from "../../utils/format";
import { f1DetailsPath, f1ResultsPath, orderRaces, placeOf, raceState } from "./sportFormat";
import { DateBlock, ErrorAlert, SkeletonRows } from "./SportBits";
import "./sport.css";

const FILTERS = [
  { key: "upcoming", label: "À venir" },
  { key: "finished", label: "Terminées" },
  { key: "all", label: "Toutes" },
];

const monthLabel = (iso) => toDate(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function groupByMonth(races) {
  const groups = [];
  races.forEach((race) => {
    const label = monthLabel(race.start_datetime);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.races.push(race);
    else groups.push({ label, races: [race] });
  });
  return groups;
}

function CalendarRow({ race, isNext, isF1, labels }) {
  const state = raceState(race);
  const finished = state.key === "finished";
  const place = placeOf(race.circuit);

  return (
    <li className={`cal-row ${isNext ? "is-next" : ""} ${finished ? "is-finished" : ""}`}>
      <span className="cal-round"><span className="cal-round-label">Manche</span><span className="num">{race.round}</span></span>
      <DateBlock iso={race.start_datetime} />

      <div className="cal-main">
        <div className="cal-title">
          {isF1 ? <Link to={f1DetailsPath(race)} className="cal-name">{race.name}</Link> : <span className="cal-name">{race.name}</span>}
          {isNext && <span className="badge badge-sport">Prochain {labels.event.toLowerCase()}</span>}
        </div>
        <span className="cal-sub">
          {race.circuit?.name && <span>{race.circuit.name}</span>}
          {place && <span className="muted">{place}</span>}
        </span>
        <span className="cal-when"><Icon name="clock" size={14} /><span className="capitalize">{formatDay(race.start_datetime)}</span> · {formatTime(race.start_datetime)}</span>
      </div>

      <div className="cal-status">
        <span className={`badge ${state.badge}`}>{state.label}</span>
        {finished ? (
          <span className="cal-winner">
            <Icon name="trophy" size={14} />
            {race.winner_name ? <strong>{race.winner_name}</strong> : <span className="muted">Résultat en attente</span>}
          </span>
        ) : (
          <span className="cal-countdown">{countdown(race.start_datetime)}</span>
        )}
      </div>

      <div className="cal-actions">
        {state.key === "open" && (
          <Link to={`/place-bet/${race.id}`} className="btn btn-primary btn-sm" aria-label={`Parier sur ${race.name}`}>
            Parier <Icon name="arrowRight" size={14} />
          </Link>
        )}
        {finished && isF1 && (
          <Link to={f1ResultsPath(race)} className="btn btn-secondary btn-sm" aria-label={`Résultats : ${race.name}`}>Résultats</Link>
        )}
      </div>
    </li>
  );
}

export default function SportCalendar({ discipline }) {
  const { labels } = discipline;
  const isF1 = discipline.slug === "f1";
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("upcoming");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    apiClient.get(`/races/?discipline=${discipline.slug}`)
      .then((res) => { if (alive) setRaces(orderRaces(res.data)); })
      .catch((err) => { if (alive) setError(formatApiError(err, "Le calendrier est indisponible pour le moment.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [discipline.slug]);

  const finishedCount = races.filter((r) => r.status === "finished").length;
  const nextId = races.find((r) => r.status !== "finished")?.id;

  const shown = useMemo(() => {
    if (filter === "upcoming") return races.filter((r) => r.status !== "finished");
    if (filter === "finished") return [...races.filter((r) => r.status === "finished")].reverse();
    return races;
  }, [races, filter]);
  const groups = useMemo(() => groupByMonth(shown), [shown]);

  const year = races[0]?.year || new Date().getFullYear();
  const counts = { upcoming: races.length - finishedCount, finished: finishedCount, all: races.length };

  return (
    <Layout>
      <div className="page sport">
        <PageHeader
          eyebrow={`${discipline.name} · Saison ${year}`}
          title="Calendrier"
          subtitle={loading || error ? `Tous les ${labels.events.toLowerCase()} de la saison.` : `${races.length} ${labels.events.toLowerCase()} · ${finishedCount} disputé${finishedCount > 1 ? "s" : ""} · ${counts.upcoming} à venir. Horaires affichés à ton heure locale.`}
        />

        <div className="segmented" role="group" aria-label="Filtrer les courses">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}{!loading && !error && <span className="segmented-count num">{counts[f.key]}</span>}
            </button>
          ))}
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {loading ? (
          <SkeletonRows count={6} height={84} />
        ) : !error && shown.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={filter === "upcoming" ? "Aucune course à venir" : "Aucune course disputée"}
            action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilter("all")}>Voir toute la saison</button>}
          >
            {filter === "upcoming" ? "La saison est terminée. Retrouve les vainqueurs dans l'onglet « Terminées »." : "Les résultats apparaîtront ici après la première course."}
          </EmptyState>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="cal-group" aria-label={g.label}>
              <h2 className="cal-month capitalize">{g.label}</h2>
              <ul className="cal-list card card-flush">
                {g.races.map((race) => (
                  <CalendarRow key={race.id} race={race} isNext={race.id === nextId} isF1={isF1} labels={labels} />
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="source-note">Données officielles : {discipline.source}. Mises à jour toutes les 6 heures.</p>
      </div>
    </Layout>
  );
}
