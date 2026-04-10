import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, RoleName } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { SearchPatientsDto } from "./dto/search-patients.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async search(tenantId: string, query: SearchPatientsDto): Promise<{
    items: unknown[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: Prisma.PatientWhereInput = {
      tenantId
    };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { ficheNumber: { contains: query.search } },
        { cnamNumber: { contains: query.search } },
        { phone: { contains: query.search } }
      ];
    }

    if (query.ficheNumber) {
      where.ficheNumber = { contains: query.ficheNumber };
    }

    if (query.phone) {
      where.phone = { contains: query.phone };
    }

    if (query.cnamNumber) {
      where.cnamNumber = { contains: query.cnamNumber };
    }

    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined
      };
    }

    if (query.lastVisitFrom || query.lastVisitTo) {
      where.lastVisitAt = {
        gte: query.lastVisitFrom ? new Date(query.lastVisitFrom) : undefined,
        lte: query.lastVisitTo ? new Date(query.lastVisitTo) : undefined
      };
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.patient.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreatePatientDto,
    actorRole?: string
  ): Promise<unknown> {
    const safeDto = this.sanitizeCreateDto(dto, actorRole);

    const existing = await this.prisma.patient.findUnique({
      where: {
        tenantId_ficheNumber: {
          tenantId,
          ficheNumber: safeDto.ficheNumber
        }
      }
    });

    if (existing) {
      throw new ConflictException("Patient fiche already exists");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          tenantId,
          ficheNumber: safeDto.ficheNumber,
          cnamNumber: safeDto.cnamNumber,
          nationalId: safeDto.nationalId,
          firstName: safeDto.firstName,
          lastName: safeDto.lastName,
          dateOfBirth: new Date(safeDto.dateOfBirth),
          phone: safeDto.phone,
          address: safeDto.address,
          insuranceProvider: safeDto.insuranceProvider,
          insurancePolicyNumber: safeDto.insurancePolicyNumber
        }
      });

      if (safeDto.medicalHistory) {
        await tx.medicalHistory.create({
          data: {
            tenantId,
            patientId: patient.id,
            notes: safeDto.medicalHistory
          }
        });
      }

      if (safeDto.allergies && safeDto.allergies.length > 0) {
        await tx.allergy.createMany({
          data: safeDto.allergies.map((name) => ({
            tenantId,
            patientId: patient.id,
            name
          }))
        });
      }

      if (safeDto.chronicTreatments && safeDto.chronicTreatments.length > 0) {
        await tx.chronicTreatment.createMany({
          data: safeDto.chronicTreatments.map((label) => ({
            tenantId,
            patientId: patient.id,
            label
          }))
        });
      }

      return tx.patient.findUniqueOrThrow({
        where: { id: patient.id },
        include: {
          medicalHistory: true,
          allergies: true,
          chronicTreatments: true,
          insurance: true
        }
      });
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Patient",
      entityId: String((created as { id: string }).id),
      afterData: safeDto as unknown as Record<string, unknown>
    });

    return created;
  }

  async findOne(
    tenantId: string,
    patientId: string,
    actorRole?: string
  ): Promise<unknown> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId
      },
      include: {
        medicalHistory: true,
        allergies: true,
        chronicTreatments: true,
        insurance: true,
        appointments: {
          orderBy: { startAt: "desc" },
          take: 20
        },
        consultations: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { lines: true }
        },
        generatedDocs: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        files: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            uploadedBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 20
        }
      }
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    if (actorRole === RoleName.SECRETARY) {
      return this.redactForSecretary(patient);
    }

    return patient;
  }

  async update(
    tenantId: string,
    actorUserId: string,
    patientId: string,
    dto: UpdatePatientDto,
    actorRole?: string
  ): Promise<unknown> {
    const safeDto = this.sanitizeUpdateDto(dto, actorRole);

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId
      },
      include: {
        medicalHistory: true,
        allergies: true,
        chronicTreatments: true
      }
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const base = await tx.patient.update({
        where: { id: patient.id },
        data: {
          cnamNumber: safeDto.cnamNumber,
          nationalId: safeDto.nationalId,
          firstName: safeDto.firstName,
          lastName: safeDto.lastName,
          dateOfBirth: safeDto.dateOfBirth ? new Date(safeDto.dateOfBirth) : undefined,
          phone: safeDto.phone,
          address: safeDto.address,
          insuranceProvider: safeDto.insuranceProvider,
          insurancePolicyNumber: safeDto.insurancePolicyNumber,
          lastVisitAt: new Date()
        }
      });

      if (safeDto.medicalHistory !== undefined) {
        if (patient.medicalHistory) {
          await tx.medicalHistory.update({
            where: { patientId: patient.id },
            data: { notes: safeDto.medicalHistory }
          });
        } else {
          await tx.medicalHistory.create({
            data: {
              tenantId,
              patientId: patient.id,
              notes: safeDto.medicalHistory
            }
          });
        }
      }

      if (safeDto.allergies) {
        await tx.allergy.deleteMany({ where: { patientId: patient.id } });
        if (safeDto.allergies.length > 0) {
          await tx.allergy.createMany({
            data: safeDto.allergies.map((name) => ({
              tenantId,
              patientId: patient.id,
              name
            }))
          });
        }
      }

      if (safeDto.chronicTreatments) {
        await tx.chronicTreatment.deleteMany({ where: { patientId: patient.id } });
        if (safeDto.chronicTreatments.length > 0) {
          await tx.chronicTreatment.createMany({
            data: safeDto.chronicTreatments.map((label) => ({
              tenantId,
              patientId: patient.id,
              label
            }))
          });
        }
      }

      return base;
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "Patient",
      entityId: patientId,
      beforeData: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone
      },
      afterData: safeDto as unknown as Record<string, unknown>
    });

    return updated;
  }

  async remove(
    tenantId: string,
    actorUserId: string,
    patientId: string
  ): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId }
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    await this.prisma.patient.delete({ where: { id: patientId } });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "DELETE",
      entity: "Patient",
      entityId: patientId,
      beforeData: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        ficheNumber: patient.ficheNumber
      }
    });
  }

  private sanitizeCreateDto(dto: CreatePatientDto, actorRole?: string): CreatePatientDto {
    if (actorRole !== RoleName.SECRETARY) {
      return dto;
    }

    return {
      ficheNumber: dto.ficheNumber,
      cnamNumber: dto.cnamNumber,
      nationalId: dto.nationalId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      phone: dto.phone,
      address: dto.address,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicyNumber: dto.insurancePolicyNumber
    };
  }

  private sanitizeUpdateDto(dto: UpdatePatientDto, actorRole?: string): UpdatePatientDto {
    if (actorRole !== RoleName.SECRETARY) {
      return dto;
    }

    const { medicalHistory, allergies, chronicTreatments, ...safe } = dto;
    return safe;
  }

  private redactForSecretary(patient: any): any {
    return {
      ...patient,
      medicalHistory: null,
      allergies: [],
      chronicTreatments: [],
      consultations: (patient.consultations ?? []).map((consultation: any) => ({
        ...consultation,
        symptoms: undefined,
        notes: undefined,
        doctorPrivateNote: undefined
      })),
      files: (patient.files ?? []).filter((file: any) => file.isMedical !== true)
    };
  }
}
