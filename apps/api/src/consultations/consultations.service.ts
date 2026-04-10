import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateConsultationDto } from "./dto/create-consultation.dto";
import { ListConsultationsDto } from "./dto/list-consultations.dto";
import { UpdateConsultationDto } from "./dto/update-consultation.dto";

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(tenantId: string, query: ListConsultationsDto): Promise<unknown> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      tenantId,
      doctorId: query.doctorId,
      patientId: query.patientId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined
            }
          : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.consultation.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          diagnosis: true,
          vitalSigns: true,
          prescriptions: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.consultation.count({ where })
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
    dto: CreateConsultationDto
  ): Promise<unknown> {
    const diagnosis =
      dto.diagnosisCode || dto.diagnosisLabel
        ? await this.prisma.diagnosis.upsert({
            where: {
              tenantId_code: {
                tenantId,
                code: dto.diagnosisCode ?? `DX-${Date.now()}`
              }
            },
            create: {
              tenantId,
              code: dto.diagnosisCode ?? `DX-${Date.now()}`,
              label: dto.diagnosisLabel ?? dto.diagnosisCode ?? "Diagnostic non specifie"
            },
            update: {
              label: dto.diagnosisLabel ?? undefined
            }
          })
        : null;

    const consultation = await this.prisma.consultation.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        appointmentId: dto.appointmentId,
        diagnosisId: diagnosis?.id,
        symptoms: dto.symptoms,
        notes: dto.notes,
        doctorPrivateNote: dto.doctorPrivateNote,
        vitalSigns:
          dto.bloodPressure ||
          dto.pulseBpm !== undefined ||
          dto.temperatureC !== undefined ||
          dto.weightKg !== undefined ||
          dto.heightCm !== undefined
            ? {
                create: {
                  tenantId,
                  bloodPressure: dto.bloodPressure,
                  pulseBpm: dto.pulseBpm,
                  temperatureC: dto.temperatureC,
                  weightKg: dto.weightKg,
                  heightCm: dto.heightCm
                }
              }
            : undefined
      },
      include: {
        patient: true,
        doctor: true,
        diagnosis: true,
        vitalSigns: true
      }
    });

    if (dto.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: dto.appointmentId },
        data: {
          status: "IN_CONSULTATION"
        }
      });
    }

    await this.prisma.patient.update({
      where: { id: dto.patientId },
      data: { lastVisitAt: consultation.createdAt }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Consultation",
      entityId: consultation.id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return consultation;
  }

  async findOne(tenantId: string, id: string): Promise<unknown> {
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        patient: true,
        doctor: true,
        diagnosis: true,
        vitalSigns: true,
        prescriptions: {
          include: {
            lines: true
          }
        },
        generatedDocs: true,
        files: true
      }
    });

    if (!consultation) {
      throw new NotFoundException("Consultation not found");
    }

    return consultation;
  }

  async update(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateConsultationDto
  ): Promise<unknown> {
    const existing = await this.prisma.consultation.findFirst({
      where: { id, tenantId },
      include: { vitalSigns: true }
    });

    if (!existing) {
      throw new NotFoundException("Consultation not found");
    }

    let diagnosisId = existing.diagnosisId;
    if (dto.diagnosisCode || dto.diagnosisLabel) {
      const diagnosis = await this.prisma.diagnosis.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: dto.diagnosisCode ?? `DX-${Date.now()}`
          }
        },
        create: {
          tenantId,
          code: dto.diagnosisCode ?? `DX-${Date.now()}`,
          label: dto.diagnosisLabel ?? dto.diagnosisCode ?? "Diagnostic"
        },
        update: {
          label: dto.diagnosisLabel ?? undefined
        }
      });
      diagnosisId = diagnosis.id;
    }

    const updated = await this.prisma.consultation.update({
      where: { id },
      data: {
        symptoms: dto.symptoms,
        notes: dto.notes,
        doctorPrivateNote: dto.doctorPrivateNote,
        diagnosisId,
        vitalSigns:
          dto.bloodPressure ||
          dto.pulseBpm !== undefined ||
          dto.temperatureC !== undefined ||
          dto.weightKg !== undefined ||
          dto.heightCm !== undefined
            ? existing.vitalSigns
              ? {
                  update: {
                    bloodPressure: dto.bloodPressure,
                    pulseBpm: dto.pulseBpm,
                    temperatureC: dto.temperatureC,
                    weightKg: dto.weightKg,
                    heightCm: dto.heightCm
                  }
                }
              : {
                  create: {
                    tenantId,
                    bloodPressure: dto.bloodPressure,
                    pulseBpm: dto.pulseBpm,
                    temperatureC: dto.temperatureC,
                    weightKg: dto.weightKg,
                    heightCm: dto.heightCm
                  }
                }
            : undefined
      },
      include: {
        patient: true,
        doctor: true,
        diagnosis: true,
        vitalSigns: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "Consultation",
      entityId: id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return updated;
  }

  async quickTemplates(tenantId: string): Promise<unknown> {
    const templates = await this.prisma.consultation.findMany({
      where: {
        tenantId,
        notes: {
          not: null
        }
      },
      select: {
        id: true,
        symptoms: true,
        notes: true,
        diagnosis: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    });

    return templates.map((item) => ({
      id: item.id,
      label: item.diagnosis?.label ?? item.symptoms,
      content: item.notes,
      symptoms: item.symptoms
    }));
  }

  async complete(
    tenantId: string,
    actorUserId: string,
    id: string
  ): Promise<unknown> {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id, tenantId }
    });

    if (!consultation) {
      throw new NotFoundException("Consultation not found");
    }

    if (consultation.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: consultation.appointmentId },
        data: {
          status: "DONE"
        }
      });
    }

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "COMPLETE",
      entity: "Consultation",
      entityId: id
    });

    return this.findOne(tenantId, id);
  }
}
