export interface JwtUser {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface TenantRequestContext {
  tenantId: string;
  actorUserId?: string;
}
