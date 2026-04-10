import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "@/lib/api";
import type { LoginRequest, LoginResponse } from "@medflow/shared";

interface AuthContextValue {
  user: LoginResponse["user"] | null;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async (): Promise<void> => {
    try {
      const response = await api.get<LoginResponse["user"]>("/auth/me");
      setUser(response.data);
      localStorage.setItem("activeTenantId", response.data.tenantId);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshMe().finally(() => setIsLoading(false));
  }, []);

  const login = async (payload: LoginRequest): Promise<void> => {
    const response = await api.post<LoginResponse>("/auth/login", payload);
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    localStorage.setItem("activeTenantId", response.data.user.tenantId);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout", {});
    } finally {
      setAccessToken(null);
      localStorage.removeItem("activeTenantId");
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      refreshMe
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
