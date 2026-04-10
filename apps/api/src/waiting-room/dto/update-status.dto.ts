import { IsEnum } from "class-validator";
import { WaitingRoomStatus } from "@prisma/client";

export class UpdateWaitingStatusDto {
  @IsEnum(WaitingRoomStatus)
  status!: WaitingRoomStatus;
}
