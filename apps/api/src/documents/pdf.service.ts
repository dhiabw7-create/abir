import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentTemplateType } from "@prisma/client";
import PDFDocument from "pdfkit";
import { createWriteStream, promises as fsPromises } from "fs";
import path from "path";
import { randomUUID } from "crypto";

interface DocumentLayoutData {
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  doctorEmail?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientDob?: string;
  patientCin?: string;
  patientFiche?: string;
  patientCnam?: string;
  issueDate?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
  returnDate?: string;
  notes?: string;
}

@Injectable()
export class PdfService {
  constructor(private readonly configService: ConfigService) {}

  async generateDocumentPdf(input: {
    title: string;
    subtitle?: string;
    body: string;
    footer?: string;
    templateType?: DocumentTemplateType;
    layout?: DocumentLayoutData;
    metadata?: Record<string, string | number | undefined>;
  }): Promise<{ filePath: string; publicPath: string; fileName: string }> {
    const fileName = `${Date.now()}-${randomUUID()}.pdf`;
    const segment = "documents";
    const directory = await this.ensureDirectory(segment);
    const filePath = path.join(directory, fileName);
    const publicPath = `/uploads/${segment}/${fileName}`;

    await this.writePdf(filePath, (doc) => {
      if (this.isDoctorCertificateTemplate(input.templateType)) {
        this.renderDoctorCertificate(doc, input);
      } else {
        this.renderGenericDocument(doc, input);
      }
    });

    return {
      filePath: filePath.replace(/\\/g, "/"),
      publicPath,
      fileName
    };
  }

  async generatePrescriptionPdf(input: {
    doctorName: string;
    patientName: string;
    patientFiche: string;
    notes?: string;
    lines: Array<{
      medicationLabel: string;
      dose: string;
      frequency: string;
      durationDays: number;
      instructions?: string;
      quantity: number;
      lineTotal?: number | null;
    }>;
    estimatedTotal: number;
  }): Promise<{ filePath: string; publicPath: string; fileName: string }> {
    const fileName = `${Date.now()}-${randomUUID()}-prescription.pdf`;
    const segment = "prescriptions";
    const directory = await this.ensureDirectory(segment);
    const filePath = path.join(directory, fileName);
    const publicPath = `/uploads/${segment}/${fileName}`;

    await this.writePdf(filePath, (doc) => {
      doc.fontSize(18).font("Helvetica-Bold").text("Ordonnance", { align: "center" });
      doc.moveDown(0.8);
      doc.fontSize(11).font("Helvetica").text(`Medecin: ${input.doctorName}`);
      doc.text(`Patient: ${input.patientName}`);
      doc.text(`Fiche: ${input.patientFiche}`);
      doc.text(`Date: ${new Date().toLocaleDateString("fr-TN")}`);
      doc.moveDown(1);

      input.lines.forEach((line, index) => {
        doc.font("Helvetica-Bold").text(`${index + 1}. ${line.medicationLabel}`);
        doc
          .font("Helvetica")
          .text(`Dose: ${line.dose} | Frequence: ${line.frequency} | Duree: ${line.durationDays} jours`)
          .text(`Quantite: ${line.quantity}${line.lineTotal ? ` | Total: ${line.lineTotal.toFixed(3)} TND` : ""}`);
        if (line.instructions) {
          doc.text(`Instructions: ${line.instructions}`);
        }
        doc.moveDown(0.6);
      });

      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").text(`Total estime: ${input.estimatedTotal.toFixed(3)} TND`);
      if (input.notes) {
        doc.moveDown(0.5).font("Helvetica").text(`Notes: ${input.notes}`);
      }
      doc.moveDown(2);
      doc.fontSize(9).fillColor("#555").text("This software does not provide medical advice.", {
        align: "center"
      });
    });

    return {
      filePath: filePath.replace(/\\/g, "/"),
      publicPath,
      fileName
    };
  }

  private renderGenericDocument(
    doc: PDFKit.PDFDocument,
    input: {
      title: string;
      subtitle?: string;
      body: string;
      footer?: string;
      metadata?: Record<string, string | number | undefined>;
    }
  ): void {
    doc.fontSize(16).font("Helvetica-Bold").text(input.title, { align: "left" });
    if (input.subtitle) {
      doc.moveDown(0.5).fontSize(11).font("Helvetica").fillColor("#666").text(input.subtitle);
      doc.fillColor("black");
    }

    if (input.metadata) {
      doc.moveDown(0.5);
      Object.entries(input.metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          doc.fontSize(10).font("Helvetica").text(`${key}: ${value}`);
        }
      });
    }

    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica").text(input.body, {
      lineGap: 4,
      align: "left"
    });

    if (input.footer) {
      doc.moveDown(2);
      doc.fontSize(10).fillColor("#555").text(input.footer, { align: "center" });
      doc.fillColor("black");
    }
  }

  private renderDoctorCertificate(
    doc: PDFKit.PDFDocument,
    input: {
      title: string;
      subtitle?: string;
      body: string;
      footer?: string;
      templateType?: DocumentTemplateType;
      layout?: DocumentLayoutData;
    }
  ): void {
    const layout = input.layout ?? {};
    const margin = 44;
    const pageWidth = doc.page.width - margin * 2;
    const patientFullName =
      `${layout.patientFirstName ?? ""} ${layout.patientLastName ?? ""}`.trim() || "................................";
    const doctorName = layout.doctorName?.trim() || "................................";
    const issueDate = layout.issueDate?.trim() || new Date().toLocaleDateString("fr-TN");
    const reference = this.buildDocumentReference(doctorName);

    doc.save();
    doc.rect(margin - 16, margin - 20, pageWidth + 32, doc.page.height - (margin * 2) + 24)
      .lineWidth(1)
      .stroke("#C9D4E5");
    doc.restore();

    doc.save();
    doc.rect(margin - 16, margin - 20, pageWidth + 32, 84).fill("#F4F8FF");
    doc.restore();

    const headerName = layout.clinicName?.trim() || `Cabinet Dr ${doctorName}`;
    const clinicAddress = layout.clinicAddress?.trim();
    const contactPhone = layout.doctorPhone?.trim() || layout.clinicPhone?.trim() || "Telephone non renseigne";
    const contactEmail = layout.doctorEmail?.trim();

    doc.fillColor("#0F172A");
    doc.font("Helvetica-Bold").fontSize(9).text("REPUBLIQUE TUNISIENNE", margin, margin - 6);
    doc.font("Helvetica-Bold").fontSize(11).text(headerName, margin, margin + 10, {
      width: pageWidth * 0.65
    });
    doc.font("Helvetica").fontSize(9).fillColor("#334155");
    doc.text(`Medecin: Dr ${doctorName}`, margin, margin + 28, { width: pageWidth * 0.65 });
    if (clinicAddress) {
      doc.text(`Adresse: ${clinicAddress}`, margin, margin + 42, { width: pageWidth * 0.65 });
      doc.text(`Tel: ${contactPhone}${contactEmail ? ` | Email: ${contactEmail}` : ""}`, margin, margin + 56, {
        width: pageWidth * 0.65
      });
    } else {
      doc.text(`Tel: ${contactPhone}${contactEmail ? ` | Email: ${contactEmail}` : ""}`, margin, margin + 44, {
        width: pageWidth * 0.65
      });
    }

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F172A");
    doc.text(`Reference: ${reference}`, margin + pageWidth * 0.68, margin + 8, {
      width: pageWidth * 0.32,
      align: "right"
    });
    doc.font("Helvetica").fontSize(9).fillColor("#334155");
    doc.text(`Date: ${issueDate}`, margin + pageWidth * 0.68, margin + 24, {
      width: pageWidth * 0.32,
      align: "right"
    });

    doc.moveTo(margin - 16, margin + 66).lineTo(margin + pageWidth + 16, margin + 66).lineWidth(1).stroke("#C9D4E5");

    const documentTitle = this.getCertificateTitle(input.templateType, input.title);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0F172A");
    doc.text(documentTitle, margin, margin + 74, {
      width: pageWidth,
      align: "center"
    });
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    doc.text("Modele clinique - format impression", margin, margin + 98, {
      width: pageWidth,
      align: "center"
    });

    let currentY = margin + 126;
    currentY = this.drawIdentityBlock(doc, currentY, pageWidth, margin, {
      patientFullName,
      patientDob: layout.patientDob,
      patientCin: layout.patientCin,
      patientFiche: layout.patientFiche,
      patientCnam: layout.patientCnam,
      doctorName
    });

    const body = this.getStructuredBodyText(input.templateType, {
      patientFullName,
      doctorName,
      issueDate,
      days: layout.days,
      startDate: layout.startDate,
      endDate: layout.endDate,
      returnDate: layout.returnDate,
      defaultBody: input.body
    });
    currentY = this.drawBodyBlock(doc, currentY, pageWidth, margin, body);

    const notes = layout.notes?.trim();
    if (notes) {
      currentY = this.drawBodyBlock(doc, currentY, pageWidth, margin, `Observations:\n${notes}`, 86);
    }

    this.drawSignatureBlock(doc, Math.max(currentY + 6, doc.page.height - 188), pageWidth, margin, doctorName, issueDate);
    this.drawFooterLine(doc, margin, pageWidth, input.footer);
  }

  private drawIdentityBlock(
    doc: PDFKit.PDFDocument,
    y: number,
    pageWidth: number,
    x: number,
    data: {
      patientFullName: string;
      patientDob?: string;
      patientCin?: string;
      patientFiche?: string;
      patientCnam?: string;
      doctorName: string;
    }
  ): number {
    doc.roundedRect(x, y, pageWidth, 94, 8).lineWidth(0.9).stroke("#CBD5E1");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A");
    doc.text("Identite Patient", x + 12, y + 10);

    doc.font("Helvetica").fontSize(10).fillColor("#1E293B");
    doc.text(`Nom et Prenom: ${data.patientFullName}`, x + 12, y + 30, {
      width: pageWidth * 0.57
    });
    doc.text(`Date de naissance: ${data.patientDob?.trim() || "-"}`, x + 12, y + 48, {
      width: pageWidth * 0.57
    });
    doc.text(`CIN: ${data.patientCin?.trim() || "-"}`, x + 12, y + 66, {
      width: pageWidth * 0.57
    });

    const rightX = x + pageWidth * 0.58;
    const rightWidth = pageWidth * 0.38;
    doc.text(`N. fiche: ${data.patientFiche?.trim() || "-"}`, rightX, y + 30, {
      width: rightWidth
    });
    doc.text(`CNAM: ${data.patientCnam?.trim() || "-"}`, rightX, y + 48, {
      width: rightWidth
    });
    doc.text(`Medecin: Dr ${data.doctorName}`, rightX, y + 66, {
      width: rightWidth
    });

    return y + 106;
  }

  private drawBodyBlock(
    doc: PDFKit.PDFDocument,
    y: number,
    pageWidth: number,
    x: number,
    body: string,
    minHeight = 118
  ): number {
    const textWidth = pageWidth - 24;
    const textHeight = doc.heightOfString(body, {
      width: textWidth,
      align: "justify",
      lineGap: 4
    });
    const blockHeight = Math.max(minHeight, textHeight + 24);

    doc.roundedRect(x, y, pageWidth, blockHeight, 8).lineWidth(0.9).stroke("#CBD5E1");
    doc.font("Helvetica").fontSize(11).fillColor("#111827");
    doc.text(body, x + 12, y + 12, {
      width: textWidth,
      align: "justify",
      lineGap: 4
    });

    return y + blockHeight + 12;
  }

  private drawSignatureBlock(
    doc: PDFKit.PDFDocument,
    y: number,
    pageWidth: number,
    x: number,
    doctorName: string,
    issueDate: string
  ): void {
    const columnWidth = (pageWidth - 12) / 2;

    doc.roundedRect(x, y, columnWidth, 96, 8).lineWidth(0.9).stroke("#CBD5E1");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A");
    doc.text("Tampon Clinique", x + 12, y + 12);
    doc.font("Helvetica").fontSize(9).fillColor("#334155");
    doc.text("Zone reservee au cachet", x + 12, y + 30, { width: columnWidth - 24 });

    const rightX = x + columnWidth + 12;
    doc.roundedRect(rightX, y, columnWidth, 96, 8).lineWidth(0.9).stroke("#CBD5E1");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A");
    doc.text("Signature Medecin", rightX + 12, y + 12);
    doc.font("Helvetica").fontSize(9).fillColor("#334155");
    doc.text(`Fait le: ${issueDate}`, rightX + 12, y + 32, { width: columnWidth - 24 });
    doc.text(`Dr ${doctorName}`, rightX + 12, y + 50, { width: columnWidth - 24 });
    doc.text("Signature et cachet", rightX + 12, y + 68, { width: columnWidth - 24 });
  }

  private drawFooterLine(doc: PDFKit.PDFDocument, x: number, pageWidth: number, footer?: string): void {
    const y = doc.page.height - 58;
    doc.moveTo(x, y).lineTo(x + pageWidth, y).lineWidth(0.8).stroke("#CBD5E1");
    doc.font("Helvetica").fontSize(8).fillColor("#475569");
    doc.text(footer?.trim() || "Document medical genere numeriquement", x, y + 8, {
      width: pageWidth,
      align: "center"
    });
    doc.text("This software does not provide medical advice.", x, y + 21, {
      width: pageWidth,
      align: "center"
    });
  }

  private getStructuredBodyText(
    templateType: DocumentTemplateType | undefined,
    input: {
      patientFullName: string;
      doctorName: string;
      issueDate: string;
      days?: number;
      startDate?: string;
      endDate?: string;
      returnDate?: string;
      defaultBody: string;
    }
  ): string {
    const patient = input.patientFullName;
    const doctor = input.doctorName;
    const date = input.issueDate;

    if (templateType === DocumentTemplateType.MEDICAL_CERTIFICATE) {
      return [
        `Je soussigne Dr ${doctor}, certifie avoir examine le patient ${patient} en date du ${date}.`,
        "L'etat de sante constate ce jour justifie l'emission du present certificat.",
        "Ce document est delivre a la demande de l'interesse(e) pour servir et valoir ce que de droit."
      ].join("\n\n");
    }

    if (templateType === DocumentTemplateType.SICK_LEAVE) {
      const days = input.days ?? 3;
      const startDate = input.startDate?.trim() || date;
      const endDate = input.endDate?.trim() || date;
      return [
        `Je soussigne Dr ${doctor}, certifie que l'etat de sante de ${patient} necessite un arret de travail.`,
        `Duree prescrite: ${days} jour(s), du ${startDate} au ${endDate} inclus.`,
        "Le patient doit respecter le repos et le traitement prescrits durant cette periode."
      ].join("\n\n");
    }

    if (templateType === DocumentTemplateType.SCHOOL_CERTIFICATE) {
      const returnDate = input.returnDate?.trim() || date;
      return [
        `Je soussigne Dr ${doctor}, certifie avoir examine ${patient} le ${date}.`,
        `Un repos temporaire est recommande. Reprise scolaire autorisee a partir du ${returnDate}.`,
        "Le present certificat est remis pour justification administrative scolaire."
      ].join("\n\n");
    }

    if (templateType === DocumentTemplateType.FITNESS_CERTIFICATE) {
      return [
        `Je soussigne Dr ${doctor}, certifie avoir examine ${patient} le ${date}.`,
        "A ce jour, aucune contre-indication clinique n'est constatee pour la pratique des activites sportives usuelles.",
        "Ce certificat est delivre pour usage administratif."
      ].join("\n\n");
    }

    return input.defaultBody;
  }

  private getCertificateTitle(templateType: DocumentTemplateType | undefined, fallbackTitle: string): string {
    if (templateType === DocumentTemplateType.MEDICAL_CERTIFICATE) {
      return "CERTIFICAT MEDICAL";
    }
    if (templateType === DocumentTemplateType.SICK_LEAVE) {
      return "CERTIFICAT D'ARRET DE TRAVAIL";
    }
    if (templateType === DocumentTemplateType.SCHOOL_CERTIFICATE) {
      return "CERTIFICAT SCOLAIRE";
    }
    if (templateType === DocumentTemplateType.FITNESS_CERTIFICATE) {
      return "CERTIFICAT D'APTITUDE SPORTIVE";
    }
    return fallbackTitle.toUpperCase();
  }

  private buildDocumentReference(doctorName: string): string {
    const initials = doctorName
      .split(/\s+/)
      .filter((item) => item.length > 0)
      .map((item) => item[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3) || "DOC";
    return `${initials}-${Date.now().toString().slice(-8)}`;
  }

  private isDoctorCertificateTemplate(
    templateType: DocumentTemplateType | undefined
  ): boolean {
    return (
      templateType === DocumentTemplateType.MEDICAL_CERTIFICATE ||
      templateType === DocumentTemplateType.SICK_LEAVE ||
      templateType === DocumentTemplateType.SCHOOL_CERTIFICATE ||
      templateType === DocumentTemplateType.FITNESS_CERTIFICATE
    );
  }

  private async ensureDirectory(segment: string): Promise<string> {
    const base = this.configService.get<string>("STORAGE_LOCAL_PATH") ?? "./uploads";
    const directory = path.join(base, segment);
    await fsPromises.mkdir(directory, { recursive: true });
    return directory;
  }

  private async writePdf(
    filePath: string,
    callback: (doc: PDFKit.PDFDocument) => void
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);
      callback(doc);
      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });
  }
}
