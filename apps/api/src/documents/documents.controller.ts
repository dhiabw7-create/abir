import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import type { Request } from "express";
import { RoleName } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { GenerateByTypeDto } from "./dto/generate-by-type.dto";
import { GenerateDocumentDto } from "./dto/generate-document.dto";
import { ListTemplatesDto } from "./dto/list-templates.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Get("templates")
  async listTemplates(
    @Req() req: Request & { tenantId: string },
    @Query() query: ListTemplatesDto
  ): Promise<unknown> {
    return this.documentsService.listTemplates(
      req.tenantId,
      query.includeGlobal === "true"
    );
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("templates")
  async createTemplate(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateTemplateDto
  ): Promise<unknown> {
    return this.documentsService.createTemplate(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Patch("templates/:id")
  async updateTemplate(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: UpdateTemplateDto
  ): Promise<unknown> {
    return this.documentsService.updateTemplate(req.tenantId, user.sub, id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete("templates/:id")
  async deleteTemplate(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<{ success: boolean }> {
    await this.documentsService.deleteTemplate(req.tenantId, user.sub, id);
    return { success: true };
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("generated")
  async listGenerated(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.documentsService.listGenerated(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("generate")
  async generate(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: GenerateDocumentDto
  ): Promise<unknown> {
    return this.documentsService.generateDocument(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Get("doctor-quick-templates")
  async doctorQuickTemplates(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser
  ): Promise<unknown> {
    return this.documentsService.listDoctorQuickTemplates(req.tenantId, user.sub);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("generate-by-type")
  async generateByType(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: GenerateByTypeDto
  ): Promise<unknown> {
    return this.documentsService.generateByType(req.tenantId, user.sub, dto);
  }
}
