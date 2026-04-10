import { IsBooleanString, IsOptional } from "class-validator";

export class ListTemplatesDto {
  @IsOptional()
  @IsBooleanString()
  includeGlobal?: string;
}
