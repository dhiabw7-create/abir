import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DocumentLanguage,
  DocumentTemplate,
  DocumentTemplateType,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PdfService } from "./pdf.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { GenerateByTypeDto } from "./dto/generate-by-type.dto";
import { GenerateDocumentDto } from "./dto/generate-document.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";

const DOCTOR_QUICK_TEMPLATE_SPECS: Array<{
  type: DocumentTemplateType;
  name: string;
  language: DocumentLanguage;
  body: string;
  footer: string;
}> = [
  {
    type: DocumentTemplateType.MEDICAL_CERTIFICATE,
    name: "Certificat Medical (Tunisie - Standard)",
    language: DocumentLanguage.FR,
    body:
      "Je soussigne Dr {{doctor.firstName}} {{doctor.lastName}}, certifie avoir examine {{patient.firstName}} {{patient.lastName}} le {{date}}.",
    footer: "Modele generique non officiel - MedFlow"
  },
  {
    type: DocumentTemplateType.SICK_LEAVE,
    name: "Certificat d'Arret de Travail (Tunisie - Standard)",
    language: DocumentLanguage.FR,
    body:
      "Je prescris un arret de travail de {{payload.days}} jours pour {{patient.firstName}} {{patient.lastName}}, du {{payload.startDate}} au {{payload.endDate}}.",
    footer: "Modele generique non officiel - MedFlow"
  },
  {
    type: DocumentTemplateType.SCHOOL_CERTIFICATE,
    name: "Certificat Scolaire (Tunisie - Standard)",
    language: DocumentLanguage.FR,
    body:
      "Certifie que {{patient.firstName}} {{patient.lastName}} a ete examine(e) le {{date}} et peut reprendre les cours a partir du {{payload.returnDate}}.",
    footer: "Modele generique non officiel - MedFlow"
  },
  {
    type: DocumentTemplateType.FITNESS_CERTIFICATE,
    name: "Certificat d'Aptitude Sportive (Tunisie - Standard)",
    language: DocumentLanguage.FR,
    body:
      "Apres examen clinique du {{date}}, {{patient.firstName}} {{patient.lastName}} est declare(e) apte aux activites physiques et sportives.",
    footer: "Modele generique non officiel - MedFlow"
  }
];

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pdfService: PdfService
  ) {}

  async listTemplates(tenantId: string, includeGlobal: boolean): Promise<unknown> {
    return this.prisma.documentTemplate.findMany({
      where: {
        tenantId,
        OR: includeGlobal
          ? [
              { isGlobalLibrary: true },
              { isGlobalLibrary: false }
            ]
          : undefined
      },
      orderBy: [
        { isGlobalLibrary: "desc" },
        { updatedAt: "desc" }
      ]
    });
  }

  async createTemplate(
    tenantId: string,
    actorUserId: string,
    dto: CreateTemplateDto
  ): Promise<unknown> {
    const template = await this.prisma.documentTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        language: dto.language,
        body: dto.body,
        footer: dto.footer,
        isGlobalLibrary: dto.isGlobalLibrary ?? false
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "DocumentTemplate",
      entityId: template.id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return template;
  }

  async updateTemplate(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateTemplateDto
  ): Promise<unknown> {
    const existing = await this.prisma.documentTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException("Template not found");
    }

    const updated = await this.prisma.documentTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        language: dto.language,
        body: dto.body,
        footer: dto.footer,
        isGlobalLibrary: dto.isGlobalLibrary
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "DocumentTemplate",
      entityId: id,
      beforeData: {
        name: existing.name,
        type: existing.type
      },
      afterData: dto as unknown as Record<string, unknown>
    });

    return updated;
  }

  async deleteTemplate(
    tenantId: string,
    actorUserId: string,
    id: string
  ): Promise<void> {
    const existing = await this.prisma.documentTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException("Template not found");
    }

    await this.prisma.documentTemplate.delete({ where: { id } });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "DELETE",
      entity: "DocumentTemplate",
      entityId: id
    });
  }

  async listGenerated(tenantId: string): Promise<unknown> {
    return this.prisma.generatedDocument.findMany({
      where: { tenantId },
      include: {
        patient: true,
        doctor: true,
        template: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async listDoctorQuickTemplates(
    tenantId: string,
    actorUserId: string
  ): Promise<unknown> {
    const templates = await this.ensureDoctorQuickTemplates(tenantId, actorUserId);

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      type: template.type,
      language: template.language,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }

  async generateByType(
    tenantId: string,
    actorUserId: string,
    dto: GenerateByTypeDto
  ): Promise<unknown> {
    const templates = await this.ensureDoctorQuickTemplates(tenantId, actorUserId);
    const template = templates.find((item) => item.type === dto.type);

    if (!template) {
      throw new NotFoundException("Quick template not found for selected type");
    }

    const now = new Date();
    const days = dto.days ?? 3;
    const startDate = this.formatDate(now);
    const endDateObj = new Date(now);
    endDateObj.setDate(endDateObj.getDate() + Math.max(days - 1, 0));
    const returnDateObj = new Date(now);
    returnDateObj.setDate(returnDateObj.getDate() + 1);

    return this.generateDocument(tenantId, actorUserId, {
      patientId: dto.patientId,
      templateId: template.id,
      consultationId: dto.consultationId,
      payload: {
        days,
        startDate,
        endDate: this.formatDate(endDateObj),
        returnDate: this.formatDate(returnDateObj),
        notes: dto.notes ?? "",
        ...(dto.payload ?? {})
      }
    });
  }

  async generateDocument(
    tenantId: string,
    actorUserId: string,
    dto: GenerateDocumentDto
  ): Promise<unknown> {
    const [template, patient, doctor, tenantSetting] = await Promise.all([
      this.prisma.documentTemplate.findFirst({
        where: {
          id: dto.templateId,
          tenantId
        }
      }),
      this.prisma.patient.findFirst({
        where: {
          id: dto.patientId,
          tenantId
        }
      }),
      this.prisma.user.findFirst({
        where: {
          id: actorUserId,
          tenantId
        }
      }),
      this.prisma.tenantSetting.findUnique({
        where: { tenantId }
      })
    ]);

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    if (!patient || !doctor) {
      throw new NotFoundException("Context entities not found");
    }

    const payload = this.extractPayload(dto.payload);
    const payloadDays = this.toPositiveNumber(payload.days);
    const payloadStartDate = this.toOptionalString(payload.startDate);
    const payloadEndDate = this.toOptionalString(payload.endDate);
    const payloadReturnDate = this.toOptionalString(payload.returnDate);
    const payloadNotes = this.toOptionalString(payload.notes);
    const payloadDoctorAddress = this.toOptionalString(payload.doctorAddress);
    const payloadDoctorPhone = this.toOptionalString(payload.doctorPhone);

    const rendered = this.renderTemplate(template.body, {
      patient,
      doctor,
      payload: dto.payload,
      date: new Date().toLocaleDateString("fr-TN")
    });

    const title =
      dto.title ?? `${template.name} - ${patient.firstName} ${patient.lastName}`;

    const pdf = await this.pdfService.generateDocumentPdf({
      title,
      subtitle: `${template.type} - ${template.language}`,
      body: rendered,
      footer: template.footer ?? tenantSetting?.documentFooter ?? undefined,
      templateType: template.type,
      layout: {
        clinicName: `Cabinet Dr ${doctor.firstName} ${doctor.lastName}`,
        clinicAddress: payloadDoctorAddress,
        clinicPhone: payloadDoctorPhone ?? doctor.phone ?? undefined,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        doctorPhone: payloadDoctorPhone ?? doctor.phone ?? undefined,
        doctorEmail: doctor.email,
        patientFirstName: patient.firstName,
        patientLastName: patient.lastName,
        patientDob: this.formatDate(patient.dateOfBirth),
        patientCin: patient.nationalId ?? undefined,
        patientFiche: patient.ficheNumber,
        patientCnam: patient.cnamNumber ?? undefined,
        issueDate: this.formatDate(new Date()),
        days: payloadDays,
        startDate: payloadStartDate,
        endDate: payloadEndDate,
        returnDate: payloadReturnDate,
        notes: payloadNotes
      }
    });

    const generated = await this.prisma.generatedDocument.create({
      data: {
        tenantId,
        patientId: patient.id,
        doctorId: actorUserId,
        templateId: template.id,
        consultationId: dto.consultationId,
        title,
        payload: dto.payload as Prisma.InputJsonValue,
        filePath: pdf.publicPath
      },
      include: {
        patient: true,
        doctor: true,
        template: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "GENERATE",
      entity: "GeneratedDocument",
      entityId: generated.id,
      afterData: {
        templateId: template.id,
        patientId: patient.id,
        filePath: pdf.publicPath
      }
    });

    return generated;
  }

  private async ensureDoctorQuickTemplates(
    tenantId: string,
    actorUserId: string
  ): Promise<DocumentTemplate[]> {
    const names = DOCTOR_QUICK_TEMPLATE_SPECS.map((item) => item.name);
    const existing = await this.prisma.documentTemplate.findMany({
      where: {
        tenantId,
        name: { in: names }
      }
    });

    const byName = new Map(existing.map((item) => [item.name, item]));

    for (const spec of DOCTOR_QUICK_TEMPLATE_SPECS) {
      if (byName.has(spec.name)) {
        continue;
      }

      const created = await this.prisma.documentTemplate.create({
        data: {
          tenantId,
          name: spec.name,
          type: spec.type,
          language: spec.language,
          body: spec.body,
          footer: spec.footer,
          isGlobalLibrary: false
        }
      });

      byName.set(spec.name, created);

      await this.auditService.log({
        tenantId,
        actorUserId,
        action: "CREATE",
        entity: "DocumentTemplate",
        entityId: created.id,
        afterData: {
          source: "doctor_quick_templates",
          type: created.type,
          name: created.name
        }
      });
    }

    return DOCTOR_QUICK_TEMPLATE_SPECS.map((spec) => byName.get(spec.name)).filter(
      (item): item is NonNullable<typeof item> => Boolean(item)
    );
  }

  private formatDate(value: Date): string {
    return value.toLocaleDateString("fr-TN");
  }

  renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/{{\s*([^}]+)\s*}}/g, (_, expression: string) => {
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

      if (typeof value === "string" || typeof value === "number") {
        return String(value);
      }

      return JSON.stringify(value);
    });
  }

  getPdfService(): PdfService {
    return this.pdfService;
  }

  private extractPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return payload as Record<string, unknown>;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private toPositiveNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return undefined;
  }
}
