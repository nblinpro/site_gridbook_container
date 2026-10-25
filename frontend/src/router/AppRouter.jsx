import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/login/Login";
import Register from "../pages/register/Register";
import ForgotPassword from "../pages/login/ForgotPassword";
import ResetPassword from "../pages/login/ResetPassword";
import SportsHome from "../pages/SportsHome";
import AdminDashboard from "../pages/AdminDashboard";
import AdminAccounts from "../pages/AdminAccounts";
import { useAuth } from "../auth/AuthContext";
import RaceDetails from "../pages/f1/RaceDetails";
import RaceResults from "../pages/f1/RaceResults";
import PlaceBet from "../pages/PlaceBet";
import Shop from "../pages/shop/Shop";
import Leaderboard from "../pages/Leaderboard";
import PatchNotes from "../pages/PatchNotes";
import BetHistory from "../pages/BetHistory";
import SeasonBets from "../pages/SeasonBets";
import SportDashboard from "../pages/sport/SportDashboard";
import SportCalendar from "../pages/sport/SportCalendar";
import SportStandings from "../pages/sport/SportStandings";
import { DISCIPLINES } from "../data/disciplines";
import { DisciplineProvider } from "../components/discipline/DisciplineContext";
import F1LightsLoader from "../components/loader/F1LightsLoader";

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <F1LightsLoader label="VÉRIFICATION..." />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" />;
  return children;
}

// Pages communes aux 3 championnats (accueil, calendrier, classements, paris de
// saison, historique). La F1 ajoute ses pages Grand Prix (détails, résultats Ergast).
function sportRoutes(d) {
  const page = (el) => <PrivateRoute>{el}</PrivateRoute>;
  const routes = [
    [d.routes.dashboard, <SportDashboard key={d.slug} discipline={d} />],
    [d.routes.calendar, <SportCalendar key={d.slug} discipline={d} />],
    [d.routes.standings, <SportStandings key={d.slug} discipline={d} />],
    [d.routes.seasonBets, <SeasonBets discipline={d} />],
    [d.routes.history, <BetHistory discipline={d} />],
  ];
  return routes.map(([path, el]) => <Route key={path} path={path} element={page(el)} />);
}

export default function AppRouter() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <DisciplineProvider>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/sports" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/sports" /> : <Register />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/sports" /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <Navigate to="/sports" /> : <ResetPassword />} />

          <Route path="/sports" element={<PrivateRoute><SportsHome /></PrivateRoute>} />

          {/* Formule 1 : pages Grand Prix */}
          <Route path="/f1/:season/race/:round/results" element={<PrivateRoute><RaceResults /></PrivateRoute>} />
          <Route path="/f1/:season/race/:round" element={<PrivateRoute><RaceDetails /></PrivateRoute>} />

          {/* Pages génériques des 3 sports */}
          {DISCIPLINES.flatMap(sportRoutes)}

          {/* Pages communes */}
          <Route path="/place-bet/:raceId" element={<PrivateRoute><PlaceBet /></PrivateRoute>} />
          <Route path="/bet-history" element={<PrivateRoute><BetHistory /></PrivateRoute>} />
          <Route path="/shop" element={<PrivateRoute><Shop /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/PatchNotes" element={<PrivateRoute><PatchNotes /></PrivateRoute>} />

          <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/accounts" element={<PrivateRoute adminOnly={true}><AdminAccounts /></PrivateRoute>} />

          <Route path="*" element={<Navigate to={user ? "/sports" : "/login"} replace />} />
        </Routes>
      </DisciplineProvider>
    </BrowserRouter>
  );
}
