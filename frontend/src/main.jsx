// Styles globaux importés en premier : les feuilles de style des pages, chargées
// ensuite avec leurs composants, doivent pouvoir surcharger les composants communs.
import "./styles/theme.css";
import "./index.css";
import "./styles/ui.css";
import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router/AppRouter";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/toast/ToastContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </ToastProvider>
);
