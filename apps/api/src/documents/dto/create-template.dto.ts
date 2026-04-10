import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString
} from "class-validator";
import { DocumentLanguage, DocumentTemplateType } from "@prisma/client";

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsEnum(DocumentTemplateType)
  type!: DocumentTemplateType;

  @IsEnum(DocumentLanguage)
  language!: DocumentLanguage;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsBoolean()
  isGlobalLibrary?: boolean;
}
