import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import UserAvatar from "../components/cosmetics/UserAvatar";
import UserName from "../components/cosmetics/UserName";
import { useAuth } from "../auth/AuthContext";
import { useDiscipline } from "../components/discipline/DisciplineContext";
import { DISCIPLINES } from "../data/disciplines";
import apiClient from "../services/apiClient";
import { formatApiError } from "../services/apiError";
import { formatApex } from "../utils/format";
import { ErrorAlert, SkeletonRows } from "./sport/SportBits";
import "./sport/sport.css";
import "./leaderboard.css";

// Ordre d'affichage du podium sur grand écran : 2e, 1er, 3e
const PODIUM_ORDER = [2, 1, 3];

function PodiumCard({ player, rank, isMe }) {
  if (!player) {
    return (
      <div className={`lb-podium-card is-empty rank-${rank}`}>
        <span className={`pos pos-${rank}`}>{rank}</span>
        <span className="lb-podium-empty">Place libre</span>
      </div>
    );
  }
  return (
    <div className={`lb-podium-card rank-${rank} ${isMe ? "is-me" : ""}`}>
      <span className={`pos pos-${rank}`}>{rank}</span>
      <UserAvatar username={player.username} cosmetics={player.cosmetics} size={rank === 1 ? 80 : 72} glow={rank === 1} />
      <div className="lb-podium-id">
        <span className="lb-podium-name"><UserName name={player.username} cosmetics={player.cosmetics} />{isMe && <span className="badge badge-sport me-badge">Toi</span>}</span>
        {player.cosmetics?.title && <span className="ua-title">{player.cosmetics.title}</span>}
      </div>
      <span className="lb-podium-wallet num">{formatApex(player.wallet)} <small>APEX</small></span>
    </div>
  );
}

function MarketPopularity({ discipline, setDiscipline }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    apiClient.get(`/drivers/?discipline=${discipline.slug}`)
      .then((res) => alive && setState({ loading: false, drivers: res.data || [] }))
      .catch((err) => alive && setState({ loading: false, error: formatApiError(err, "La popularité du marché est indisponible.") }));
    return () => { alive = false; };
  }, [discipline.slug]);

  const drivers = (state.drivers || []).filter((d) => d.total_invested > 0).sort((a, b) => b.total_invested - a.total_invested);
  const total = drivers.reduce((s, d) => s + Number(d.total_invested), 0);

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2 className="section-title">Popularité du marché</h2>
          <p className="muted lb-section-sub">{discipline.labels.participants} les plus joués par la communauté, toutes courses confondues.</p>
        </div>
        <div className="segmented" role="group" aria-label="Championnat">
          {DISCIPLINES.map((d) => (
            <button key={d.slug} type="button" aria-pressed={d.slug === discipline.slug} onClick={() => setDiscipline(d.slug)}>{d.short}</button>
          ))}
        </div>
      </div>

      <div className="card card-flush">
        {state.loading ? <div className="card-pad"><SkeletonRows count={5} height={40} /></div>
          : state.error ? <div className="card-pad"><ErrorAlert>{state.error}</ErrorAlert></div>
          : drivers.length === 0 ? (
            <div className="card-pad">
              <EmptyState icon="chart" title="Aucune mise sur ce championnat" action={<Link to={discipline.routes.calendar} className="btn btn-secondary btn-sm">Voir les prochaines courses</Link>}>
                Dès que des joueurs auront parié en {discipline.name}, les {discipline.labels.participants.toLowerCase()} favoris apparaîtront ici.
              </EmptyState>
            </div>
          ) : (
            <ol className="pop-list lb-pop">
              {drivers.slice(0, 10).map((d, i) => {
                const share = (d.total_invested / Math.max(1, total)) * 100;
                return (
                  <li key={d.id} className="pop-row">
                    <span className="pop-rank num">{i + 1}</span>
                    <div className="pop-main">
                      <div className="pop-line">
                        <span className="truncate"><span className="strong">{d.name}</span>{d.team_name && <span className="muted"> · {d.team_name}</span>}</span>
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
      </div>
    </section>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { discipline, setDiscipline } = useDiscipline();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    apiClient.get("/auth/leaderboard")
      .then((res) => alive && setState({ loading: false, players: res.data || [] }))
      .catch((err) => alive && setState({ loading: false, error: formatApiError(err, "Le classement est indisponible pour le moment.") }));
    return () => { alive = false; };
  }, []);

  const players = state.players || [];
  const me = players.find((p) => p.username === user?.username);
  const byRank = (rank) => players.find((p) => p.rank === rank) || players[rank - 1];
  const rest = players.slice(3);
  const leaderWallet = players[0]?.wallet || 0;

  return (
    <Layout>
      <div className="page lb">
        <PageHeader
          eyebrow="Tous championnats"
          title="Classement général"
          subtitle="Les joueurs GridBook classés selon leur solde d'APEX. Gagne des paris pour grimper."
          actions={me && (
            <div className="lb-me card">
              <span className="stat-label">Ta position</span>
              <span className="lb-me-value"><span className="num">{me.rank}</span><small>/ {players.length}</small></span>
            </div>
          )}
        />

        {state.error && <ErrorAlert>{state.error}</ErrorAlert>}

        {state.loading ? (
          <>
            <div className="lb-podium">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 240 }} />)}</div>
            <SkeletonRows count={5} height={52} />
          </>
        ) : !state.error && players.length === 0 ? (
          <EmptyState icon="users" title="Aucun joueur classé">Le classement apparaîtra dès les premières inscriptions.</EmptyState>
        ) : !state.error && (
          <>
            <div className="lb-podium" aria-label="Podium">
              {PODIUM_ORDER.map((rank) => {
                const p = byRank(rank);
                return <PodiumCard key={rank} rank={rank} player={p} isMe={p && p.username === user?.username} />;
              })}
            </div>

            {rest.length > 0 && (
              <section className="card card-flush">
                <div className="table-wrap">
                  <table className="table standings-table">
                    <thead>
                      <tr>
                        <th scope="col">Rang</th>
                        <th scope="col">Joueur</th>
                        <th scope="col" className="num">Solde</th>
                        <th scope="col" className="num hide-sm">Écart au leader</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((p) => {
                        const isMe = p.username === user?.username;
                        return (
                          <tr key={p.username} className={isMe ? "is-me" : ""}>
                            <td><span className="pos">{p.rank}</span></td>
                            <td>
                              <span className="bettor-cell">
                                <UserAvatar username={p.username} cosmetics={p.cosmetics} size={32} />
                                <span className="driver-cell-text">
                                  <span className="strong"><UserName name={p.username} cosmetics={p.cosmetics} />{isMe && <span className="badge badge-sport me-badge">Toi</span>}</span>
                                  {p.cosmetics?.title && <span className="ua-title">{p.cosmetics.title}</span>}
                                </span>
                              </span>
                            </td>
                            <td className="num strong">{formatApex(p.wallet)} <span className="unit">APEX</span></td>
                            <td className="num muted hide-sm">−{formatApex(leaderWallet - p.wallet)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <MarketPopularity discipline={discipline} setDiscipline={setDiscipline} />

        <p className="source-note">Jeu sans argent réel : les APEX n'ont aucune valeur monétaire.</p>
      </div>
    </Layout>
  );
}
