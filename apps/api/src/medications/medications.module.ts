import { Module } from "@nestjs/common";
import { MedicationsController } from "./medications.controller";
import { MedicationsService } from "./medications.service";

@Module({
  providers: [MedicationsService],
  controllers: [MedicationsController],
  exports: [MedicationsService]
})
export class MedicationsModule {}
