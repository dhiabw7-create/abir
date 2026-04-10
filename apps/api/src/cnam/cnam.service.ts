import { Injectable, NotFoundException } from "@nestjs/common";
import { BordereauStatus, CNAMRecordStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CorrectRejectionDto } from "./dto/correct-rejection.dto";
import { CreateBordereauDto } from "./dto/create-bordereau.dto";
import { CreateCnamRecordDto } from "./dto/create-cnam-record.dto";
import { ExportBordereauDto } from "./dto/export-bordereau.dto";
import { RejectItemDto } from "./dto/reject-item.dto";

@Injectable()
export class CnamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async dailyVerification(tenantId: string, date = new Date()): Promise<unknown> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const consultations = await this.prisma.consultation.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        patient: true,
        cnamRecord: true
      }
    });

    return consultations.map((consultation) => ({
      consultationId: consultation.id,
      patientId: consultation.patientId,
      patientName: `${consultation.patient.firstName} ${consultation.patient.lastName}`,
      patientCnam: consultation.patient.cnamNumber,
      hasRecord: Boolean(consultation.cnamRecord),
      eligible: Boolean(consultation.patient.cnamNumber)
    }));
  }

  async listRecords(
    tenantId: string,
    status?: CNAMRecordStatus,
    search?: string
  ): Promise<unknown> {
    return this.prisma.cNAMConsultationRecord.findMany({
      where: {
        tenantId,
        status,
        OR: search
          ? [
              {
                patient: {
                  firstName: { contains: search }
                }
              },
              {
                patient: {
                  lastName: { contains: search }
                }
              },
              {
                cnamCode: { contains: search }
              }
            ]
          : undefined
      },
      include: {
        patient: true,
        consultation: true,
        bordereauItems: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async createRecord(
    tenantId: string,
    actorUserId: string,
    dto: CreateCnamRecordDto
  ): Promise<unknown> {
    const record = await this.prisma.cNAMConsultationRecord.upsert({
      where: {
        consultationId: dto.consultationId
      },
      update: {
        cnamCode: dto.cnamCode,
        amount: dto.amount,
        eligible: dto.eligible ?? true,
        notes: dto.notes
      },
      create: {
        tenantId,
        patientId: dto.patientId,
        consultationId: dto.consultationId,
        cnamCode: dto.cnamCode,
        amount: dto.amount,
        eligible: dto.eligible ?? true,
        notes: dto.notes
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPSERT",
      entity: "CNAMConsultationRecord",
      entityId: record.id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return record;
  }

  async createBordereau(
    tenantId: string,
    actorUserId: string,
    dto: CreateBordereauDto
  ): Promise<unknown> {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const records = await this.prisma.cNAMConsultationRecord.findMany({
      where: {
        tenantId,
        status: CNAMRecordStatus.PENDING,
        consultation: {
          doctorId: dto.doctorId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd
          }
        },
        id: dto.recordIds && dto.recordIds.length > 0 ? { in: dto.recordIds } : undefined,
        eligible: true
      },
      include: {
        patient: true
      }
    });

    if (records.length === 0) {
      throw new NotFoundException("No eligible records for bordereau");
    }

    const totalAmount = records.reduce((sum, item) => sum + Number(item.amount), 0);
    const reference = `BRD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6)}`;

    const bordereau = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bordereau.create({
        data: {
          tenantId,
          doctorId: dto.doctorId,
          reference,
          periodStart,
          periodEnd,
          status: BordereauStatus.DRAFT,
          totalAmount
        }
      });

      await tx.bordereauItem.createMany({
        data: records.map((record) => ({
          tenantId,
          bordereauId: created.id,
          cnamRecordId: record.id,
          amount: record.amount
        }))
      });

      await tx.cNAMConsultationRecord.updateMany({
        where: {
          id: {
            in: records.map((record) => record.id)
          }
        },
        data: {
          status: CNAMRecordStatus.IN_BORDEREAU
        }
      });

      return tx.bordereau.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: {
            include: {
              cnamRecord: {
                include: {
                  patient: true,
                  consultation: true
                }
              }
            }
          }
        }
      });
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Bordereau",
      entityId: bordereau.id,
      afterData: {
        recordCount: records.length,
        totalAmount
      }
    });

    return bordereau;
  }

  async exportBordereau(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: ExportBordereauDto
  ): Promise<unknown> {
    const bordereau = await this.prisma.bordereau.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        items: {
          include: {
            cnamRecord: {
              include: {
                patient: true,
                consultation: true
              }
            }
          }
        },
        doctor: true
      }
    });

    if (!bordereau) {
      throw new NotFoundException("Bordereau not found");
    }

    const delimiter = dto.delimiter ?? "|";
    const lineFormat =
      dto.lineFormat ??
      "{{patient.cnamNumber}}|{{patient.lastName}} {{patient.firstName}}|{{record.cnamCode}}|{{record.amount}}|{{consultation.id}}";

    const lines = bordereau.items.map((item) =>
      this.renderLine(lineFormat, delimiter, {
        patient: item.cnamRecord.patient,
        record: item.cnamRecord,
        consultation: item.cnamRecord.consultation,
        bordereau
      })
    );

    const baseDir = path.join(process.env.STORAGE_LOCAL_PATH ?? "./uploads", "cnam");
    await fs.mkdir(baseDir, { recursive: true });

    const filename = `${bordereau.reference}-${Date.now()}.txt`;
    const filePath = path.join(baseDir, filename);
    await fs.writeFile(filePath, lines.join("\n"), "utf8");

    const exportRow = await this.prisma.$transaction(async (tx) => {
      await tx.bordereau.update({
        where: { id: bordereau.id },
        data: {
          status: BordereauStatus.EXPORTED
        }
      });

      await tx.cNAMConsultationRecord.updateMany({
        where: {
          id: {
            in: bordereau.items.map((item) => item.cnamRecordId)
          }
        },
        data: {
          status: CNAMRecordStatus.EXPORTED
        }
      });

      return tx.bordereauExport.create({
        data: {
          tenantId,
          bordereauId: bordereau.id,
          format: "TXT",
          filePath: filePath.replace(/\\/g, "/"),
          checksum: `${lines.length}-${bordereau.id}`
        }
      });
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "EXPORT",
      entity: "Bordereau",
      entityId: bordereau.id,
      afterData: {
        exportId: exportRow.id,
        filePath
      }
    });

    return {
      bordereauId: bordereau.id,
      reference: bordereau.reference,
      filePath: filePath.replace(/\\/g, "/"),
      lineCount: lines.length
    };
  }

  async archiveBordereau(
    tenantId: string,
    actorUserId: string,
    id: string
  ): Promise<unknown> {
    const bordereau = await this.prisma.bordereau.findFirst({
      where: { id, tenantId }
    });

    if (!bordereau) {
      throw new NotFoundException("Bordereau not found");
    }

    const archived = await this.prisma.bordereau.update({
      where: { id },
      data: {
        status: BordereauStatus.ARCHIVED
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "ARCHIVE",
      entity: "Bordereau",
      entityId: id
    });

    return archived;
  }

  async listBordereaux(tenantId: string): Promise<unknown> {
    return this.prisma.bordereau.findMany({
      where: { tenantId },
      include: {
        doctor: true,
        items: true,
        exports: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async archiveView(tenantId: string): Promise<unknown> {
    return this.prisma.bordereau.findMany({
      where: {
        tenantId,
        status: {
          in: [BordereauStatus.EXPORTED, BordereauStatus.ARCHIVED]
        }
      },
      include: {
        items: {
          include: {
            cnamRecord: true,
            rejections: true
          }
        },
        exports: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async rejectItem(
    tenantId: string,
    actorUserId: string,
    bordereauItemId: string,
    dto: RejectItemDto
  ): Promise<unknown> {
    const item = await this.prisma.bordereauItem.findFirst({
      where: {
        id: bordereauItemId,
        tenantId
      }
    });

    if (!item) {
      throw new NotFoundException("Bordereau item not found");
    }

    const rejection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bordereauRejection.create({
        data: {
          tenantId,
          bordereauItemId,
          reason: dto.reason
        }
      });

      await tx.cNAMConsultationRecord.update({
        where: {
          id: item.cnamRecordId
        },
        data: {
          status: CNAMRecordStatus.REJECTED
        }
      });

      return created;
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "REJECT",
      entity: "BordereauItem",
      entityId: bordereauItemId,
      afterData: { reason: dto.reason }
    });

    return rejection;
  }

  async correctRejection(
    tenantId: string,
    actorUserId: string,
    rejectionId: string,
    dto: CorrectRejectionDto
  ): Promise<unknown> {
    const rejection = await this.prisma.bordereauRejection.findFirst({
      where: { id: rejectionId, tenantId },
      include: {
        bordereauItem: true
      }
    });

    if (!rejection) {
      throw new NotFoundException("Rejection not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const corrected = await tx.bordereauRejection.update({
        where: { id: rejectionId },
        data: {
          resolved: true,
          correctiveNote: dto.correctiveNote
        }
      });

      await tx.cNAMConsultationRecord.update({
        where: {
          id: rejection.bordereauItem.cnamRecordId
        },
        data: {
          status: CNAMRecordStatus.PENDING
        }
      });

      return corrected;
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CORRECT",
      entity: "BordereauRejection",
      entityId: rejectionId,
      afterData: { note: dto.correctiveNote }
    });

    return updated;
  }

  async plafondEstimation(
    tenantId: string,
    month?: number,
    year?: number
  ): Promise<unknown> {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const records = await this.prisma.cNAMConsultationRecord.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end
        },
        eligible: true
      }
    });

    const total = records.reduce((sum, record) => sum + Number(record.amount), 0);
    const estimatedPlafond = 12000;

    return {
      month: targetMonth,
      year: targetYear,
      total,
      plafond: estimatedPlafond,
      remaining: Math.max(estimatedPlafond - total, 0),
      exceeded: total > estimatedPlafond
    };
  }

  async carnets(tenantId: string, search?: string): Promise<unknown> {
    const rows = await this.prisma.cNAMConsultationRecord.findMany({
      where: {
        tenantId,
        OR: search
          ? [
              {
                patient: {
                  firstName: { contains: search }
                }
              },
              {
                patient: {
                  lastName: { contains: search }
                }
              },
              {
                patient: {
                  cnamNumber: { contains: search }
                }
              }
            ]
          : undefined
      },
      include: {
        patient: true,
        consultation: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return rows.map((row) => ({
      id: row.id,
      patient: `${row.patient.lastName} ${row.patient.firstName}`,
      cnamNumber: row.patient.cnamNumber,
      cnamCode: row.cnamCode,
      amount: Number(row.amount),
      status: row.status,
      consultationId: row.consultationId,
      date: row.createdAt
    }));
  }

  async exportCarnets(
    tenantId: string,
    actorUserId: string,
    search?: string
  ): Promise<unknown> {
    const rows = (await this.carnets(tenantId, search)) as Array<{
      id: string;
      patient: string;
      cnamNumber: string | null;
      cnamCode: string;
      amount: number;
      status: string;
      date: Date;
    }>;

    const header = ["id", "patient", "cnamNumber", "cnamCode", "amount", "status", "date"];
    const csvRows = [header.join(",")].concat(
      rows.map((row) =>
        [
          row.id,
          `\"${row.patient}\"`,
          row.cnamNumber ?? "",
          row.cnamCode,
          row.amount.toFixed(3),
          row.status,
          new Date(row.date).toISOString()
        ].join(",")
      )
    );

    const baseDir = path.join(process.env.STORAGE_LOCAL_PATH ?? "./uploads", "cnam");
    await fs.mkdir(baseDir, { recursive: true });
    const filePath = path.join(baseDir, `carnets-${Date.now()}.csv`);
    await fs.writeFile(filePath, csvRows.join("\n"), "utf8");

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "EXPORT",
      entity: "Carnets",
      entityId: randomUUID(),
      afterData: {
        rows: rows.length,
        filePath
      }
    });

    return {
      rows: rows.length,
      filePath: filePath.replace(/\\/g, "/")
    };
  }

  private renderLine(
    template: string,
    delimiter: string,
    context: Record<string, unknown>
  ): string {
    const rendered = template.replace(/{{\s*([^}]+)\s*}}/g, (_, expression: string) => {
      const value = expression
        .split(".")
        .reduce<unknown>((acc, key) => {
          if (!acc || typeof acc !== "object") {
            return undefined;
          }
          return (acc as Record<string, unknown>)[key];
        }, context);

      if (value === null || value === undefined) {
        return "";
      }

      if (typeof value === "number") {
        return value.toString();
      }

      return String(value);
    });

    return rendered
      .split("|")
      .map((segment) => segment.trim())
      .join(delimiter);
  }
}
