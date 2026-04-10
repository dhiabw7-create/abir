import type { AppRole } from "../constants/roles";

export type Identifier = string;

export interface TenantScoped {
  id: Identifier;
  tenantId: Identifier;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface AuditEvent {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  tenantId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  at: string;
}

export interface CurrentUser {
  id: string;
  tenantId: string;
  role: AppRole;
  email: string;
  firstName: string;
  lastName: string;
}
