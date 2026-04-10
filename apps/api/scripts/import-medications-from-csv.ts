import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

type CsvRow = Record<string, string | undefined>;
interface PendingPrice {
  code: string;
  unitPrice: number;
  reimbursementInfo?: string;
}

const prisma = new PrismaClient();

function clean(value: string | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slugCode(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function buildCode(row: CsvRow, index: number): string {
  const amm = clean(row["AMM"]);
  if (amm) {
    return amm.toUpperCase();
  }

  const nom = clean(row["Nom"]);
  const dosage = clean(row["Dosage"]);
  const forme = clean(row["Forme"]);
  const base = slugCode(`${nom}-${dosage}-${forme}`);
  return base || `ROW-${index + 1}`;
}

function buildFamilyClass(row: CsvRow): string | undefined {
  const major = clean(row["Classe"]);
  const minor = clean(row["Sous Classe"]);

  if (major && minor) {
    return `${major} > ${minor}`;
  }

  if (major) {
    return major;
  }

  if (minor) {
    return minor;
  }

  return undefined;
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parsePriceNumber(value: string | undefined): number | undefined {
  const raw = clean(value);
  if (!raw) {
    return undefined;
  }

  const compact = raw.replace(/\s+/g, "").replace(/[^0-9,.\-]/g, "");
  if (!compact) {
    return undefined;
  }

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");

  let normalized = compact;
  if (lastComma > lastDot) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = compact.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return Number(parsed.toFixed(3));
}

function extractPrice(row: CsvRow): number | undefined {
  const directHeaders = [
    "Prix",
    "Prix public",
    "Prix Public",
    "PPV",
    "PPA",
    "Price",
    "Tarif"
  ];

  for (const header of directHeaders) {
    const parsed = parsePriceNumber(row[header]);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  const fallbackKey = Object.keys(row).find((key) => {
    const normalized = normalizeHeader(key);
    return normalized.includes("prix") || normalized.includes("ppv") || normalized.includes("price") || normalized.includes("tarif");
  });

  if (!fallbackKey) {
    return undefined;
  }

  return parsePriceNumber(row[fallbackKey]);
}

async function main(): Promise<void> {
  const inputArg = process.argv[2];
  const tenantSlug = process.argv[3] ?? "clinique-el-amal";
  const source = process.argv[4] ?? "PHARMACIE_TUNISIE";
  const requestedVersion = process.argv[5];

  if (!inputArg) {
    throw new Error(
      "Usage: ts-node scripts/import-medications-from-csv.ts <csvPath> [tenantSlug] [source] [catalogVersion]"
    );
  }

  const csvPath = resolve(inputArg);
  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true, name: true }
  });

  if (!tenant) {
    throw new Error(`Tenant not found for slug: ${tenantSlug}`);
  }

  const actor = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true, email: true }
  });

  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0")
  ].join("");

  const catalogVersion = requestedVersion ?? `LISTE_AMM_${stamp}`;

  const csvBuffer = readFileSync(csvPath);
  const rows = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    bom: true
  }) as CsvRow[];

  const codeCounts = new Map<string, number>();
  const items: Prisma.MedicationItemCreateManyInput[] = [];
  const pendingPrices: PendingPrice[] = [];
  let failed = 0;

  rows.forEach((row, index) => {
    const brandName = clean(row["Nom"]);
    if (!brandName) {
      failed += 1;
      return;
    }

    const baseCode = buildCode(row, index);
    const seen = codeCounts.get(baseCode) ?? 0;
    codeCounts.set(baseCode, seen + 1);
    const code = seen === 0 ? baseCode : `${baseCode}-${seen + 1}`;

    const dosage = clean(row["Dosage"]);
    const form = clean(row["Forme"]);
    const dci = clean(row["DCI"]);
    const veic = clean(row["VEIC"]);

    items.push({
      tenantId: tenant.id,
      catalogId: "",
      code,
      brandName,
      dciName: dci || undefined,
      dosageForm: form || undefined,
      strength: dosage || undefined,
      familyClass: buildFamilyClass(row),
      reimbursable: Boolean(veic),
      cnamCode: veic || undefined
    });

    const unitPrice = extractPrice(row);
    if (unitPrice !== undefined) {
      pendingPrices.push({
        code,
        unitPrice,
        reimbursementInfo: veic || undefined
      });
    }
  });

  const catalog = await prisma.medicationCatalog.create({
    data: {
      tenantId: tenant.id,
      importedByUserId: actor?.id,
      source,
      catalogVersion,
      isDemo: false,
      sourceMetadata: {
        originalFilePath: csvPath,
        originalRows: rows.length,
        importedAt: now.toISOString(),
        tenantSlug: tenant.slug,
        note: "Imported from XLS converted to CSV"
      } as Prisma.InputJsonValue
    }
  });

  const withCatalogId = items.map((item) => ({
    ...item,
    catalogId: catalog.id
  }));

  let insertedCount = 0;
  const chunkSize = 300;

  for (let index = 0; index < withCatalogId.length; index += chunkSize) {
    const chunk = withCatalogId.slice(index, index + chunkSize);
    const result = await prisma.medicationItem.createMany({
      data: chunk,
      skipDuplicates: true
    });
    insertedCount += result.count;
  }

  let insertedPriceCount = 0;
  if (pendingPrices.length > 0) {
    const importedItems = await prisma.medicationItem.findMany({
      where: {
        tenantId: tenant.id,
        catalogId: catalog.id
      },
      select: {
        id: true,
        code: true
      }
    });

    const itemIdByCode = new Map(importedItems.map((item) => [item.code, item.id]));
    const seenItemIds = new Set<string>();
    const pricesToCreate: Prisma.MedicationPriceCreateManyInput[] = [];

    for (const price of pendingPrices) {
      const medicationItemId = itemIdByCode.get(price.code);
      if (!medicationItemId || seenItemIds.has(medicationItemId)) {
        continue;
      }

      seenItemIds.add(medicationItemId);
      pricesToCreate.push({
        tenantId: tenant.id,
        medicationItemId,
        unitPrice: price.unitPrice,
        reimbursementInfo: price.reimbursementInfo ?? null
      });
    }

    for (let index = 0; index < pricesToCreate.length; index += chunkSize) {
      const chunk = pricesToCreate.slice(index, index + chunkSize);
      const result = await prisma.medicationPrice.createMany({
        data: chunk
      });
      insertedPriceCount += result.count;
    }
  }

  await prisma.catalogImportLog.create({
    data: {
      tenantId: tenant.id,
      catalogId: catalog.id,
      importedByUserId: actor?.id,
      fileName: csvPath.split(/[/\\]/).pop() ?? "import.csv",
      status: failed === 0 ? "SUCCESS" : insertedCount > 0 ? "PARTIAL" : "FAILED",
      rowCount: rows.length,
      successCount: insertedCount,
      failedCount: rows.length - insertedCount,
      metadata: {
        skippedInvalidRows: failed,
        priceRowsDetected: pendingPrices.length,
        priceRowsInserted: insertedPriceCount
      } as Prisma.InputJsonValue
    }
  });

  console.log("Medication import completed");
  console.log(
    JSON.stringify(
      {
        tenant: tenant.slug,
        catalogId: catalog.id,
        catalogVersion,
        rows: rows.length,
        inserted: insertedCount,
        priceRowsInserted: insertedPriceCount,
        failed: rows.length - insertedCount
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
