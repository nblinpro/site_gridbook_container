import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth & Context
import { useAuth } from "../auth/AuthContext";

// Pages
import Login from "../pages/login/Login";
import Register from "../pages/register/Register";
import Dashboard from "../pages/Dashboard";
import AdminDashboard from "../pages/AdminDashboard";
import F1Calendar from "../pages/f1/F1Calendar";
import RaceDetails from "../pages/f1/RaceDetails";
import RaceResults from "../pages/f1/RaceResults";
import PlaceBet from "../pages/PlaceBet";
import Leaderboard from "../pages/Leaderboard";
import PatchNotes from "../pages/PatchNotes";

// Components
import Layout from "../components/Layout";

/**
 * Composant PrivateRoute
 * Gère l'accès sécurisé et enveloppe les pages dans le Layout global.
 */
function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  // 1. État de chargement
  if (loading) {
    return (
      <div className="loading-screen" style={{ 
        height: '100vh', 
        backgroundColor: '#000', 
        color: '#e10600', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '900'
      }}>
        <h2 className="admin-loader">SYNCING DATA...</h2>
      </div>
    );
  }

  // 2. Redirection si non connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Redirection si accès Admin requis mais rôle insuffisant
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Succès : Retourne la page enveloppée dans le Layout
  return <Layout user={user}>{children}</Layout>;
}

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* --- ROUTES PUBLIQUES --- */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
        />

        {/* --- ROUTES PROTÉGÉES (AVEC LAYOUT) --- */}
        
        {/* Dashboard Principal */}
        <Route 
          path="/dashboard" 
          element={<PrivateRoute><Dashboard /></PrivateRoute>} 
        />

        {/* F1 - Résultats (Route la plus spécifique en premier pour éviter les conflits) */}
<Route path="f1/:season/race/:round/results" element={<PrivateRoute><RaceResults /></PrivateRoute>} />

        {/* F1 - Détails d'une course */}
        <Route 
          path="/f1/:season/race/:round" 
          element={<PrivateRoute><RaceDetails /></PrivateRoute>} 
        />

        {/* F1 - Calendrier */}
        <Route 
          path="/f1/calendar" 
          element={<PrivateRoute><F1Calendar /></PrivateRoute>} 
        />

        {/* Paris & Social */}
        <Route 
          path="/place-bet/:raceId" 
          element={<PrivateRoute><PlaceBet /></PrivateRoute>} 
        />
        <Route 
          path="/leaderboard" 
          element={<PrivateRoute><Leaderboard /></PrivateRoute>} 
        />
        <Route 
          path="/patchnotes" 
          element={<PrivateRoute><PatchNotes /></PrivateRoute>} 
        />

        {/* --- ZONE ADMIN --- */}
        <Route 
          path="/admin" 
          element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} 
        />

        {/* --- REDIRECTION PAR DÉFAUT (FALLBACK) --- */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}