import { IsArray, IsDateString, IsOptional, IsUUID } from "class-validator";

export class CreateBordereauDto {
  @IsUUID()
  doctorId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsArray()
  recordIds?: string[];
}
