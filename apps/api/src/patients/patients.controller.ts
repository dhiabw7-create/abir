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
import { CreatePatientDto } from "./dto/create-patient.dto";
import { SearchPatientsDto } from "./dto/search-patients.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PatientsService } from "./patients.service";

@Controller("patients")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async search(
    @Req() req: Request & { tenantId: string },
    @Query() query: SearchPatientsDto
  ): Promise<unknown> {
    return this.patientsService.search(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post()
  async create(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePatientDto
  ): Promise<unknown> {
    return this.patientsService.create(req.tenantId, user.sub, dto, user.role);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get(":id")
  async getOne(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<unknown> {
    return this.patientsService.findOne(req.tenantId, id, user.role);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Patch(":id")
  async update(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: UpdatePatientDto
  ): Promise<unknown> {
    return this.patientsService.update(req.tenantId, user.sub, id, dto, user.role);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Delete(":id")
  async remove(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<{ success: boolean }> {
    await this.patientsService.remove(req.tenantId, user.sub, id);
    return { success: true };
  }
}
