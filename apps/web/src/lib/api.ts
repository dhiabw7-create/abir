import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL,
  withCredentials: true
});

let accessToken: string | null = localStorage.getItem("accessToken");

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const tenantId = localStorage.getItem("activeTenantId");
  if (tenantId) {
    config.headers["x-tenant-id"] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?._retry) {
      error.config._retry = true;
      try {
        const refreshed = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(refreshed.data.accessToken);
        error.config.headers.Authorization = `Bearer ${refreshed.data.accessToken}`;
        return api.request(error.config);
      } catch {
        setAccessToken(null);
      }
    }

    return Promise.reject(error);
  }
);
