import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtUser } from "./jwt.strategy.type";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: JwtUser;
      headers: Record<string, string | undefined>;
      tenantId?: string;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Missing authenticated user");
    }

    const requestedTenant = request.headers["x-tenant-id"];

    if (user.role === "SUPER_ADMIN") {
      request.tenantId = requestedTenant ?? user.tenantId;
      return true;
    }

    if (requestedTenant && requestedTenant !== user.tenantId) {
      throw new ForbiddenException("Tenant isolation violation");
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
