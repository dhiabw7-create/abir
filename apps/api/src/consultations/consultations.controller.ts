import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { ConsultationsService } from "./consultations.service";
import { CreateConsultationDto } from "./dto/create-consultation.dto";
import { ListConsultationsDto } from "./dto/list-consultations.dto";
import { UpdateConsultationDto } from "./dto/update-consultation.dto";

@Controller("consultations")
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string },
    @Query() query: ListConsultationsDto
  ): Promise<unknown> {
    return this.consultationsService.list(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post()
  async create(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateConsultationDto
  ): Promise<unknown> {
    return this.consultationsService.create(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("quick-templates")
  async quickTemplates(
    @Req() req: Request & { tenantId: string }
  ): Promise<unknown> {
    return this.consultationsService.quickTemplates(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get(":id")
  async findOne(
    @Req() req: Request & { tenantId: string },
    @Param("id") id: string
  ): Promise<unknown> {
    return this.consultationsService.findOne(req.tenantId, id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Patch(":id")
  async update(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: UpdateConsultationDto
  ): Promise<unknown> {
    return this.consultationsService.update(req.tenantId, user.sub, id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Patch(":id/complete")
  async complete(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<unknown> {
    return this.consultationsService.complete(req.tenantId, user.sub, id);
  }
}
