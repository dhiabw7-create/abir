import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateTenantSettingsDto } from "./dto.update-tenant-settings";
import { UpsertWorkingHoursDto } from "./dto.upsert-working-hours";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async getTenantSettings(tenantId: string): Promise<unknown> {
    const setting = await this.prisma.tenantSetting.findUnique({
      where: {
        tenantId
      }
    });

    if (setting) {
      return setting;
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId }
    });

    return this.prisma.tenantSetting.create({
      data: {
        tenantId,
        clinicName: tenant.name,
        language: tenant.locale
      }
    });
  }

  async updateTenantSettings(
    tenantId: string,
    actorUserId: string,
    dto: UpdateTenantSettingsDto
  ): Promise<unknown> {
    const existing = await this.getTenantSettings(tenantId);

    const updated = await this.prisma.tenantSetting.upsert({
      where: {
        tenantId
      },
      create: {
        tenantId,
        clinicName: dto.clinicName ?? "Clinic",
        clinicAddress: dto.clinicAddress,
        clinicPhone: dto.clinicPhone,
        logoPath: dto.logoPath,
        stampPath: dto.stampPath,
        signaturePath: dto.signaturePath,
        documentFooter: dto.documentFooter,
        theme: dto.theme ?? "system",
        language: dto.language ?? "fr"
      },
      update: {
        clinicName: dto.clinicName,
        clinicAddress: dto.clinicAddress,
        clinicPhone: dto.clinicPhone,
        logoPath: dto.logoPath,
        stampPath: dto.stampPath,
        signaturePath: dto.signaturePath,
        documentFooter: dto.documentFooter,
        theme: dto.theme,
        language: dto.language
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "TenantSetting",
      entityId: updated.id,
      beforeData: existing as Record<string, unknown>,
      afterData: dto as unknown as Record<string, unknown>
    });

    return updated;
  }

  async getWorkingHours(tenantId: string, doctorId?: string): Promise<unknown> {
    return this.prisma.workingHour.findMany({
      where: {
        tenantId,
        doctorId
      },
      orderBy: [{ doctorId: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }]
    });
  }

  async upsertWorkingHours(
    tenantId: string,
    actorUserId: string,
    dto: UpsertWorkingHoursDto
  ): Promise<unknown> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workingHour.deleteMany({
        where: {
          tenantId,
          doctorId: dto.doctorId
        }
      });

      if (dto.items.length > 0) {
        await tx.workingHour.createMany({
          data: dto.items.map((item) => ({
            tenantId,
            doctorId: dto.doctorId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            isActive: item.isActive
          }))
        });
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPSERT",
      entity: "WorkingHour",
      entityId: dto.doctorId,
      afterData: {
        count: dto.items.length
      }
    });

    return this.getWorkingHours(tenantId, dto.doctorId);
  }

  async getAppearance(tenantId: string): Promise<unknown> {
    const settings = await this.getTenantSettings(tenantId);
    return {
      theme: (settings as { theme?: string }).theme ?? "system",
      language: (settings as { language?: string }).language ?? "fr"
    };
  }
}
