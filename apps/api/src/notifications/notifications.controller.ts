import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string },
    @Query("userId") userId?: string
  ): Promise<unknown> {
    return this.notificationsService.list(req.tenantId, userId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post()
  async create(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      title: string;
      message: string;
      channel?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    return this.notificationsService.create(req.tenantId, user.sub, body);
  }
}
