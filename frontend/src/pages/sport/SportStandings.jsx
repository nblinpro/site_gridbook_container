import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import UserAvatar from "../../components/cosmetics/UserAvatar";
import UserName from "../../components/cosmetics/UserName";
import { useAuth } from "../../auth/AuthContext";
import apiClient from "../../services/apiClient";
import { formatApiError } from "../../services/apiError";
import { formatApex } from "../../utils/format";
import { formatPoints, teamColor } from "./sportFormat";
import { ErrorAlert, SkeletonRows } from "./SportBits";
import "./sport.css";

const Pos = ({ n }) => <span className={`pos ${n <= 3 ? `pos-${n}` : ""}`}>{n ?? "–"}</span>;

const gap = (leaderPts, pts) => {
  const diff = Number(leaderPts) - Number(pts);
  return diff > 0 ? `−${formatPoints(diff)}` : "—";
};

function DriversTable({ rows, labels }) {
  const leader = rows[0]?.points;
  return (
    <div className="table-wrap">
      <table className="table standings-table">
        <thead>
          <tr>
            <th scope="col">Pos.</th>
            <th scope="col">{labels.participant}</th>
            <th scope="col" className="hide-sm">{labels.team}</th>
            <th scope="col" className="num">Victoires</th>
            <th scope="col" className="num">Points</th>
            <th scope="col" className="num hide-sm">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={`${d.position}-${d.name}`}>
              <td><Pos n={d.position} /></td>
              <td>
                <span className="driver-cell">
                  <span className="team-bar" style={{ "--team": teamColor(d.team) }} />
                  <span className="driver-cell-text">
                    <span className="strong">{d.name}</span>
                    <span className="muted show-sm">{d.team}</span>
                  </span>
                </span>
              </td>
              <td className="hide-sm">{d.team}</td>
              <td className="num">{d.wins ?? "—"}</td>
              <td className="num strong">{formatPoints(d.points)}</td>
              <td className="num muted hide-sm">{gap(leader, d.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamsTable({ rows, labels }) {
  const leader = rows[0]?.points;
  const hasWins = rows.some((t) => t.wins != null);
  return (
    <div className="table-wrap">
      <table className="table standings-table">
        <thead>
          <tr>
            <th scope="col">Pos.</th>
            <th scope="col">{labels.team}</th>
            {hasWins && <th scope="col" className="num">Victoires</th>}
            <th scope="col" className="num">Points</th>
            <th scope="col" className="num">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.name}>
              <td><Pos n={t.position} /></td>
              <td><span className="driver-cell"><span className="team-bar" style={{ "--team": teamColor(t.name) }} /><span className="strong">{t.name}</span></span></td>
              {hasWins && <td className="num">{t.wins ?? "—"}</td>}
              <td className="num strong">{formatPoints(t.points)}</td>
              <td className="num muted">{gap(leader, t.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BettorsTable({ rows, me }) {
  const leader = rows[0]?.wallet;
  return (
    <div className="table-wrap">
      <table className="table standings-table">
        <thead>
          <tr>
            <th scope="col">Rang</th>
            <th scope="col">Parieur</th>
            <th scope="col" className="num">Solde</th>
            <th scope="col" className="num hide-sm">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const isMe = u.username === me;
            return (
              <tr key={u.rank} className={isMe ? "is-me" : ""}>
                <td><Pos n={u.rank} /></td>
                <td>
                  <span className="bettor-cell">
                    <UserAvatar username={u.username} cosmetics={u.cosmetics} size={32} />
                    <span className="driver-cell-text">
                      <span className="strong"><UserName name={u.username} cosmetics={u.cosmetics} />{isMe && <span className="badge badge-sport me-badge">Toi</span>}</span>
                      {u.cosmetics?.title && <span className="ua-title">{u.cosmetics.title}</span>}
                    </span>
                  </span>
                </td>
                <td className="num strong">{formatApex(u.wallet)} <span className="unit">APEX</span></td>
                <td className="num muted hide-sm">{Number(leader) - Number(u.wallet) > 0 ? `−${formatApex(Number(leader) - Number(u.wallet))}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SportStandings({ discipline }) {
  const { labels } = discipline;
  const { user } = useAuth();
  const [tab, setTab] = useState("drivers");
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    Promise.allSettled([apiClient.get(`/standings/${discipline.slug}`), apiClient.get("/auth/leaderboard")]).then(([s, b]) => {
      if (!alive) return;
      setState({
        loading: false,
        standings: s.status === "fulfilled" ? s.value.data : null,
        standingsError: s.status === "rejected" ? formatApiError(s.reason, "Le classement officiel est momentanément indisponible. Réessaie dans quelques minutes.") : null,
        bettors: b.status === "fulfilled" ? b.value.data : [],
        bettorsError: b.status === "rejected" ? formatApiError(b.reason, "Le classement des parieurs est indisponible.") : null,
      });
    });
    return () => { alive = false; };
  }, [discipline.slug]);

  const { loading, standings } = state;
  const tabs = [
    { key: "drivers", label: labels.participants },
    { key: "teams", label: labels.teams },
    { key: "bettors", label: "Parieurs GridBook" },
  ];
  const season = standings?.season || new Date().getFullYear();

  let content;
  if (loading) content = <div className="card-pad"><SkeletonRows count={8} height={44} /></div>;
  else if (tab === "bettors") {
    content = state.bettorsError ? <div className="card-pad"><ErrorAlert>{state.bettorsError}</ErrorAlert></div>
      : state.bettors.length === 0 ? <div className="card-pad"><EmptyState icon="users" title="Aucun parieur classé">Le classement se remplit dès qu'un joueur a un compte actif.</EmptyState></div>
      : <BettorsTable rows={state.bettors} me={user?.username} />;
  } else if (state.standingsError) {
    content = <div className="card-pad"><ErrorAlert>{state.standingsError}</ErrorAlert></div>;
  } else {
    const rows = tab === "drivers" ? standings?.drivers || [] : standings?.teams || [];
    content = rows.length === 0
      ? <div className="card-pad"><EmptyState icon="trophy" title="Classement pas encore publié">Il apparaîtra après la première course de la saison.</EmptyState></div>
      : tab === "drivers" ? <DriversTable rows={rows} labels={labels} /> : <TeamsTable rows={rows} labels={labels} />;
  }

  return (
    <Layout>
      <div className="page sport">
        <PageHeader
          eyebrow={`${discipline.name} · Saison ${season}`}
          title="Classements"
          subtitle={tab === "bettors" ? "Les joueurs GridBook classés selon leur solde d'APEX." : `Classement officiel du championnat. Source : ${discipline.source}.`}
        />

        <div className="tabs" role="tablist" aria-label="Type de classement">
          {tabs.map((t) => (
            <button key={t.key} id={`tab-${t.key}`} type="button" role="tab" className="tab" aria-selected={tab === t.key} aria-controls="standings-panel" onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <section id="standings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="card card-flush">
          {content}
        </section>

        {tab !== "bettors" && <p className="source-note">Mis à jour toutes les 10 minutes à partir des données officielles.</p>}
      </div>
    </Layout>
  );
}
