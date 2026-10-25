import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import { DISCIPLINES } from "../data/disciplines";
import { useDiscipline } from "../components/discipline/DisciplineContext";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import { formatApiError } from "../services/apiError";
import { formatApex, formatDate, formatDateTime, toDate } from "../utils/format";
import "./admin.css";

const byName = (a, b) => a.name.localeCompare(b.name, "fr");
const isPast = (race) => toDate(race.start_datetime).getTime() <= Date.now();

// Direction de course : synchronisation des données, validation des résultats,
// clôture des classements de saison et ouverture des paris, sport par sport.
export default function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { discipline: currentDiscipline } = useDiscipline();

  const [sportSlug, setSportSlug] = useState(currentDiscipline.slug);
  const [users, setUsers] = useState([]);
  const [allRaces, setAllRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { ok, report?, error?, sport }

  const [selectedRace, setSelectedRace] = useState("");
  const [selectedWinner, setSelectedWinner] = useState("");
  const [raceResult, setRaceResult] = useState(null); // { ok, message }

  const [seasonBetType, setSeasonBetType] = useState("season_driver");
  const [seasonWinner, setSeasonWinner] = useState("");
  const [seasonResult, setSeasonResult] = useState(null);

  const [confirm, setConfirm] = useState(null); // "race" | "season"
  const [busy, setBusy] = useState(false);
  const [togglingRace, setTogglingRace] = useState(null);

  const sport = DISCIPLINES.find((d) => d.slug === sportSlug) || DISCIPLINES[0];

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/users");
      setUsers(res.data);
    } catch (error) { console.error(error); }
  }, []);

  const fetchSportData = useCallback(async () => {
    try {
      const q = `?discipline=${sportSlug}`;
      const [rRes, dRes, tRes, sRes] = await Promise.all([
        apiClient.get(`/races/${q}`),
        apiClient.get(`/drivers/${q}`),
        apiClient.get(`/teams/${q}`),
        apiClient.get(`/seasons/${q}`),
      ]);
      setAllRaces(rRes.data);
      setDrivers(dRes.data);
      setTeams(tRes.data);
      setSeasons(sRes.data);
      setSelectedSeason((current) => sRes.data.some((s) => s.id === current)
        ? current
        : (sRes.data.find((s) => s.is_active) || sRes.data[0])?.id ?? null);
      setLoadError("");
    } catch (error) {
      setLoadError(formatApiError(error, "Impossible de charger les données de ce championnat."));
    }
    setLoading(false);
  }, [sportSlug]);

  const userId = user?.id;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { navigate("/login"); return; }
    if (!isAdmin) { navigate("/sports"); return; }
    void fetchUsers();
    void fetchSportData();
  }, [authLoading, userId, isAdmin, navigate, fetchUsers, fetchSportData]);

  const switchSport = (slug) => {
    if (slug === sportSlug) return;
    setLoading(true);
    setSportSlug(slug);
    setSelectedRace("");
    setSelectedWinner("");
    setSeasonWinner("");
    setSyncResult(null);
    setRaceResult(null);
    setSeasonResult(null);
  };

  // --- Données dérivées ---
  const openRaces = useMemo(() => allRaces.filter((r) => r.status !== "finished"), [allRaces]);
  const seasonRaces = useMemo(() => openRaces.filter((r) => r.season_id === selectedSeason), [openRaces, selectedSeason]);
  const awaitingResult = useMemo(() => openRaces.filter(isPast), [openRaces]);
  const upcoming = useMemo(() => openRaces.filter((r) => !isPast(r)), [openRaces]);
  const openMarkets = seasonRaces.filter((r) => r.is_open).length;
  const lastResult = useMemo(
    () => allRaces.filter((r) => r.status === "finished").sort((a, b) => toDate(b.start_datetime) - toDate(a.start_datetime))[0] || null,
    [allRaces],
  );
  const sortedDrivers = useMemo(() => drivers.slice().sort(byName), [drivers]);
  const sortedTeams = useMemo(() => teams.slice().sort(byName), [teams]);
  const activeUsers = users.filter((u) => u.is_active).length;
  const bannedUsers = users.length - activeUsers;
  const circulating = users.reduce((sum, u) => sum + Number(u.wallet || 0), 0);
  const seasonYear = seasons.find((s) => s.id === selectedSeason)?.year ?? "";
  const seasonCandidates = seasonBetType === "season_driver" ? sortedDrivers : sortedTeams;

  const raceToResolve = openRaces.find((r) => String(r.id) === String(selectedRace));
  const winnerName = drivers.find((d) => String(d.id) === String(selectedWinner))?.name;
  const seasonWinnerName = seasonCandidates.find((c) => String(c.id) === String(seasonWinner))?.name;
  const seasonLabel = seasonBetType === "season_driver" ? sport.labels.championDriver : sport.labels.championTeam;

  // --- Actions ---
  const handleToggleRaceStatus = async (raceId) => {
    setTogglingRace(raceId);
    try {
      await apiClient.patch(`/admin/races/${raceId}/toggle-status`);
      await fetchSportData();
    } catch (err) {
      toast.error(formatApiError(err, "Impossible de changer le statut de cette course."));
    } finally {
      setTogglingRace(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data: report } = await apiClient.post(`/admin/sync/${sportSlug}`);
      setSyncResult({ ok: true, report, sport, at: new Date() });
      toast.success(`${sport.name} synchronisé.`);
      void fetchSportData();
      void fetchUsers();
    } catch (err) {
      const message = formatApiError(err, "Échec de la synchronisation.");
      setSyncResult({ ok: false, error: message, sport });
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const requestResolveRace = () => {
    if (!selectedRace || !selectedWinner) return toast.warning("Sélectionne une course et un vainqueur avant de valider.");
    setConfirm("race");
  };

  const handleResolveRace = async () => {
    setConfirm(null);
    setBusy(true);
    setRaceResult(null);
    try {
      const res = await apiClient.post(`/admin/close_race/${selectedRace}?winner_id=${selectedWinner}`, {});
      const message = res.data.message || "Course validée, gains distribués.";
      setRaceResult({ ok: true, message: `${raceToResolve?.name ?? "Course"} : ${winnerName ?? "vainqueur"} vainqueur. ${message}` });
      toast.success(message);
      setSelectedRace("");
      setSelectedWinner("");
      void fetchSportData();
      void fetchUsers();
    } catch (err) {
      const message = formatApiError(err, "Échec de la validation du résultat.");
      setRaceResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const requestResolveSeason = () => {
    if (!selectedSeason) return toast.warning("Aucune saison sélectionnée.");
    if (!seasonWinner) return toast.warning("Sélectionne le champion avant de valider.");
    setConfirm("season");
  };

  const handleResolveSeason = async () => {
    setConfirm(null);
    setBusy(true);
    setSeasonResult(null);
    try {
      const res = await apiClient.post(
        `/admin/resolve_season/${selectedSeason}?bet_type=${seasonBetType}&winner_id=${seasonWinner}`,
        {},
      );
      const message = res.data.message || "Classement clôturé, gains distribués.";
      setSeasonResult({ ok: true, message, odds: res.data.final_odds, pool: res.data.total_distributed });
      toast.success(message);
      setSeasonWinner("");
      void fetchUsers();
    } catch (err) {
      const message = formatApiError(err, "Échec de la clôture du classement.");
      setSeasonResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const ready = !authLoading && !loading;
  const kpis = [
    { label: "Joueurs actifs", value: activeUsers, icon: "users", hint: `${users.length} inscrit${users.length > 1 ? "s" : ""}${bannedUsers ? ` · ${bannedUsers} banni${bannedUsers > 1 ? "s" : ""}` : ""}` },
    { label: "Résultats à valider", value: awaitingResult.length, icon: "flag", hint: awaitingResult.length ? "Courses passées sans vainqueur" : "Tout est à jour", tone: awaitingResult.length ? "warn" : "ok" },
    { label: "Paris ouverts", value: openMarkets, icon: "ticket", hint: `sur ${seasonRaces.length} course${seasonRaces.length > 1 ? "s" : ""} à venir ${seasonYear ? `en ${seasonYear}` : ""}` },
    { label: "APEX en circulation", value: formatApex(circulating), unit: "APEX", icon: "wallet", hint: "Somme des soldes joueurs" },
  ];

  return (
    <Layout rail={false}>
      <div className="page adm" style={{ "--sport": sport.accent, "--sport-contrast": sport.contrast }}>
        <PageHeader
          eyebrow={`Administration · ${sport.name}`}
          title="Direction de course"
          subtitle="Importe les données officielles, valide les résultats et contrôle l'ouverture des paris."
          actions={
            <div className="adm-toolbar">
              <div className="segmented" role="group" aria-label="Championnat">
                {DISCIPLINES.map((d) => (
                  <button key={d.slug} type="button" aria-pressed={d.slug === sportSlug} onClick={() => switchSport(d.slug)} style={{ "--item": d.accent }}>
                    <span className="adm-seg-dot" />{d.short}
                  </button>
                ))}
              </div>
              <label className="adm-season-select">
                <span className="sr-only">Saison</span>
                <select className="select select-sm" value={selectedSeason ?? ""} onChange={(e) => { setSelectedSeason(parseInt(e.target.value, 10)); setSeasonWinner(""); }} disabled={!seasons.length}>
                  {seasons.length === 0 && <option value="">Aucune saison</option>}
                  {seasons.map((s) => <option key={s.id} value={s.id}>Saison {s.year}{s.is_active ? " (en cours)" : ""}</option>)}
                </select>
              </label>
            </div>
          }
        />

        {loadError && (
          <div className="alert alert-danger" role="alert">
            <Icon name="info" size={18} />
            <div className="adm-alert-body">
              <strong>Données indisponibles</strong>
              <span>{loadError}</span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm adm-alert-action" onClick={() => { setLoading(true); void fetchSportData(); }}>Réessayer</button>
          </div>
        )}

        {/* --- Indicateurs --- */}
        <div className="adm-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={`card adm-kpi ${k.tone ? `adm-kpi-${k.tone}` : ""}`}>
              <div className="adm-kpi-head">
                <span className="stat-label">{k.label}</span>
                <span className="adm-kpi-icon"><Icon name={k.icon} size={16} /></span>
              </div>
              {ready ? (
                <>
                  <span className="stat-value">{k.value}{k.unit && <small>{k.unit}</small>}</span>
                  <span className="adm-kpi-hint">{k.hint}</span>
                </>
              ) : (
                <div className="skeleton" style={{ height: 52 }} />
              )}
            </div>
          ))}
        </div>

        {/* --- Tâches --- */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Opérations</h2>
            <span className="muted adm-section-note">Les actions de validation versent les gains immédiatement et sont définitives.</span>
          </div>

          <div className="adm-tasks">
            {/* 1. Synchronisation */}
            <article className="card adm-task">
              <header className="adm-task-head">
                <span className="adm-task-icon"><Icon name="refresh" size={18} /></span>
                <div>
                  <h3 className="adm-task-title">Synchroniser les données</h3>
                  <p className="adm-task-desc">Calendrier, {sport.labels.participants.toLowerCase()}, {sport.labels.teams.toLowerCase()} et résultats {sport.name}. Les courses terminées sont réglées automatiquement.</p>
                </div>
              </header>

              <dl className="adm-meta">
                <div><dt>Source</dt><dd>{sport.source}</dd></div>
                <div><dt>Saison importée</dt><dd>Saison en cours ({new Date().getFullYear()})</dd></div>
                <div><dt>Automatique</dt><dd>Toutes les 6 heures</dd></div>
                <div>
                  <dt>Dernier résultat</dt>
                  <dd>
                    {!ready ? <span className="skeleton adm-inline-skel" /> : lastResult ? (
                      <><span className="strong">{lastResult.name}</span>{lastResult.winner_name && <> · {lastResult.winner_name}</>}<span className="muted"> · {formatDate(lastResult.start_datetime)}</span></>
                    ) : <span className="muted">Aucune course terminée</span>}
                  </dd>
                </div>
              </dl>

              {syncResult && syncResult.ok && (
                <div className="adm-report" role="status">
                  <div className="adm-report-head">
                    <span className="badge badge-success"><Icon name="check" size={12} strokeWidth={3} />Synchronisé</span>
                    <span className="muted">{syncResult.sport.name} · {syncResult.at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="adm-report-grid">
                    {[
                      [syncResult.sport.labels.events, syncResult.report.races],
                      [syncResult.sport.labels.participants, syncResult.report.drivers],
                      [syncResult.sport.labels.teams, syncResult.report.teams],
                      ["Courses réglées", syncResult.report.settled],
                    ].map(([label, value]) => (
                      <div key={label} className="adm-report-cell">
                        <span className="adm-report-value">{value ?? 0}</span>
                        <span className="adm-report-label">{label}</span>
                      </div>
                    ))}
                  </div>
                  {Number(syncResult.report.bets_won) > 0 && <p className="adm-report-foot">{syncResult.report.bets_won} pari{syncResult.report.bets_won > 1 ? "s" : ""} gagnant{syncResult.report.bets_won > 1 ? "s" : ""} payé{syncResult.report.bets_won > 1 ? "s" : ""}.</p>}
                </div>
              )}
              {syncResult && !syncResult.ok && (
                <div className="alert alert-danger" role="alert"><Icon name="info" size={18} /><span>{syncResult.error}</span></div>
              )}

              <footer className="adm-task-foot">
                <button type="button" className="btn btn-primary btn-block" onClick={handleSync} disabled={syncing || !ready}>
                  <Icon name="refresh" size={16} className={syncing ? "adm-spin" : ""} />
                  {syncing ? "Synchronisation en cours…" : `Synchroniser ${sport.short}`}
                </button>
              </footer>
            </article>

            {/* 2. Résultat de course */}
            <article className="card adm-task">
              <header className="adm-task-head">
                <span className="adm-task-icon"><Icon name="flag" size={18} /></span>
                <div>
                  <h3 className="adm-task-title">Valider un résultat de course</h3>
                  <p className="adm-task-desc">À utiliser si la synchronisation n'a pas réglé une course. Les paris sont réglés et les gains versés.</p>
                </div>
              </header>

              <div className="adm-fields">
                <label className="field">
                  <span className="field-label">{sport.labels.event}</span>
                  <select className="select" value={selectedRace} onChange={(e) => { setSelectedRace(e.target.value); setRaceResult(null); }} disabled={!ready || !openRaces.length}>
                    <option value="">{openRaces.length ? "Choisir une course" : "Aucune course à valider"}</option>
                    {awaitingResult.length > 0 && (
                      <optgroup label="Résultat attendu">
                        {awaitingResult.map((r) => <option key={r.id} value={r.id}>{r.name} · {formatDate(r.start_datetime)}</option>)}
                      </optgroup>
                    )}
                    {upcoming.length > 0 && (
                      <optgroup label="À venir">
                        {upcoming.map((r) => <option key={r.id} value={r.id}>{r.name} · {formatDate(r.start_datetime)}</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Vainqueur officiel</span>
                  <select className="select" value={selectedWinner} onChange={(e) => setSelectedWinner(e.target.value)} disabled={!ready || !sortedDrivers.length}>
                    <option value="">Choisir un {sport.labels.participant.toLowerCase()}</option>
                    {sortedDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                {raceToResolve && !isPast(raceToResolve) && (
                  <p className="field-hint adm-warn-hint"><Icon name="clock" size={14} />Cette course n'a pas encore eu lieu ({formatDateTime(raceToResolve.start_datetime)}).</p>
                )}
              </div>

              {raceResult && (
                <div className={`alert ${raceResult.ok ? "alert-success" : "alert-danger"}`} role={raceResult.ok ? "status" : "alert"}>
                  <Icon name={raceResult.ok ? "check" : "info"} size={18} /><span>{raceResult.message}</span>
                </div>
              )}

              <footer className="adm-task-foot">
                <button type="button" className="btn btn-primary btn-block" onClick={requestResolveRace} disabled={busy || !selectedRace || !selectedWinner}>
                  <Icon name="check" size={16} />Valider et verser les gains
                </button>
              </footer>
            </article>

            {/* 3. Clôture de saison */}
            <article className="card adm-task">
              <header className="adm-task-head">
                <span className="adm-task-icon"><Icon name="trophy" size={18} /></span>
                <div>
                  <h3 className="adm-task-title">Clôturer une saison</h3>
                  <p className="adm-task-desc">Désigne le champion {sport.name} {seasonYear} et règle les paris de saison correspondants.</p>
                </div>
              </header>

              <div className="adm-fields">
                <div className="field">
                  <span className="field-label" id="adm-season-type">Classement</span>
                  <div className="segmented adm-seg-block" role="group" aria-labelledby="adm-season-type">
                    {[["season_driver", sport.labels.championDriver], ["season_team", sport.labels.championTeam]].map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={seasonBetType === value} onClick={() => { setSeasonBetType(value); setSeasonWinner(""); setSeasonResult(null); }}>{label}</button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">Champion</span>
                  <select className="select" value={seasonWinner} onChange={(e) => setSeasonWinner(e.target.value)} disabled={!ready || !seasonCandidates.length}>
                    <option value="">{seasonBetType === "season_driver" ? `Choisir un ${sport.labels.participant.toLowerCase()}` : `Choisir une ${sport.labels.team.toLowerCase()}`}</option>
                    {seasonCandidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              </div>

              {seasonResult && (
                <div className={`alert ${seasonResult.ok ? "alert-success" : "alert-danger"}`} role={seasonResult.ok ? "status" : "alert"}>
                  <Icon name={seasonResult.ok ? "check" : "info"} size={18} />
                  <span>
                    {seasonResult.message}
                    {seasonResult.ok && seasonResult.pool != null && <> Cagnotte : <strong className="num">{formatApex(seasonResult.pool)} APEX</strong>{Number(seasonResult.odds) > 0 && <> · cote finale {Number(seasonResult.odds).toLocaleString("fr-FR")}</>}.</>}
                  </span>
                </div>
              )}

              <footer className="adm-task-foot">
                <button type="button" className="btn btn-primary btn-block" onClick={requestResolveSeason} disabled={busy || !seasonWinner}>
                  <Icon name="trophy" size={16} />Clôturer et verser les gains
                </button>
              </footer>
            </article>
          </div>
        </section>

        {/* --- Ouverture des paris --- */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Ouverture des paris</h2>
            <span className="muted adm-section-note">{sport.name}{seasonYear ? ` · saison ${seasonYear}` : ""} · courses non terminées</span>
          </div>

          <div className="card card-flush">
            {!ready ? (
              <div className="adm-table-skel">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>
            ) : seasonRaces.length === 0 ? (
              <div className="adm-empty-pad">
                <EmptyState icon="calendar" title="Aucune course à venir sur cette saison">
                  Lance une synchronisation pour importer le calendrier {sport.name}, ou choisis une autre saison.
                </EmptyState>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table adm-gate-table">
                  <thead>
                    <tr>
                      <th>{sport.labels.event}</th>
                      <th>Date</th>
                      <th>État</th>
                      <th>Paris</th>
                      <th className="num"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonRaces.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="strong">{r.name}</span>
                          {r.circuit && <span className="adm-cell-sub">{[r.circuit.city, r.circuit.country].filter(Boolean).join(", ") || r.circuit.name}</span>}
                        </td>
                        <td className="adm-nowrap">{formatDateTime(r.start_datetime)}</td>
                        <td>{isPast(r) ? <span className="badge badge-warning">Résultat attendu</span> : <span className="badge">À venir</span>}</td>
                        <td>{r.is_open ? <span className="badge badge-success">Ouverts</span> : <span className="badge badge-danger">Fermés</span>}</td>
                        <td className="num">
                          <button type="button" className={`btn btn-sm ${r.is_open ? "btn-secondary" : "btn-primary"}`} onClick={() => handleToggleRaceStatus(r.id)} disabled={togglingRace === r.id}>
                            <Icon name={r.is_open ? "lock" : "ticket"} size={14} />
                            {r.is_open ? "Fermer les paris" : "Ouvrir les paris"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <Link to="/admin/accounts" className="card card-interactive adm-link-card">
          <span className="adm-task-icon"><Icon name="users" size={18} /></span>
          <span className="adm-link-text">
            <strong>Comptes & crédits</strong>
            <span className="muted">Rôles, bannissements, création de comptes et ajustements de solde tracés.</span>
          </span>
          <Icon name="chevronRight" size={18} className="adm-link-chevron" />
        </Link>
      </div>

      <ConfirmDialog
        open={confirm === "race"}
        title="Valider ce résultat ?"
        message={`${raceToResolve?.name ?? ""} : ${winnerName ?? ""} déclaré vainqueur. Tous les paris de cette course seront réglés et les gains versés immédiatement. Cette action est définitive.`}
        confirmLabel="Valider et verser les gains"
        onConfirm={handleResolveRace}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "season"}
        title="Clôturer ce classement ?"
        message={`${seasonLabel} ${sport.name} ${seasonYear} : ${seasonWinnerName ?? ""}. Les paris de saison en attente seront réglés et les gains versés immédiatement. Cette action est définitive.`}
        confirmLabel="Clôturer et verser les gains"
        onConfirm={handleResolveSeason}
        onCancel={() => setConfirm(null)}
      />
    </Layout>
  );
}
