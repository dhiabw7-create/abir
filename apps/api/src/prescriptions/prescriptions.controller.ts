import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";
import { ListPrescriptionsDto } from "./dto/list-prescriptions.dto";
import { PrescriptionsService } from "./prescriptions.service";

@Controller("prescriptions")
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string },
    @Query() query: ListPrescriptionsDto
  ): Promise<unknown> {
    return this.prescriptionsService.list(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post()
  async create(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePrescriptionDto
  ): Promise<unknown> {
    return this.prescriptionsService.create(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get(":id")
  async getOne(
    @Req() req: Request & { tenantId: string },
    @Param("id") id: string
  ): Promise<unknown> {
    return this.prescriptionsService.findOne(req.tenantId, id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post(":id/pdf")
  async generatePdf(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<unknown> {
    return this.prescriptionsService.generatePdf(req.tenantId, user.sub, id);
  }
}
