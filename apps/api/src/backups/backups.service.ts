import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { promises as fs } from "fs";
import path from "path";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<unknown> {
    return this.prisma.backupLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledBackup(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true }
    });

    for (const tenant of tenants) {
      try {
        await this.createSnapshot(tenant.id, undefined, "SCHEDULED");
      } catch (error) {
        this.logger.error(`Scheduled backup failed for tenant ${tenant.id}`, error as Error);
      }
    }
  }

  async runManualBackup(tenantId: string, userId: string): Promise<unknown> {
    return this.createSnapshot(tenantId, userId, "MANUAL");
  }

  private async createSnapshot(
    tenantId: string,
    userId: string | undefined,
    mode: "MANUAL" | "SCHEDULED"
  ): Promise<unknown> {
    const startedLog = await this.prisma.backupLog.create({
      data: {
        tenantId,
        triggeredByUserId: userId,
        status: "RUNNING",
        message: `Backup ${mode.toLowerCase()} started`
      }
    });

    try {
      const snapshot = await this.collectTenantData(tenantId);
      const baseDir = path.join(process.env.STORAGE_LOCAL_PATH ?? "./uploads", "backups");
      await fs.mkdir(baseDir, { recursive: true });
      const filePath = path.join(baseDir, `${tenantId}-${Date.now()}.json`);
      await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");

      const completed = await this.prisma.backupLog.update({
        where: { id: startedLog.id },
        data: {
          status: "SUCCESS",
          message: `Backup ${mode.toLowerCase()} completed`,
          filePath: filePath.replace(/\\/g, "/")
        }
      });

      return completed;
    } catch (error) {
      await this.prisma.backupLog.update({
        where: { id: startedLog.id },
        data: {
          status: "FAILED",
          message: error instanceof Error ? error.message : "Backup failed"
        }
      });

      throw error;
    }
  }

  private async collectTenantData(tenantId: string): Promise<Record<string, unknown>> {
    const [tenant, users, patients, appointments, consultations, prescriptions, payments] =
      await Promise.all([
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.user.findMany({ where: { tenantId } }),
        this.prisma.patient.findMany({ where: { tenantId } }),
        this.prisma.appointment.findMany({ where: { tenantId } }),
        this.prisma.consultation.findMany({ where: { tenantId } }),
        this.prisma.prescription.findMany({ where: { tenantId }, include: { lines: true } }),
        this.prisma.payment.findMany({ where: { tenantId } })
      ]);

    return {
      tenant,
      users,
      patients,
      appointments,
      consultations,
      prescriptions,
      payments,
      exportedAt: new Date().toISOString()
    };
  }
}
