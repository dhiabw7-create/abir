import { Injectable, NotFoundException } from "@nestjs/common";
import { AppointmentStatus, ReminderChannel } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(tenantId: string, query: ListAppointmentsDto): Promise<unknown> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where = {
      tenantId,
      doctorId: query.doctorId,
      patientId: query.patientId,
      startAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined
            }
          : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          doctor: true
        },
        orderBy: { startAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.appointment.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateAppointmentDto
  ): Promise<unknown> {
    const created = await this.prisma.appointment.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? AppointmentStatus.SCHEDULED,
        reason: dto.reason,
        notes: dto.notes
      },
      include: {
        patient: true,
        doctor: true
      }
    });

    const reminderAt = new Date(created.startAt.getTime() - 24 * 60 * 60 * 1000);
    if (reminderAt > new Date()) {
      await this.prisma.reminderJob.createMany({
        data: [
          {
            tenantId,
            appointmentId: created.id,
            patientId: created.patientId,
            createdByUserId: actorUserId,
            channel: ReminderChannel.SMS,
            payload: {
              message: `Rappel rendez-vous ${created.startAt.toISOString()}`
            },
            scheduledFor: reminderAt
          },
          {
            tenantId,
            appointmentId: created.id,
            patientId: created.patientId,
            createdByUserId: actorUserId,
            channel: ReminderChannel.EMAIL,
            payload: {
              message: `Reminder appointment ${created.startAt.toISOString()}`
            },
            scheduledFor: reminderAt
          }
        ]
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Appointment",
      entityId: created.id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return created;
  }

  async update(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateAppointmentDto
  ): Promise<unknown> {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException("Appointment not found");
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        status: dto.status,
        reason: dto.reason,
        notes: dto.notes
      },
      include: {
        patient: true,
        doctor: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "Appointment",
      entityId: id,
      beforeData: {
        status: existing.status,
        startAt: existing.startAt.toISOString()
      },
      afterData: dto as unknown as Record<string, unknown>
    });

    return updated;
  }

  async setStatus(
    tenantId: string,
    actorUserId: string,
    id: string,
    status: AppointmentStatus
  ): Promise<unknown> {
    return this.update(tenantId, actorUserId, id, { status });
  }

  async remove(tenantId: string, actorUserId: string, id: string): Promise<void> {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException("Appointment not found");
    }

    await this.prisma.appointment.delete({ where: { id } });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "DELETE",
      entity: "Appointment",
      entityId: id,
      beforeData: {
        status: existing.status
      }
    });
  }
}
