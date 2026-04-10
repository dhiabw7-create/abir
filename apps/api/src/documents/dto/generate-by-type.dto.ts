import { Type } from "class-transformer";
import { DocumentTemplateType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from "class-validator";

export class GenerateByTypeDto {
  @IsUUID()
  patientId!: string;

  @IsEnum(DocumentTemplateType)
  type!: DocumentTemplateType;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
