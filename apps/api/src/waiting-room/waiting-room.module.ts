import { Module } from "@nestjs/common";
import { WaitingRoomController } from "./waiting-room.controller";
import { WaitingRoomService } from "./waiting-room.service";
import { WaitingRoomGateway } from "./waiting-room.gateway";

@Module({
  providers: [WaitingRoomService, WaitingRoomGateway],
  controllers: [WaitingRoomController],
  exports: [WaitingRoomService, WaitingRoomGateway]
})
export class WaitingRoomModule {}
