import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { PdfService } from "./pdf.service";

@Module({
  providers: [DocumentsService, PdfService],
  controllers: [DocumentsController],
  exports: [DocumentsService, PdfService]
})
export class DocumentsModule {}
