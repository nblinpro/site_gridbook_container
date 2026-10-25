/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react"; // Ajout de useCallback
import apiClient from "../services/apiClient";
import { useToast } from "../components/toast/ToastContext";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Utilisation de useCallback pour éviter les boucles infinies
  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      setUser(res.data);
    } catch (error) {
      // Seul un 401 signifie « pas de session valide ». Une erreur passagère (limite de débit,
      // réseau, serveur redémarré) ne doit pas déconnecter un joueur déjà connecté.
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        console.error("Auth Error:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Dépendances vides pour que la fonction soit stable

  const login = async (email, password) => {
    await apiClient.post("/auth/login", { email, password });
    await fetchUser();
  };

  const register = async (username, email, password) => {
    await apiClient.post("/auth/register", { username, email, password });
    await fetchUser();
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Déclenché par apiClient quand une requête reçoit un 401 en cours de session
  // (JWT expiré après 30 min) : on déconnecte proprement côté front au lieu de
  // laisser chaque page planter sur une réponse d'erreur inattendue.
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser((current) => {
        if (current) toast?.warning("Session expirée, reconnecte-toi.");
        return null;
      });
    };
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, register, fetchUser, loading }}>
      {!loading ? children : <div className="admin-loader">VÉRIFICATION TECHNIQUE...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
