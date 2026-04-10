import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class CheckInDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}
