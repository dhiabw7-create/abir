import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCnamRecordDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  consultationId!: string;

  @IsString()
  cnamCode!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsBoolean()
  eligible?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
