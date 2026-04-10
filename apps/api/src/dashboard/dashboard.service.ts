import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string): Promise<unknown> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [patients, appointmentsToday, waiting, consultationsToday, revenueToday, noShows] =
      await Promise.all([
        this.prisma.patient.count({ where: { tenantId } }),
        this.prisma.appointment.count({
          where: {
            tenantId,
            startAt: {
              gte: today
            }
          }
        }),
        this.prisma.waitingRoomEntry.count({
          where: {
            tenantId,
            status: {
              in: ["WAITING", "CALLED", "PAUSED"]
            }
          }
        }),
        this.prisma.consultation.count({
          where: {
            tenantId,
            createdAt: {
              gte: today
            }
          }
        }),
        this.prisma.payment.findMany({
          where: {
            tenantId,
            paidAt: {
              gte: today
            }
          }
        }),
        this.prisma.appointment.count({
          where: {
            tenantId,
            status: "NO_SHOW",
            startAt: {
              gte: today
            }
          }
        })
      ]);

    const revenue = revenueToday.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      patients,
      appointmentsToday,
      waiting,
      consultationsToday,
      revenueToday: revenue,
      noShows
    };
  }

  async chart(tenantId: string): Promise<unknown> {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const [appointments, payments] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          tenantId,
          startAt: {
            gte: start
          }
        },
        select: {
          startAt: true
        }
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          paidAt: {
            gte: start
          }
        },
        select: {
          paidAt: true,
          amount: true
        }
      })
    ]);

    const days = Array.from({ length: 30 }).map((_, idx) => {
      const day = new Date(start);
      day.setDate(start.getDate() + idx);
      const key = day.toISOString().slice(0, 10);
      return {
        date: key,
        appointments: 0,
        revenue: 0
      };
    });

    const map = new Map(days.map((item) => [item.date, item]));

    for (const appointment of appointments) {
      const key = appointment.startAt.toISOString().slice(0, 10);
      const item = map.get(key);
      if (item) {
        item.appointments += 1;
      }
    }

    for (const payment of payments) {
      const key = payment.paidAt.toISOString().slice(0, 10);
      const item = map.get(key);
      if (item) {
        item.revenue += Number(payment.amount);
      }
    }

    return days;
  }
}
