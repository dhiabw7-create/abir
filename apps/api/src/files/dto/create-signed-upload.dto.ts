import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSignedUploadDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsBoolean()
  isMedical?: boolean;
}
