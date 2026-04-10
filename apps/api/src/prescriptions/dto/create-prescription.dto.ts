import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class CreatePrescriptionLineDto {
  @IsOptional()
  @IsUUID()
  medicationItemId?: string;

  @IsString()
  medicationLabel!: string;

  @IsString()
  dose!: string;

  @IsString()
  frequency!: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  unitPrice?: number;
}

export class CreatePrescriptionDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionLineDto)
  lines!: CreatePrescriptionLineDto[];
}

export { CreatePrescriptionLineDto };
