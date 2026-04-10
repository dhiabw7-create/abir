import { IsString } from "class-validator";

export class CorrectRejectionDto {
  @IsString()
  correctiveNote!: string;
}
