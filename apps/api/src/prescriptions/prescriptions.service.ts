import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PdfService } from "../documents/pdf.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";
import { ListPrescriptionsDto } from "./dto/list-prescriptions.dto";

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pdfService: PdfService
  ) {}

  async list(tenantId: string, query: ListPrescriptionsDto): Promise<unknown> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      tenantId,
      patientId: query.patientId,
      doctorId: query.doctorId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined
            }
          : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          lines: true,
          consultation: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.prescription.count({ where })
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
    dto: CreatePrescriptionDto
  ): Promise<unknown> {
    const preparedLines = await Promise.all(
      dto.lines.map(async (line) => {
        let unitPrice = line.unitPrice;
        let label = line.medicationLabel;

        if (line.medicationItemId) {
          const item = await this.prisma.medicationItem.findFirst({
            where: {
              id: line.medicationItemId,
              tenantId
            },
            include: {
              prices: {
                orderBy: { startsAt: "desc" },
                take: 1
              }
            }
          });

          if (item) {
            label = line.medicationLabel || item.brandName;
            if (unitPrice === undefined && item.prices.length > 0) {
              unitPrice = Number(item.prices[0].unitPrice);
            }
          }
        }

        const lineTotal =
          unitPrice !== undefined ? Number((unitPrice * line.quantity).toFixed(3)) : null;

        return {
          medicationItemId: line.medicationItemId,
          medicationLabel: label,
          dose: line.dose,
          frequency: line.frequency,
          durationDays: line.durationDays,
          instructions: line.instructions,
          quantity: line.quantity,
          unitPrice,
          lineTotal
        };
      })
    );

    const estimatedTotal = preparedLines.reduce((sum, line) => {
      if (!line.lineTotal) {
        return sum;
      }
      return sum + line.lineTotal;
    }, 0);

    const prescription = await this.prisma.prescription.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        consultationId: dto.consultationId,
        notes: dto.notes,
        estimatedTotal,
        lines: {
          create: preparedLines.map((line) => ({
            tenantId,
            medicationItemId: line.medicationItemId,
            medicationLabel: line.medicationLabel,
            dose: line.dose,
            frequency: line.frequency,
            durationDays: line.durationDays,
            instructions: line.instructions,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal
          }))
        }
      },
      include: {
        patient: true,
        doctor: true,
        lines: true,
        consultation: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "Prescription",
      entityId: prescription.id,
      afterData: {
        patientId: prescription.patientId,
        estimatedTotal: Number(prescription.estimatedTotal)
      }
    });

    return prescription;
  }

  async findOne(tenantId: string, id: string): Promise<unknown> {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        patient: true,
        doctor: true,
        lines: true,
        consultation: true
      }
    });

    if (!prescription) {
      throw new NotFoundException("Prescription not found");
    }

    return prescription;
  }

  async generatePdf(
    tenantId: string,
    actorUserId: string,
    id: string
  ): Promise<unknown> {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        doctor: true,
        lines: true
      }
    });

    if (!prescription) {
      throw new NotFoundException("Prescription not found");
    }

    const pdf = await this.pdfService.generatePrescriptionPdf({
      doctorName: `${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      patientFiche: prescription.patient.ficheNumber,
      notes: prescription.notes ?? undefined,
      lines: prescription.lines.map((line) => ({
        medicationLabel: line.medicationLabel,
        dose: line.dose,
        frequency: line.frequency,
        durationDays: line.durationDays,
        instructions: line.instructions ?? undefined,
        quantity: line.quantity,
        lineTotal: line.lineTotal ? Number(line.lineTotal) : null
      })),
      estimatedTotal: Number(prescription.estimatedTotal)
    });

    const attachment = await this.prisma.fileAttachment.create({
      data: {
        tenantId,
        patientId: prescription.patientId,
        consultationId: prescription.consultationId,
        uploadedByUserId: actorUserId,
        category: "PRESCRIPTION_PDF",
        fileName: pdf.fileName,
        mimeType: "application/pdf",
        fileSize: 0,
        storagePath: pdf.filePath,
        isMedical: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "EXPORT_PDF",
      entity: "Prescription",
      entityId: id,
      afterData: {
        attachmentId: attachment.id,
        filePath: pdf.publicPath
      }
    });

    return {
      prescriptionId: id,
      filePath: pdf.publicPath,
      fileName: pdf.fileName,
      attachmentId: attachment.id
    };
  }
}
