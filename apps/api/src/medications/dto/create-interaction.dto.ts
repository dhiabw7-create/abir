import { IsString, IsUUID } from "class-validator";

export class CreateInteractionDto {
  @IsUUID()
  medicationAId!: string;

  @IsUUID()
  medicationBId!: string;

  @IsString()
  severity!: string;

  @IsString()
  description!: string;
}
