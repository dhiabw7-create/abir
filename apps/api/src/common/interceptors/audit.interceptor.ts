import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "../../audit/audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      user?: { sub: string };
      tenantId?: string;
      ip?: string;
      headers: Record<string, string | undefined>;
      body?: unknown;
    }>();

    const shouldAudit = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

    return next.handle().pipe(
      tap(async (result: unknown) => {
        if (!shouldAudit || !req.tenantId) {
          return;
        }

        await this.auditService.log({
          tenantId: req.tenantId,
          actorUserId: req.user?.sub,
          action: req.method,
          entity: req.path,
          entityId:
            typeof result === "object" && result !== null && "id" in (result as Record<string, unknown>)
              ? String((result as Record<string, unknown>).id)
              : "N/A",
          beforeData: null,
          afterData: req.body as Record<string, unknown> | null,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"]
        });
      })
    );
  }
}
