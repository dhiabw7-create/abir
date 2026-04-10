import { Controller, Get, Req } from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("summary")
  async summary(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.dashboardService.summary(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("chart")
  async chart(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.dashboardService.chart(req.tenantId);
  }
}
