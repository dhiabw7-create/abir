import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class GenerateDocumentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
