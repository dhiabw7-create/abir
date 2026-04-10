export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DOCTOR: "DOCTOR",
  SECRETARY: "SECRETARY"
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
