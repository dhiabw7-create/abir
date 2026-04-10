import { IsDateString, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ListPrescriptionsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
