import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SearchMedicationDto } from "./dto/search-medications.dto";
import { CreateInteractionDto } from "./dto/create-interaction.dto";
import { parse } from "csv-parse/sync";

interface ImportMapping {
  code: string;
  brandName: string;
  dciName?: string;
  dosageForm?: string;
  strength?: string;
  familyClass?: string;
  reimbursable?: string;
  cnamCode?: string;
  unitPrice?: string;
}

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listCatalogs(tenantId: string): Promise<unknown> {
    return this.prisma.medicationCatalog.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            items: true
          }
        },
        importLogs: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async searchItems(tenantId: string, query: SearchMedicationDto): Promise<unknown> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      tenantId,
      catalogId: query.catalogId,
      brandName: query.brandName ? { contains: query.brandName } : undefined,
      dciName: query.dciName ? { contains: query.dciName } : undefined,
      dosageForm: query.dosageForm ? { contains: query.dosageForm } : undefined,
      strength: query.strength ? { contains: query.strength } : undefined,
      familyClass: query.familyClass ? { contains: query.familyClass } : undefined,
      reimbursable:
        typeof query.reimbursable === "boolean" ? query.reimbursable : undefined,
      cnamCode: query.cnamCode ? { contains: query.cnamCode } : undefined,
      OR: query.search
        ? [
            { brandName: { contains: query.search } },
            { dciName: { contains: query.search } },
            { code: { contains: query.search } },
            { familyClass: { contains: query.search } }
          ]
        : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.medicationItem.findMany({
        where,
        include: {
          prices: {
            orderBy: { startsAt: "desc" },
            take: 1
          },
          catalog: true
        },
        orderBy: {
          brandName: "asc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.medicationItem.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  previewCsv(fileBuffer: Buffer): {
    headers: string[];
    sampleRows: Record<string, string>[];
  } {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    }) as Record<string, string>[];

    return {
      headers: records.length > 0 ? Object.keys(records[0]) : [],
      sampleRows: records.slice(0, 10)
    };
  }

  async importCsv(params: {
    tenantId: string;
    actorUserId: string;
    fileName: string;
    fileBuffer: Buffer;
    source: string;
    catalogVersion: string;
    mapping: ImportMapping;
  }): Promise<{
    catalogId: string;
    rows: number;
    success: number;
    failed: number;
  }> {
    const { tenantId, actorUserId, fileName, fileBuffer, source, catalogVersion, mapping } = params;

    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    }) as Record<string, string>[];

    const catalog = await this.prisma.medicationCatalog.create({
      data: {
        tenantId,
        importedByUserId: actorUserId,
        source,
        catalogVersion,
        sourceMetadata: {
          importedAt: new Date().toISOString(),
          fileName,
          mapping
        } as unknown as Prisma.InputJsonValue
      }
    });

    let success = 0;
    let failed = 0;

    for (const row of records) {
      try {
        const code = row[mapping.code];
        const brandName = row[mapping.brandName];

        if (!code || !brandName) {
          failed += 1;
          continue;
        }

        const createdItem = await this.prisma.medicationItem.create({
          data: {
            tenantId,
            catalogId: catalog.id,
            code,
            brandName,
            dciName: mapping.dciName ? row[mapping.dciName] : undefined,
            dosageForm: mapping.dosageForm ? row[mapping.dosageForm] : undefined,
            strength: mapping.strength ? row[mapping.strength] : undefined,
            familyClass: mapping.familyClass ? row[mapping.familyClass] : undefined,
            reimbursable: mapping.reimbursable
              ? ["1", "true", "yes", "oui"].includes(
                  String(row[mapping.reimbursable]).toLowerCase()
                )
              : false,
            cnamCode: mapping.cnamCode ? row[mapping.cnamCode] : undefined
          }
        });

        if (mapping.unitPrice && row[mapping.unitPrice]) {
          const parsedPrice = Number(String(row[mapping.unitPrice]).replace(",", "."));
          if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
            await this.prisma.medicationPrice.create({
              data: {
                tenantId,
                medicationItemId: createdItem.id,
                unitPrice: parsedPrice,
                reimbursementInfo: createdItem.reimbursable ? "Provided by import" : null
              }
            });
          }
        }

        success += 1;
      } catch {
        failed += 1;
      }
    }

    await this.prisma.catalogImportLog.create({
      data: {
        tenantId,
        catalogId: catalog.id,
        importedByUserId: actorUserId,
        fileName,
        status: failed === 0 ? "SUCCESS" : success > 0 ? "PARTIAL" : "FAILED",
        rowCount: records.length,
        successCount: success,
        failedCount: failed
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "IMPORT",
      entity: "MedicationCatalog",
      entityId: catalog.id,
      afterData: {
        source,
        catalogVersion,
        rows: records.length,
        success,
        failed
      }
    });

    return {
      catalogId: catalog.id,
      rows: records.length,
      success,
      failed
    };
  }

  async listInteractions(
    tenantId: string,
    itemId?: string,
    itemAId?: string,
    itemBId?: string
  ): Promise<unknown> {
    return this.prisma.medicationInteraction.findMany({
      where: {
        tenantId,
        OR: itemAId && itemBId
          ? [
              {
                medicationAId: itemAId,
                medicationBId: itemBId
              },
              {
                medicationAId: itemBId,
                medicationBId: itemAId
              }
            ]
          : itemId
            ? [
                {
                  medicationAId: itemId
                },
                {
                  medicationBId: itemId
                }
              ]
            : undefined
      },
      include: {
        medicationA: true,
        medicationB: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async createInteraction(
    tenantId: string,
    actorUserId: string,
    dto: CreateInteractionDto
  ): Promise<unknown> {
    const interaction = await this.prisma.medicationInteraction.upsert({
      where: {
        tenantId_medicationAId_medicationBId: {
          tenantId,
          medicationAId: dto.medicationAId,
          medicationBId: dto.medicationBId
        }
      },
      update: {
        severity: dto.severity,
        description: dto.description
      },
      create: {
        tenantId,
        medicationAId: dto.medicationAId,
        medicationBId: dto.medicationBId,
        severity: dto.severity,
        description: dto.description
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPSERT",
      entity: "MedicationInteraction",
      entityId: interaction.id,
      afterData: dto as unknown as Record<string, unknown>
    });

    return interaction;
  }
}
