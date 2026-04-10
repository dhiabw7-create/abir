import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SearchMedicationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  dciName?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  familyClass?: string;

  @IsOptional()
  @IsBoolean()
  reimbursable?: boolean;

  @IsOptional()
  @IsString()
  cnamCode?: string;

  @IsOptional()
  @IsUUID()
  catalogId?: string;
}
