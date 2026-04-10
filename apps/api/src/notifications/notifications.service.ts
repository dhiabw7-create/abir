import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { WaitingRoomGateway } from "../waiting-room/waiting-room.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly waitingRoomGateway: WaitingRoomGateway
  ) {}

  async list(tenantId: string, userId?: string): Promise<unknown> {
    return this.prisma.notificationLog.findMany({
      where: {
        tenantId,
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });
  }

  async create(
    tenantId: string,
    actorUserId: string,
    payload: {
      title: string;
      message: string;
      channel?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        channel: payload.channel ?? "IN_APP",
        status: "SENT",
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });

    this.waitingRoomGateway.publishNotification(tenantId, {
      id: log.id,
      title: log.title,
      message: log.message,
      createdAt: log.createdAt
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Notification",
      entityId: log.id,
      afterData: {
        title: log.title,
        channel: log.channel
      }
    });

    return log;
  }
}
