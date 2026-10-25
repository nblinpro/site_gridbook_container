import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import apiClient from "../services/apiClient";
import { formatApiError } from "../services/apiError";
import { DISCIPLINES, getDiscipline } from "../data/disciplines";
import { useDiscipline } from "./discipline/DisciplineContext";
import { useToast } from "./toast/ToastContext";
import ConfirmDialog from "./confirm/ConfirmDialog";
import UserAvatar from "./cosmetics/UserAvatar";
import UserName from "./cosmetics/UserName";
import Icon from "./ui/Icon";
import "./layout.css";

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("fr-FR");

// Pages hors championnat : le sélecteur de sport y reste visible mais aucun sport n'y est « actif »
const GLOBAL_PREFIXES = ["/shop", "/leaderboard", "/admin", "/PatchNotes", "/patchnotes", "/sports", "/bet-history"];

function sportNav(d) {
  return [
    { to: d.routes.dashboard, label: "Accueil", icon: "home", end: true },
    { to: d.routes.calendar, label: "Calendrier", icon: "calendar" },
    { to: d.routes.standings, label: "Classements", icon: "trophy" },
    { to: d.routes.seasonBets, label: "Paris de saison", icon: "flag" },
    { to: d.routes.history, label: "Mes paris", icon: "ticket" },
  ];
}

const ADMIN_NAV = [
  { to: "/admin", label: "Direction de course", icon: "shield", end: true },
  { to: "/admin/accounts", label: "Comptes & crédits", icon: "users" },
  { to: "/shop", label: "Catalogue boutique", icon: "bag" },
];

function useClickOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    const onKey = (e) => { if (e.key === "Escape") onOutside(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [ref, onOutside, active]);
}

/**
 * Structure commune des pages connectées : barre supérieure (marque, championnats,
 * solde, compte), sous-navigation du championnat, contenu centré et, sur grand écran,
 * le panneau « Mes paris en cours ».
 * `rail={false}` masque ce panneau (pages admin, boutique).
 */
export default function Layout({ children, rail = true }) {
  const { user, logout, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { discipline } = useDiscipline();

  const [bets, setBets] = useState([]);
  const [betToCancel, setBetToCancel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, closeMenu, menuOpen);

  const isAdmin = user?.role === "admin";
  const path = location.pathname;
  const isAdminPage = path.startsWith("/admin");
  const isGlobalPage = GLOBAL_PREFIXES.some((p) => path.startsWith(p));

  const fetchBets = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/bets/my_bets");
      setBets(data);
    } catch {
      /* panneau secondaire : la page reste utilisable sans lui */
    }
  }, []);

  // Solde et paris rafraîchis à chaque changement de page et après chaque pari (événement global)
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    fetchUser();
    fetchBets();
    const refresh = () => { fetchUser(); fetchBets(); };
    window.addEventListener("refreshDashboard", refresh);
    return () => window.removeEventListener("refreshDashboard", refresh);
  }, [path, userId, fetchUser, fetchBets]);

  useEffect(() => { setDrawerOpen(false); setMenuOpen(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const confirmCancelBet = async () => {
    const id = betToCancel;
    setBetToCancel(null);
    try {
      await apiClient.delete(`/bets/${id}`);
      toast.success("Pari annulé : ta mise a été recréditée.");
      fetchUser();
      fetchBets();
    } catch (error) {
      toast.error(formatApiError(error, "Impossible d'annuler ce pari."));
    }
  };

  const pending = bets.filter((b) => b.status === "pending");
  const staked = pending.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const subnav = isAdminPage ? ADMIN_NAV : sportNav(discipline);
  const showRail = rail && !isAdminPage;

  return (
    <div className="app" style={{ "--sport": discipline.accent, "--sport-contrast": discipline.contrast }}>
      <a className="skip-link" href="#contenu">Aller au contenu</a>

      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/sports" className="brand" aria-label="GridBook, accueil">
            <img src="/logo_grid_book_2.png" alt="" className="brand-logo" />
            <span className="brand-name">GridBook</span>
          </Link>

          <nav className="sport-switch" aria-label="Championnats">
            {DISCIPLINES.map((d) => {
              const active = !isGlobalPage && d.slug === discipline.slug;
              return (
                <Link
                  key={d.slug}
                  to={d.routes.dashboard}
                  className={`sport-switch-item ${active ? "active" : ""}`}
                  style={{ "--item": d.accent }}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="sport-switch-dot" />
                  {d.short}
                </Link>
              );
            })}
          </nav>

          <div className="topbar-right">
            <nav className="topbar-links" aria-label="Navigation générale">
              <NavLink to="/leaderboard" className="topbar-link"><Icon name="chart" size={16} />Classement général</NavLink>
              <NavLink to="/shop" className="topbar-link"><Icon name="cart" size={16} />Boutique</NavLink>
              {isAdmin && <NavLink to="/admin" className="topbar-link"><Icon name="shield" size={16} />Admin</NavLink>}
            </nav>

            <Link to={discipline.routes.history} className="wallet-pill" title="Ton solde d'APEX">
              <Icon name="wallet" size={16} />
              <span className="num">{fmt(user?.wallet)}</span>
              <span className="wallet-unit">APEX</span>
            </Link>

            <div className="user-menu" ref={menuRef}>
              <button className="user-menu-trigger" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
                <UserAvatar username={user?.username} cosmetics={user?.cosmetics} size={34} />
                <Icon name="chevronDown" size={14} className="user-menu-chevron" />
              </button>
              {menuOpen && (
                <div className="user-menu-panel" role="menu">
                  <div className="user-menu-head">
                    <UserAvatar username={user?.username} cosmetics={user?.cosmetics} size={44} />
                    <div className="user-menu-id">
                      <strong className="truncate"><UserName name={user?.username} cosmetics={user?.cosmetics} /></strong>
                      {user?.cosmetics?.title ? <span className="ua-title">{user.cosmetics.title}</span> : <span className="muted">{isAdmin ? "Administrateur" : "Parieur"}</span>}
                    </div>
                  </div>
                  <Link role="menuitem" to={discipline.routes.history} className="user-menu-item"><Icon name="ticket" size={16} />Mes paris</Link>
                  <Link role="menuitem" to="/shop" className="user-menu-item"><Icon name="bag" size={16} />Boutique & inventaire</Link>
                  <Link role="menuitem" to="/PatchNotes" className="user-menu-item"><Icon name="file" size={16} />Notes de version</Link>
                  <div className="divider" />
                  <button role="menuitem" className="user-menu-item danger" onClick={handleLogout}><Icon name="logout" size={16} />Se déconnecter</button>
                </div>
              )}
            </div>

            <button className="btn btn-ghost btn-icon drawer-toggle" aria-label="Ouvrir le menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>

        <nav className="subnav" aria-label={isAdminPage ? "Administration" : `Navigation ${discipline.name}`}>
          <div className="subnav-inner">
            {!isAdminPage && <span className="subnav-sport">{discipline.name}</span>}
            {subnav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="subnav-link">
                <Icon name={item.icon} size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="drawer-head">
              <UserAvatar username={user?.username} cosmetics={user?.cosmetics} size={44} />
              <div className="user-menu-id">
                <strong><UserName name={user?.username} cosmetics={user?.cosmetics} /></strong>
                <span className="num muted">{fmt(user?.wallet)} APEX</span>
              </div>
              <button className="btn btn-ghost btn-icon" aria-label="Fermer le menu" onClick={() => setDrawerOpen(false)}><Icon name="close" size={20} /></button>
            </div>
            <Link to="/sports" className="user-menu-item"><Icon name="home" size={16} />Tous les championnats</Link>
            <Link to="/leaderboard" className="user-menu-item"><Icon name="chart" size={16} />Classement général</Link>
            <Link to="/shop" className="user-menu-item"><Icon name="cart" size={16} />Boutique</Link>
            {isAdmin && ADMIN_NAV.slice(0, 2).map((item) => (
              <Link key={item.to} to={item.to} className="user-menu-item"><Icon name={item.icon} size={16} />{item.label}</Link>
            ))}
            <Link to="/PatchNotes" className="user-menu-item"><Icon name="file" size={16} />Notes de version</Link>
            <div className="divider" />
            <button className="user-menu-item danger" onClick={handleLogout}><Icon name="logout" size={16} />Se déconnecter</button>
          </aside>
        </div>
      )}

      <div className={`shell ${showRail ? "with-rail" : ""}`}>
        <main id="contenu" className="main">{children}</main>

        {showRail && (
          <aside className="rail" aria-label="Mes paris en cours">
            <div className="card card-flush rail-card">
              <div className="card-head">
                <span className="card-title">Mes paris en cours</span>
                <span className="badge">{pending.length}</span>
              </div>
              {pending.length > 0 && (
                <div className="rail-summary">
                  <div className="stat"><span className="stat-label">Engagé</span><span className="rail-value num">{fmt(staked)} <small>APEX</small></span></div>
                  <div className="stat"><span className="stat-label">Gain potentiel</span><span className="rail-value num up">{fmt(pending.reduce((s, b) => s + Number(b.potential_gain || 0), 0))} <small>APEX</small></span></div>
                </div>
              )}
              <ul className="rail-list">
                {pending.length === 0 && (
                  <li className="rail-empty">
                    Aucun pari en cours.
                    <Link to={discipline.routes.calendar} className="btn-link">Voir les prochaines courses <Icon name="arrowRight" size={14} /></Link>
                  </li>
                )}
                {pending.slice(0, 6).map((bet) => {
                  const sport = getDiscipline(bet.discipline);
                  return (
                    <li key={bet.id} className="rail-bet" style={{ "--item": sport.accent }}>
                      <div className="rail-bet-main">
                        <span className="rail-bet-event"><span className="rail-bet-sport">{sport.short}</span>{bet.race_name}</span>
                        <span className="rail-bet-pick">{bet.driver_name}</span>
                        <span className="rail-bet-meta num">{fmt(bet.amount)} APEX · cote {Number(bet.odds || 0).toFixed(2)}</span>
                      </div>
                      {bet.is_open !== false && (
                        <button className="rail-bet-cancel" title="Annuler ce pari" aria-label={`Annuler le pari sur ${bet.driver_name}`} onClick={() => setBetToCancel(bet.id)}>
                          <Icon name="x" size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Link to={discipline.routes.history} className="rail-footer">Tout l'historique <Icon name="chevronRight" size={14} /></Link>
            </div>
            <p className="rail-note">Jeu de pronostics sans argent réel : les APEX n'ont aucune valeur monétaire.</p>
          </aside>
        )}
      </div>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>© 2026 GridBook · Données officielles : Jolpica/OpenF1, MotoGP, NASCAR</span>
          <span className="app-footer-links">
            <Link to="/PatchNotes">Notes de version</Link>
            <span aria-hidden>·</span>
            <span>Jeu sans argent réel</span>
          </span>
        </div>
      </footer>

      <ConfirmDialog
        open={betToCancel !== null}
        title="Annuler ce pari ?"
        message="Ta mise sera intégralement recréditée sur ton solde."
        confirmLabel="Annuler le pari"
        cancelLabel="Garder le pari"
        danger
        onConfirm={confirmCancelBet}
        onCancel={() => setBetToCancel(null)}
      />
    </div>
  );
}
