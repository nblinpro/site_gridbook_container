import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router/AppRouter";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/toast/ToastContext";
import "./styles/theme.css";
import "./index.css";
import "./styles/ui.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </ToastProvider>
);
