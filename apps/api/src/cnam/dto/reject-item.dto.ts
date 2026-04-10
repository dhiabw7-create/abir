import { IsString } from "class-validator";

export class RejectItemDto {
  @IsString()
  reason!: string;
}
