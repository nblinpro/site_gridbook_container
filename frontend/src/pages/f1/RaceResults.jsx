import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { getRace, getResults } from "../../services/f1Api";
import { toDate } from "../../utils/format";
import { formatPoints, teamColor } from "../sport/sportFormat";
import { ErrorAlert, SkeletonRows } from "../sport/SportBits";
import "../sport/sport.css";
import "./f1.css";

// Statut Ergast → libellé français (temps de course pour les classés)
function finishLabel(r, winnerLaps) {
  if (r.Time?.time) return r.Time.time;
  const status = r.status || "";
  const laps = status.match(/^\+(\d+) Laps?$/);
  if (laps) return `+${laps[1]} tour${laps[1] > 1 ? "s" : ""}`;
  if (status === "Lapped" || status === "Finished") {
    const behind = Number(winnerLaps) - Number(r.laps);
    return behind > 0 ? `+${behind} tour${behind > 1 ? "s" : ""}` : "Classé";
  }
  if (/disqualif/i.test(status)) return "Disqualifié";
  if (/did not start|withdrew/i.test(status)) return "Non partant";
  return "Abandon";
}

const isClassified = (r) => /^\d+$/.test(r.positionText);

function PositionDelta({ grid, position }) {
  const start = Number(grid);
  if (!start) return <span className="delta muted" title="Départ des stands">Stands</span>;
  const diff = start - Number(position);
  if (diff === 0) return <span className="delta muted">=</span>;
  return (
    <span className={`delta ${diff > 0 ? "up" : "down"}`} title={`${Math.abs(diff)} place${Math.abs(diff) > 1 ? "s" : ""} ${diff > 0 ? "gagnée" : "perdue"}${Math.abs(diff) > 1 ? "s" : ""}`}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}
    </span>
  );
}

export default function RaceResults() {
  const { season, round } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    Promise.all([getRace(season, round), getResults(season, round)])
      .then(([race, results]) => { if (alive) setState({ loading: false, race, results }); })
      .catch(() => { if (alive) setState({ loading: false, error: "Les résultats officiels sont indisponibles pour le moment. Réessaie dans quelques minutes." }); });
    return () => { alive = false; };
  }, [season, round]);

  const { loading, error, race, results = [] } = state;
  const winnerLaps = results[0]?.laps;
  const podium = results.slice(0, 3);
  const fastest = results.find((r) => r.FastestLap?.rank === "1");
  const dateLabel = race && toDate(`${race.date}T${race.time || "00:00:00Z"}`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Layout>
      <div className="page sport">
        <Link to="/f1/calendar" className="btn-link back-link"><Icon name="chevronRight" size={14} className="flip" />Calendrier</Link>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 96 }} />
            <div className="grid grid-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>
            <SkeletonRows count={8} height={44} />
          </>
        ) : error ? (
          <ErrorAlert>{error}</ErrorAlert>
        ) : (
          <>
            <PageHeader
              eyebrow={`Formule 1 · Saison ${season} · Manche ${round}`}
              title={race?.raceName || `Manche ${round}`}
              subtitle={race ? `Résultats officiels · ${race.Circuit.circuitName}, ${race.Circuit.Location.locality} · ${dateLabel}` : "Résultats officiels"}
              actions={race && <Link to={`/f1/${season}/race/${round}`} className="btn btn-secondary"><Icon name="info" size={16} />Détails du Grand Prix</Link>}
            />

            {results.length === 0 ? (
              <EmptyState icon="flag" title="Résultats pas encore publiés" action={<Link to="/f1/calendar" className="btn btn-secondary btn-sm">Retour au calendrier</Link>}>
                Le classement officiel est publié quelques minutes après l'arrivée de la course.
              </EmptyState>
            ) : (
              <>
                <div className="results-podium">
                  {podium.map((r) => (
                    <div key={r.position} className={`card podium-card podium-${r.position}`} style={{ "--team": teamColor(r.Constructor.name) }}>
                      <div className="podium-card-head">
                        <span className={`pos pos-${r.position}`}>{r.position}</span>
                        <span className="podium-number num">{r.number}</span>
                      </div>
                      <div className="podium-driver">
                        <span className="podium-first">{r.Driver.givenName}</span>
                        <span className="podium-last">{r.Driver.familyName}</span>
                      </div>
                      <div className="podium-meta">
                        <span><span className="team-bar" />{r.Constructor.name}</span>
                        <span className="num strong">{finishLabel(r, winnerLaps)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="card card-flush">
                  <div className="card-head">
                    <h2 className="card-title">Classement de la course</h2>
                    {fastest && (
                      <span className="fastest-lap"><Icon name="clock" size={14} />Meilleur tour : <strong>{fastest.Driver.familyName}</strong> <span className="num">{fastest.FastestLap.Time?.time}</span></span>
                    )}
                  </div>
                  <div className="table-wrap">
                    <table className="table results-table">
                      <thead>
                        <tr>
                          <th scope="col">Pos.</th>
                          <th scope="col">Pilote</th>
                          <th scope="col" className="hide-sm">Écurie</th>
                          <th scope="col" className="num">Grille</th>
                          <th scope="col" className="num hide-sm">Tours</th>
                          <th scope="col" className="num">Temps / écart</th>
                          <th scope="col" className="num">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => {
                          const classified = isClassified(r);
                          return (
                            <tr key={r.Driver.driverId} className={classified ? "" : "is-out"}>
                              <td>{classified ? <span className={`pos ${Number(r.position) <= 3 ? `pos-${r.position}` : ""}`}>{r.position}</span> : <span className="pos pos-out" title={r.status}>{r.positionText === "D" ? "DQ" : "Ab."}</span>}</td>
                              <td>
                                <span className="driver-cell">
                                  <span className="team-bar" style={{ "--team": teamColor(r.Constructor.name) }} />
                                  <span className="driver-cell-text">
                                    <span className="result-driver">
                                      <span className="result-number num">{r.number}</span>
                                      <span>{r.Driver.givenName} <strong>{r.Driver.familyName}</strong></span>
                                      {r.FastestLap?.rank === "1" && <span className="badge badge-info" title={`Meilleur tour : ${r.FastestLap.Time?.time}`}>Meilleur tour</span>}
                                    </span>
                                    <span className="muted show-sm">{r.Constructor.name}</span>
                                  </span>
                                </span>
                              </td>
                              <td className="hide-sm">{r.Constructor.name}</td>
                              <td className="num">
                                <span className="grid-cell">{Number(r.grid) || "—"}{classified && <PositionDelta grid={r.grid} position={r.position} />}</span>
                              </td>
                              <td className="num hide-sm">{r.laps}</td>
                              <td className="num">{finishLabel(r, winnerLaps)}</td>
                              <td className="num strong">{Number(r.points) > 0 ? formatPoints(r.points) : <span className="muted">0</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            <p className="source-note">Données officielles : Jolpica (Ergast). Temps du vainqueur, puis écart à l'arrivée.</p>
          </>
        )}
      </div>
    </Layout>
  );
}
