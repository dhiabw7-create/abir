import { Controller, Get, Post, Query, Req } from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { BackupsService } from "./backups.service";

@Controller("backups")
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Roles(RoleName.SUPER_ADMIN)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string },
    @Query("tenantId") tenantId?: string
  ): Promise<unknown> {
    return this.backupsService.list(tenantId ?? req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("manual")
  async manual(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Query("tenantId") tenantId?: string
  ): Promise<unknown> {
    return this.backupsService.runManualBackup(tenantId ?? req.tenantId, user.sub);
  }
}
