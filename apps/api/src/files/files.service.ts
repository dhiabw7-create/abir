import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSignedUploadDto } from "./dto/create-signed-upload.dto";
import { FinalizeUploadDto } from "./dto/finalize-upload.dto";

@Injectable()
export class FilesService {
  private readonly s3Client?: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {
    if (this.configService.get("STORAGE_MODE") === "s3") {
      this.s3Client = new S3Client({
        endpoint: this.configService.get<string>("S3_ENDPOINT"),
        region: this.configService.get<string>("S3_REGION") || "us-east-1",
        credentials: {
          accessKeyId: this.configService.get<string>("S3_ACCESS_KEY") ?? "",
          secretAccessKey: this.configService.get<string>("S3_SECRET_KEY") ?? ""
        },
        forcePathStyle: true
      });
    }
  }

  async createSignedUpload(
    tenantId: string,
    dto: CreateSignedUploadDto
  ): Promise<unknown> {
    const key = `tenants/${tenantId}/${Date.now()}-${randomUUID()}-${dto.fileName}`;

    if (this.configService.get("STORAGE_MODE") === "s3") {
      if (!this.s3Client) {
        throw new BadRequestException("S3 client not configured");
      }

      const bucket = this.configService.get<string>("S3_BUCKET");
      if (!bucket) {
        throw new BadRequestException("S3 bucket is not configured");
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: dto.mimeType
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900
      });

      return {
        mode: "s3",
        uploadUrl,
        storagePath: `s3://${bucket}/${key}`
      };
    }

    return {
      mode: "local",
      uploadUrl: "/files/upload-local",
      storagePath: key
    };
  }

  async uploadLocal(
    tenantId: string,
    actorUserId: string,
    role: string,
    file: any,
    metadata: {
      category: string;
      patientId?: string;
      consultationId?: string;
      isMedical?: boolean;
    }
  ): Promise<unknown> {
    this.ensureRoleForMedicalUpload(role, metadata.isMedical ?? false);

    const scanned = await this.virusScanPlaceholder(file.buffer);
    if (!scanned.clean) {
      throw new BadRequestException("File failed virus scan placeholder hook");
    }

    const storageBase = this.configService.get<string>("STORAGE_LOCAL_PATH") ?? "./uploads";
    const directory = path.join(storageBase, "tenants", tenantId);
    await fs.mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}-${file.originalname}`;
    const fullPath = path.join(directory, filename);
    await fs.writeFile(fullPath, file.buffer);

    return this.finalizeUpload(tenantId, actorUserId, role, {
      fileName: file.originalname,
      mimeType: file.mimetype,
      storagePath: fullPath.replace(/\\/g, "/"),
      category: metadata.category,
      patientId: metadata.patientId,
      consultationId: metadata.consultationId,
      isMedical: metadata.isMedical,
      fileSize: file.size
    });
  }

  async finalizeUpload(
    tenantId: string,
    actorUserId: string,
    role: string,
    dto: FinalizeUploadDto
  ): Promise<unknown> {
    this.ensureRoleForMedicalUpload(role, dto.isMedical ?? false);

    const attachment = await this.prisma.fileAttachment.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        consultationId: dto.consultationId,
        uploadedByUserId: actorUserId,
        category: dto.category,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize ?? 0,
        storagePath: dto.storagePath,
        isMedical: dto.isMedical ?? false
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPLOAD",
      entity: "FileAttachment",
      entityId: attachment.id,
      afterData: {
        fileName: dto.fileName,
        category: dto.category,
        isMedical: dto.isMedical
      }
    });

    return attachment;
  }

  async list(
    tenantId: string,
    role: string,
    patientId?: string,
    consultationId?: string
  ): Promise<unknown> {
    return this.prisma.fileAttachment.findMany({
      where: {
        tenantId,
        patientId,
        consultationId,
        isMedical: role === "SECRETARY" ? false : undefined
      },
      include: {
        patient: true,
        consultation: true,
        uploadedBy: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async findOne(tenantId: string, role: string, id: string): Promise<unknown> {
    const attachment = await this.prisma.fileAttachment.findFirst({
      where: {
        tenantId,
        id
      },
      include: {
        patient: true,
        consultation: true,
        uploadedBy: true
      }
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    if (role === "SECRETARY" && attachment.isMedical) {
      throw new ForbiddenException("Secretary is not allowed to access medical files");
    }

    return attachment;
  }

  private ensureRoleForMedicalUpload(role: string, isMedical: boolean): void {
    if (role === "SECRETARY" && isMedical) {
      throw new ForbiddenException(
        "Secretary is not allowed to upload medical documents"
      );
    }
  }

  private async virusScanPlaceholder(buffer: Buffer): Promise<{ clean: boolean }> {
    const maxSize = 20 * 1024 * 1024;
    return { clean: buffer.length <= maxSize };
  }
}
