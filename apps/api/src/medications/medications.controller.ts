import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { RoleName } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CreateInteractionDto } from "./dto/create-interaction.dto";
import { SearchMedicationDto } from "./dto/search-medications.dto";
import { MedicationsService } from "./medications.service";

@Controller("medications")
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("catalogs")
  async catalogs(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.medicationsService.listCatalogs(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("items")
  async items(
    @Req() req: Request & { tenantId: string },
    @Query() query: SearchMedicationDto
  ): Promise<unknown> {
    return this.medicationsService.searchItems(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("import/preview")
  @UseInterceptors(FileInterceptor("file"))
  async previewImport(@UploadedFile() file: any): Promise<unknown> {
    return this.medicationsService.previewCsv(file.buffer);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importCatalog(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: any,
    @Body("source") source: string,
    @Body("catalogVersion") catalogVersion: string,
    @Body("mapping") mappingRaw: string
  ): Promise<unknown> {
    const mapping = JSON.parse(mappingRaw) as {
      code: string;
      brandName: string;
      dciName?: string;
      dosageForm?: string;
      strength?: string;
      familyClass?: string;
      reimbursable?: string;
      cnamCode?: string;
      unitPrice?: string;
    };

    return this.medicationsService.importCsv({
      tenantId: req.tenantId,
      actorUserId: user.sub,
      fileName: file.originalname,
      fileBuffer: file.buffer,
      source,
      catalogVersion,
      mapping
    });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("interactions")
  async interactions(
    @Req() req: Request & { tenantId: string },
    @Query("itemId") itemId?: string,
    @Query("itemAId") itemAId?: string,
    @Query("itemBId") itemBId?: string
  ): Promise<unknown> {
    return this.medicationsService.listInteractions(req.tenantId, itemId, itemAId, itemBId);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("interactions")
  async createInteraction(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateInteractionDto
  ): Promise<unknown> {
    return this.medicationsService.createInteraction(req.tenantId, user.sub, dto);
  }
}
