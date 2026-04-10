import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import type { Request } from "express";
import { RoleName, WaitingRoomStatus } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CheckInDto } from "./dto/check-in.dto";
import { UpdateWaitingStatusDto } from "./dto/update-status.dto";
import { WaitingRoomService } from "./waiting-room.service";

@Controller("waiting-room")
export class WaitingRoomController {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.waitingRoomService.list(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("metrics")
  async metrics(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.waitingRoomService.metrics(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("check-in")
  async checkIn(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CheckInDto
  ): Promise<unknown> {
    return this.waitingRoomService.checkIn(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("call-next")
  async callNext(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser
  ): Promise<unknown> {
    return this.waitingRoomService.callNext(req.tenantId, user.sub);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Patch(":id/status")
  async updateStatus(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: UpdateWaitingStatusDto
  ): Promise<unknown> {
    return this.waitingRoomService.updateStatus(req.tenantId, user.sub, id, dto.status);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Patch(":id/leave")
  async leaveQueue(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<unknown> {
    return this.waitingRoomService.leaveQueue(req.tenantId, user.sub, id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Patch(":id/set/:status")
  async quickSetStatus(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Param("status") status: WaitingRoomStatus
  ): Promise<unknown> {
    return this.waitingRoomService.updateStatus(req.tenantId, user.sub, id, status);
  }
}
