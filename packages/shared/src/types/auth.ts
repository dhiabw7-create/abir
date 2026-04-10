import type { AppRole } from "../constants/roles";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: AppRole;
  };
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}
