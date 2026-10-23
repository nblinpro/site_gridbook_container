import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ color: "white", textAlign: "center" }}>Chargement...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}
