import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min
} from "class-validator";

export class CreateConsultationDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  diagnosisLabel?: string;

  @IsString()
  symptoms!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  doctorPrivateNote?: string;

  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pulseBpm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  temperatureC?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightCm?: number;
}
