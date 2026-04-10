import { Controller, Get, Query, Req } from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("kpis")
  async kpis(
    @Req() req: Request & { tenantId: string },
    @Query("from") from?: string,
    @Query("to") to?: string
  ): Promise<unknown> {
    return this.reportsService.kpis(req.tenantId, from, to);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Get("activity")
  async activity(
    @Req() req: Request & { tenantId: string }
  ): Promise<unknown> {
    return this.reportsService.activityLogs(req.tenantId);
  }
}
