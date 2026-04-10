import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
import { SettingsService } from "./settings.service";
import { UpdateTenantSettingsDto } from "./dto.update-tenant-settings";
import { UpsertWorkingHoursDto } from "./dto.upsert-working-hours";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("tenant")
  async getTenantSettings(
    @Req() req: Request & { tenantId: string }
  ): Promise<unknown> {
    return this.settingsService.getTenantSettings(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Patch("tenant")
  async updateTenantSettings(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateTenantSettingsDto
  ): Promise<unknown> {
    return this.settingsService.updateTenantSettings(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("working-hours")
  async workingHours(
    @Req() req: Request & { tenantId: string },
    @Query("doctorId") doctorId?: string
  ): Promise<unknown> {
    return this.settingsService.getWorkingHours(req.tenantId, doctorId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("working-hours")
  async upsertWorkingHours(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: UpsertWorkingHoursDto
  ): Promise<unknown> {
    if (user.role === RoleName.DOCTOR && dto.doctorId !== user.sub) {
      throw new ForbiddenException("Doctor can only update own working hours");
    }

    return this.settingsService.upsertWorkingHours(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("appearance")
  async appearance(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.settingsService.getAppearance(req.tenantId);
  }
}
