import { Injectable, NotFoundException } from "@nestjs/common";
import { WaitingRoomStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { WaitingRoomGateway } from "./waiting-room.gateway";
import { CheckInDto } from "./dto/check-in.dto";

@Injectable()
export class WaitingRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly gateway: WaitingRoomGateway
  ) {}

  async list(tenantId: string): Promise<unknown> {
    const queue = await this.prisma.waitingRoomEntry.findMany({
      where: {
        tenantId,
        status: {
          in: [
            WaitingRoomStatus.WAITING,
            WaitingRoomStatus.CALLED,
            WaitingRoomStatus.PAUSED
          ]
        }
      },
      include: {
        patient: true,
        appointment: true
      },
      orderBy: [
        {
          isUrgent: "desc"
        },
        {
          arrivalTime: "asc"
        }
      ]
    });

    return queue;
  }

  async metrics(tenantId: string): Promise<{
    waitingCount: number;
    averageWaitMinutes: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const waitingCount = await this.prisma.waitingRoomEntry.count({
      where: {
        tenantId,
        status: {
          in: [WaitingRoomStatus.WAITING, WaitingRoomStatus.CALLED, WaitingRoomStatus.PAUSED]
        }
      }
    });

    const doneEntries = await this.prisma.waitingRoomEntry.findMany({
      where: {
        tenantId,
        status: WaitingRoomStatus.DONE,
        completedAt: {
          gte: today
        },
        calledAt: {
          not: null
        }
      },
      select: {
        calledAt: true,
        arrivalTime: true
      }
    });

    const averageWaitMinutes =
      doneEntries.length === 0
        ? 0
        : doneEntries.reduce((acc, entry) => {
            if (!entry.calledAt) {
              return acc;
            }

            return acc + (entry.calledAt.getTime() - entry.arrivalTime.getTime()) / 60000;
          }, 0) / doneEntries.length;

    return {
      waitingCount,
      averageWaitMinutes: Math.round(averageWaitMinutes)
    };
  }

  async checkIn(
    tenantId: string,
    actorUserId: string,
    dto: CheckInDto
  ): Promise<unknown> {
    const entry = await this.prisma.waitingRoomEntry.create({
      data: {
        tenantId,
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        handledByUserId: actorUserId,
        status: WaitingRoomStatus.WAITING,
        arrivalTime: new Date(),
        isUrgent: dto.isUrgent ?? false,
        priorityScore: dto.isUrgent ? 10 : 0
      },
      include: {
        patient: true,
        appointment: true
      }
    });

    if (dto.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: dto.appointmentId },
        data: {
          status: "IN_WAITING"
        }
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CHECK_IN",
      entity: "WaitingRoomEntry",
      entityId: entry.id,
      afterData: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId
      }
    });

    await this.broadcast(tenantId);
    return entry;
  }

  async callNext(tenantId: string, actorUserId: string): Promise<unknown> {
    const next = await this.prisma.waitingRoomEntry.findFirst({
      where: {
        tenantId,
        status: WaitingRoomStatus.WAITING
      },
      orderBy: [
        {
          isUrgent: "desc"
        },
        {
          arrivalTime: "asc"
        }
      ],
      include: {
        patient: true,
        appointment: true
      }
    });

    if (!next) {
      throw new NotFoundException("No patient in queue");
    }

    const updated = await this.prisma.waitingRoomEntry.update({
      where: { id: next.id },
      data: {
        status: WaitingRoomStatus.CALLED,
        calledAt: new Date(),
        handledByUserId: actorUserId
      },
      include: {
        patient: true,
        appointment: true
      }
    });

    if (updated.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: updated.appointmentId },
        data: {
          status: "IN_CONSULTATION"
        }
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CALL_NEXT",
      entity: "WaitingRoomEntry",
      entityId: updated.id
    });

    await this.broadcast(tenantId);
    return updated;
  }

  async updateStatus(
    tenantId: string,
    actorUserId: string,
    id: string,
    status: WaitingRoomStatus
  ): Promise<unknown> {
    const entry = await this.prisma.waitingRoomEntry.findFirst({
      where: { id, tenantId }
    });

    if (!entry) {
      throw new NotFoundException("Queue entry not found");
    }

    const updated = await this.prisma.waitingRoomEntry.update({
      where: { id },
      data: {
        status,
        handledByUserId: actorUserId,
        completedAt:
          status === WaitingRoomStatus.DONE || status === WaitingRoomStatus.SKIPPED
            ? new Date()
            : undefined
      },
      include: {
        patient: true,
        appointment: true
      }
    });

    if (updated.appointmentId) {
      const appointmentStatus =
        status === WaitingRoomStatus.DONE
          ? "DONE"
          : status === WaitingRoomStatus.SKIPPED
            ? "NO_SHOW"
            : status === WaitingRoomStatus.CALLED
              ? "IN_CONSULTATION"
              : status === WaitingRoomStatus.WAITING
                ? "IN_WAITING"
                : undefined;

      if (appointmentStatus) {
        await this.prisma.appointment.update({
          where: { id: updated.appointmentId },
          data: { status: appointmentStatus }
        });
      }
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "WaitingRoomEntry",
      entityId: id,
      afterData: { status }
    });

    await this.broadcast(tenantId);
    return updated;
  }

  async leaveQueue(
    tenantId: string,
    actorUserId: string,
    id: string
  ): Promise<unknown> {
    return this.updateStatus(tenantId, actorUserId, id, WaitingRoomStatus.SKIPPED);
  }

  private async broadcast(tenantId: string): Promise<void> {
    const [queue, metrics] = await Promise.all([
      this.list(tenantId),
      this.metrics(tenantId)
    ]);

    this.gateway.publishQueue(tenantId, {
      queue,
      metrics
    });
  }
}
