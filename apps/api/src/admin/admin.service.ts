import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleName } from "@prisma/client";
import { BackupsService } from "../backups/backups.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePlanDto, UpdatePlanDto } from "./dto.plan";
import { CreateTenantDto } from "./dto.create-tenant";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly backupsService: BackupsService
  ) {}

  async listTenants(): Promise<unknown> {
    return this.prisma.tenant.findMany({
      include: {
        plan: true,
        _count: {
          select: {
            users: true,
            patients: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createTenant(actorUserId: string, dto: CreateTenantDto): Promise<unknown> {
    const tenant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          timezone: dto.timezone ?? "Africa/Tunis",
          locale: dto.locale ?? "fr",
          planId: dto.planId
        }
      });

      await tx.tenantSetting.create({
        data: {
          tenantId: created.id,
          clinicName: created.name,
          language: created.locale
        }
      });

      for (const role of [RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY]) {
        await tx.role.create({
          data: {
            tenantId: created.id,
            name: role,
            description: `${role} role`
          }
        });
      }

      return created;
    });

    await this.auditService.log({
      tenantId: tenant.id,
      actorUserId,
      action: "CREATE",
      entity: "Tenant",
      entityId: tenant.id,
      afterData: {
        name: tenant.name,
        slug: tenant.slug
      }
    });

    return tenant;
  }

  async updateTenant(
    actorUserId: string,
    id: string,
    dto: Partial<CreateTenantDto>
  ): Promise<unknown> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        timezone: dto.timezone,
        locale: dto.locale,
        planId: dto.planId
      }
    });

    await this.auditService.log({
      tenantId: id,
      actorUserId,
      action: "UPDATE",
      entity: "Tenant",
      entityId: id,
      beforeData: {
        name: tenant.name,
        slug: tenant.slug
      },
      afterData: dto as Record<string, unknown>
    });

    return updated;
  }

  async listPlans(): Promise<unknown> {
    return this.prisma.plan.findMany({
      orderBy: { monthlyPrice: "asc" }
    });
  }

  async createPlan(actorTenantId: string, actorUserId: string, dto: CreatePlanDto): Promise<unknown> {
    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        code: dto.code,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        maxDoctors: dto.maxDoctors,
        maxStaff: dto.maxStaff
      }
    });

    await this.auditService.log({
      tenantId: actorTenantId,
      actorUserId,
      action: "CREATE",
      entity: "Plan",
      entityId: plan.id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return plan;
  }

  async updatePlan(actorTenantId: string, actorUserId: string, id: string, dto: UpdatePlanDto): Promise<unknown> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    const updated = await this.prisma.plan.update({
      where: { id },
      data: {
        name: dto.name,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        maxDoctors: dto.maxDoctors,
        maxStaff: dto.maxStaff
      }
    });

    await this.auditService.log({
      tenantId: actorTenantId,
      actorUserId,
      action: "UPDATE",
      entity: "Plan",
      entityId: id,
      beforeData: {
        name: plan.name,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: Number(plan.yearlyPrice)
      },
      afterData: dto as unknown as Record<string, unknown>
    });

    return updated;
  }

  async auditLogs(tenantId?: string): Promise<unknown> {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId
      },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });
  }

  async backups(tenantId: string): Promise<unknown> {
    return this.backupsService.list(tenantId);
  }

  async manualBackup(tenantId: string, userId: string): Promise<unknown> {
    return this.backupsService.runManualBackup(tenantId, userId);
  }
}
