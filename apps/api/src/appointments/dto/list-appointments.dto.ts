import { IsDateString, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ListAppointmentsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
