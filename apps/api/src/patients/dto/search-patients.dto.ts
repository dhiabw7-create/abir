import { IsDateString, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SearchPatientsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  ficheNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cnamNumber?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsDateString()
  lastVisitFrom?: string;

  @IsOptional()
  @IsDateString()
  lastVisitTo?: string;
}
