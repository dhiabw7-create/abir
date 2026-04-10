import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto.create-user";
import { ResetPasswordDto } from "./dto.reset-password";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string }
  ): Promise<unknown[]> {
    return this.usersService.list(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post()
  async create(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateUserDto
  ): Promise<unknown> {
    return this.usersService.create(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Patch(":id/reset-password")
  async resetPassword(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto
  ): Promise<{ success: boolean }> {
    await this.usersService.resetPassword(req.tenantId, user.sub, id, dto.newPassword);
    return { success: true };
  }
}
