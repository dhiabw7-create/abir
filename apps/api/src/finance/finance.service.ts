import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { FinanceRangeDto } from "./dto/finance-range.dto";

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async createPayment(
    tenantId: string,
    actorUserId: string,
    dto: CreatePaymentDto
  ): Promise<unknown> {
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        consultationId: dto.consultationId,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        method: dto.method,
        paidAt: new Date(dto.paidAt)
      },
      include: {
        patient: true,
        consultation: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Payment",
      entityId: payment.id,
      afterData: {
        amount: Number(payment.amount),
        patientId: payment.patientId
      }
    });

    return payment;
  }

  async listPayments(tenantId: string, range: FinanceRangeDto): Promise<unknown> {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        paidAt:
          range.from || range.to
            ? {
                gte: range.from ? new Date(range.from) : undefined,
                lte: range.to ? new Date(range.to) : undefined
              }
            : undefined
      },
      include: {
        patient: true,
        consultation: true,
        invoice: true
      },
      orderBy: {
        paidAt: "desc"
      }
    });
  }

  async overview(tenantId: string, range: FinanceRangeDto): Promise<unknown> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [paymentsToday, paymentsMonth, paymentsYear, consultations, patientsTotal, newPatients, noShows, prescriptions] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: {
            tenantId,
            paidAt: { gte: todayStart }
          }
        }),
        this.prisma.payment.findMany({
          where: {
            tenantId,
            paidAt: { gte: monthStart }
          }
        }),
        this.prisma.payment.findMany({
          where: {
            tenantId,
            paidAt: { gte: yearStart }
          }
        }),
        this.prisma.consultation.findMany({
          where: {
            tenantId,
            createdAt:
              range.from || range.to
                ? {
                    gte: range.from ? new Date(range.from) : undefined,
                    lte: range.to ? new Date(range.to) : undefined
                  }
                : undefined
          },
          include: {
            diagnosis: true
          }
        }),
        this.prisma.patient.count({ where: { tenantId } }),
        this.prisma.patient.count({
          where: {
            tenantId,
            createdAt: { gte: monthStart }
          }
        }),
        this.prisma.appointment.count({
          where: {
            tenantId,
            status: "NO_SHOW",
            startAt:
              range.from || range.to
                ? {
                    gte: range.from ? new Date(range.from) : undefined,
                    lte: range.to ? new Date(range.to) : undefined
                  }
                : undefined
          }
        }),
        this.prisma.prescription.count({ where: { tenantId } })
      ]);

    const topDiagnosesMap = consultations.reduce<Record<string, number>>((acc, consultation) => {
      const key = consultation.diagnosis?.label ?? "Sans diagnostic";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const topDiagnoses = Object.entries(topDiagnosesMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const sum = (items: Array<{ amount: unknown }>): number =>
      items.reduce((acc, payment) => acc + Number(payment.amount), 0);

    return {
      revenue: {
        daily: sum(paymentsToday),
        monthly: sum(paymentsMonth),
        yearly: sum(paymentsYear)
      },
      kpis: {
        patients: patientsTotal,
        newPatients,
        consultations: consultations.length,
        noShows,
        prescriptions
      },
      topDiagnoses
    };
  }

  async revenueByDoctor(tenantId: string, range: FinanceRangeDto): Promise<unknown> {
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        paidAt:
          range.from || range.to
            ? {
                gte: range.from ? new Date(range.from) : undefined,
                lte: range.to ? new Date(range.to) : undefined
              }
            : undefined,
        consultation: {
          isNot: null
        }
      },
      include: {
        consultation: {
          include: {
            doctor: true
          }
        }
      }
    });

    const grouped = new Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        total: number;
        count: number;
      }
    >();

    for (const payment of payments) {
      if (!payment.consultation) {
        continue;
      }

      const doctor = payment.consultation.doctor;
      const key = doctor.id;
      const current = grouped.get(key) ?? {
        doctorId: doctor.id,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        total: 0,
        count: 0
      };

      current.total += Number(payment.amount);
      current.count += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }

  async exportCsv(
    tenantId: string,
    actorUserId: string,
    range: FinanceRangeDto
  ): Promise<unknown> {
    const payments = (await this.listPayments(tenantId, range)) as Array<{
      id: string;
      amount: number;
      method: string;
      paidAt: Date;
      patient: {
        firstName: string;
        lastName: string;
        ficheNumber: string;
      };
    }>;

    const headers = ["id", "patient", "fiche", "amount", "method", "paidAt"];
    const lines = [headers.join(",")].concat(
      payments.map((payment) =>
        [
          payment.id,
          `\"${payment.patient.lastName} ${payment.patient.firstName}\"`,
          payment.patient.ficheNumber,
          Number(payment.amount).toFixed(3),
          payment.method,
          new Date(payment.paidAt).toISOString()
        ].join(",")
      )
    );

    const baseDir = path.join(process.env.STORAGE_LOCAL_PATH ?? "./uploads", "exports");
    await fs.mkdir(baseDir, { recursive: true });
    const filePath = path.join(baseDir, `finance-${Date.now()}-${randomUUID().slice(0, 6)}.csv`);
    await fs.writeFile(filePath, lines.join("\n"), "utf8");

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "EXPORT",
      entity: "Finance",
      entityId: randomUUID(),
      afterData: {
        filePath,
        records: payments.length
      }
    });

    return {
      filePath: filePath.replace(/\\/g, "/"),
      records: payments.length
    };
  }
}
