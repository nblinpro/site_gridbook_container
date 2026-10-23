import axios from "axios";

// En dev sans VITE_API_URL défini, on suppose que le backend tourne sur la même
// machine que celle qui sert le frontend (évite de coder une IP en dur).
const DEFAULT_API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Endpoints où un 401 est un résultat normal à gérer localement (mauvais
// identifiants), pas une session expirée à signaler globalement.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => url.includes(path));
    if (error.response?.status === 401 && !isAuthEndpoint) {
      window.dispatchEvent(new Event("auth:session-expired"));
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default apiClient;
