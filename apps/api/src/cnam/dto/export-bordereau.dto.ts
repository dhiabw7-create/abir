import { IsOptional, IsString } from "class-validator";

export class ExportBordereauDto {
  @IsOptional()
  @IsString()
  delimiter?: string;

  @IsOptional()
  @IsString()
  lineFormat?: string;
}
