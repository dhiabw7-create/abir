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
import { AppointmentStatus, RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string },
    @Query() query: ListAppointmentsDto
  ): Promise<unknown> {
    return this.appointmentsService.list(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post()
  async create(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateAppointmentDto
  ): Promise<unknown> {
    return this.appointmentsService.create(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Patch(":id")
  async update(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentDto
  ): Promise<unknown> {
    return this.appointmentsService.update(req.tenantId, user.sub, id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Patch(":id/status/:status")
  async setStatus(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Param("status") status: AppointmentStatus
  ): Promise<unknown> {
    return this.appointmentsService.setStatus(req.tenantId, user.sub, id, status);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Delete(":id")
  async remove(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<{ success: boolean }> {
    await this.appointmentsService.remove(req.tenantId, user.sub, id);
    return { success: true };
  }
}
