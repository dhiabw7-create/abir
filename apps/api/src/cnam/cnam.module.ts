import { Module } from "@nestjs/common";
import { CnamController } from "./cnam.controller";
import { CnamService } from "./cnam.service";

@Module({
  providers: [CnamService],
  controllers: [CnamController],
  exports: [CnamService]
})
export class CnamModule {}
