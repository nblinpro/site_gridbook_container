import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import apiClient from "../../services/apiClient";
import { getRace, getResults } from "../../services/f1Api";
import { formatDay, formatTime, toDate } from "../../utils/format";
import { raceState, teamColor } from "../sport/sportFormat";
import { ErrorAlert, SkeletonRows } from "../sport/SportBits";
import "../sport/sport.css";
import "./f1.css";

// Sessions du week-end telles que fournies par Ergast, dans l'ordre chronologique
const SESSIONS = [
  ["FirstPractice", "Essais libres 1"],
  ["SecondPractice", "Essais libres 2"],
  ["ThirdPractice", "Essais libres 3"],
  ["SprintQualifying", "Qualifications sprint"],
  ["SprintShootout", "Qualifications sprint"],
  ["Sprint", "Course sprint"],
  ["Qualifying", "Qualifications"],
];

const sessionDate = (s) => (s?.date ? `${s.date}T${s.time || "00:00:00Z"}` : null);

function weekend(race) {
  const list = SESSIONS.filter(([key]) => race[key]).map(([key, label]) => ({ key, label, iso: sessionDate(race[key]), hasTime: Boolean(race[key].time) }));
  list.push({ key: "Race", label: "Grand Prix", iso: sessionDate(race), hasTime: Boolean(race.time), main: true });
  return list.sort((a, b) => toDate(a.iso) - toDate(b.iso));
}

export default function RaceDetails() {
  const { season, round } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    Promise.allSettled([getRace(season, round), apiClient.get("/races/?discipline=f1")]).then(async ([r, db]) => {
      if (!alive) return;
      if (r.status === "rejected") {
        setState({ loading: false, error: "Les informations de ce Grand Prix sont indisponibles pour le moment." });
        return;
      }
      const race = r.value;
      const match = db.status === "fulfilled"
        ? db.value.data.find((x) => String(x.year) === String(season) && String(x.round) === String(round)) || null
        : null;
      const now = Date.now();
      let podium = [];
      if (race && toDate(sessionDate(race)) < now) {
        podium = await getResults(season, round).then((res) => res.slice(0, 3)).catch(() => []);
      }
      if (alive) setState({ loading: false, race, match, podium, now });
    });
    return () => { alive = false; };
  }, [season, round]);

  const { loading, error, race, match, podium = [], now } = state;
  const raceIso = race && sessionDate(race);
  const isPast = raceIso && toDate(raceIso) < now;
  const bet = match && raceState(match);
  const circuit = match?.circuit;

  const facts = race ? [
    ["Circuit", race.Circuit.circuitName],
    ["Ville", race.Circuit.Location.locality],
    ["Pays", race.Circuit.Location.country],
    circuit?.length_km && ["Longueur", `${Number(circuit.length_km).toLocaleString("fr-FR")} km`],
    circuit?.turns && ["Virages", circuit.turns],
  ].filter(Boolean) : [];

  return (
    <Layout>
      <div className="page sport">
        <Link to="/f1/calendar" className="btn-link back-link"><Icon name="chevronRight" size={14} className="flip" />Calendrier</Link>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 96 }} />
            <SkeletonRows count={4} height={64} />
          </>
        ) : error ? (
          <ErrorAlert>{error}</ErrorAlert>
        ) : !race ? (
          <EmptyState icon="flag" title="Grand Prix introuvable" action={<Link to="/f1/calendar" className="btn btn-secondary btn-sm">Retour au calendrier</Link>}>
            Aucune manche {round} n'existe pour la saison {season}.
          </EmptyState>
        ) : (
          <>
            <PageHeader
              eyebrow={`Formule 1 · Saison ${season} · Manche ${round}`}
              title={race.raceName}
              subtitle={`${race.Circuit.circuitName} · ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`}
              actions={
                <>
                  {isPast && <Link to={`/f1/${season}/race/${round}/results`} className="btn btn-secondary"><Icon name="flag" size={16} />Résultats</Link>}
                  {bet?.key === "open" && <Link to={`/place-bet/${match.id}`} className="btn btn-primary">Parier sur ce Grand Prix <Icon name="arrowRight" size={16} /></Link>}
                </>
              }
            >
              <div className="gp-badges">
                {bet ? <span className={`badge ${bet.badge}`}>{bet.label}</span> : <span className="badge">Hors calendrier GridBook</span>}
                <span className="badge"><Icon name="calendar" size={12} />{toDate(raceIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </PageHeader>

            <div className="gp-layout">
              <section className="card card-flush">
                <div className="card-head"><h2 className="card-title">Programme du week-end</h2><span className="card-subtitle">Heure locale</span></div>
                <ol className="session-list">
                  {weekend(race).map((s) => {
                    const past = toDate(s.iso) < now;
                    return (
                      <li key={s.key} className={`session-row ${s.main ? "is-main" : ""}`}>
                        <span className="session-name">{s.label}</span>
                        <span className="session-day capitalize">{formatDay(s.iso)}</span>
                        <span className="session-time num">{s.hasTime ? formatTime(s.iso) : "À confirmer"}</span>
                        <span className="session-state">{past ? <span className="badge">Terminé</span> : <span className="badge badge-info">À venir</span>}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <div className="gp-side">
                <section className="card">
                  <div className="card-head"><h2 className="card-title">Circuit</h2></div>
                  {circuit?.image_url && <img src={circuit.image_url} alt={`Tracé du circuit ${race.Circuit.circuitName}`} className="gp-track" loading="lazy" />}
                  <dl className="gp-facts">
                    {facts.map(([k, v]) => <div key={k} className="kv"><dt>{k}</dt><dd><strong>{v}</strong></dd></div>)}
                  </dl>
                </section>

                {podium.length > 0 && (
                  <section className="card card-flush">
                    <div className="card-head">
                      <h2 className="card-title">Podium</h2>
                      <Link to={`/f1/${season}/race/${round}/results`} className="btn-link">Classement complet <Icon name="chevronRight" size={14} /></Link>
                    </div>
                    <ol className="event-list">
                      {podium.map((p) => (
                        <li key={p.position} className="event-row">
                          <span className={`pos pos-${p.position}`}>{p.position}</span>
                          <span className="team-bar" style={{ "--team": teamColor(p.Constructor.name) }} />
                          <span className="event-row-main">
                            <span className="event-row-name">{p.Driver.givenName} {p.Driver.familyName}</span>
                            <span className="event-row-sub">{p.Constructor.name}</span>
                          </span>
                          <span className="num muted">{p.Time?.time || ""}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            </div>

            <p className="source-note">Données officielles : Jolpica (Ergast).</p>
          </>
        )}
      </div>
    </Layout>
  );
}
