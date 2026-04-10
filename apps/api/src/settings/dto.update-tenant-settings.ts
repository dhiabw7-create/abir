import {
  IsOptional,
  IsString
} from "class-validator";

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  clinicPhone?: string;

  @IsOptional()
  @IsString()
  logoPath?: string;

  @IsOptional()
  @IsString()
  stampPath?: string;

  @IsOptional()
  @IsString()
  signaturePath?: string;

  @IsOptional()
  @IsString()
  documentFooter?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
