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
import { AdminService } from "./admin.service";
import { CreatePlanDto, UpdatePlanDto } from "./dto.plan";
import { CreateTenantDto } from "./dto.create-tenant";

@Controller("admin")
@Roles(RoleName.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("tenants")
  async tenants(): Promise<unknown> {
    return this.adminService.listTenants();
  }

  @Post("tenants")
  async createTenant(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateTenantDto
  ): Promise<unknown> {
    return this.adminService.createTenant(user.sub, dto);
  }

  @Patch("tenants/:id")
  async updateTenant(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateTenantDto>
  ): Promise<unknown> {
    return this.adminService.updateTenant(user.sub, id, dto);
  }

  @Get("plans")
  async plans(): Promise<unknown> {
    return this.adminService.listPlans();
  }

  @Post("plans")
  async createPlan(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePlanDto
  ): Promise<unknown> {
    return this.adminService.createPlan(req.tenantId, user.sub, dto);
  }

  @Patch("plans/:id")
  async updatePlan(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: UpdatePlanDto
  ): Promise<unknown> {
    return this.adminService.updatePlan(req.tenantId, user.sub, id, dto);
  }

  @Get("audit")
  async audit(@Query("tenantId") tenantId?: string): Promise<unknown> {
    return this.adminService.auditLogs(tenantId);
  }

  @Get("backups")
  async backups(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.adminService.backups(req.tenantId);
  }

  @Post("backups/manual")
  async manualBackup(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser
  ): Promise<unknown> {
    return this.adminService.manualBackup(req.tenantId, user.sub);
  }
}
