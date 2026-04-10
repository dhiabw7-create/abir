import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async kpis(tenantId: string, from?: string, to?: string): Promise<unknown> {
    const dateFilter =
      from || to
        ? {
            gte: from ? new Date(from) : undefined,
            lte: to ? new Date(to) : undefined
          }
        : undefined;

    const [patients, consultations, appointments, prescriptions, revenue] = await Promise.all([
      this.prisma.patient.count({
        where: {
          tenantId,
          createdAt: dateFilter
        }
      }),
      this.prisma.consultation.count({
        where: {
          tenantId,
          createdAt: dateFilter
        }
      }),
      this.prisma.appointment.count({
        where: {
          tenantId,
          startAt: dateFilter
        }
      }),
      this.prisma.prescription.count({
        where: {
          tenantId,
          createdAt: dateFilter
        }
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          paidAt: dateFilter
        }
      })
    ]);

    return {
      patients,
      consultations,
      appointments,
      prescriptions,
      revenue: revenue.reduce((acc, item) => acc + Number(item.amount), 0)
    };
  }

  async activityLogs(tenantId: string): Promise<unknown> {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
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
      orderBy: {
        createdAt: "desc"
      },
      take: 250
    });
  }
}
