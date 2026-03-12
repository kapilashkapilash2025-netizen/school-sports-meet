import axios from "axios";

const AUTH_STORAGE_KEY = "sports_meet_admin_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
});

export function getStoredToken() {
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  delete api.defaults.headers.common.Authorization;
}

const existingToken = getStoredToken();
if (existingToken) {
  api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
}

export default api;
