import apiClient from "./apiClient";

export const register = async (email, password) => {
    return apiClient.post("/auth/register", { email, password });
};

export const login = async (email, password) => {
    return apiClient.post("/auth/login", { email, password });
};