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
import { CNAMRecordStatus, RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CnamService } from "./cnam.service";
import { CorrectRejectionDto } from "./dto/correct-rejection.dto";
import { CreateBordereauDto } from "./dto/create-bordereau.dto";
import { CreateCnamRecordDto } from "./dto/create-cnam-record.dto";
import { ExportBordereauDto } from "./dto/export-bordereau.dto";
import { RejectItemDto } from "./dto/reject-item.dto";

@Controller("cnam")
export class CnamController {
  constructor(private readonly cnamService: CnamService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("verification")
  async verification(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.cnamService.dailyVerification(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("records")
  async records(
    @Req() req: Request & { tenantId: string },
    @Query("status") status?: CNAMRecordStatus,
    @Query("search") search?: string
  ): Promise<unknown> {
    return this.cnamService.listRecords(req.tenantId, status, search);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("records")
  async createRecord(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCnamRecordDto
  ): Promise<unknown> {
    return this.cnamService.createRecord(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Get("bordereaux")
  async bordereaux(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.cnamService.listBordereaux(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("bordereaux")
  async createBordereau(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateBordereauDto
  ): Promise<unknown> {
    return this.cnamService.createBordereau(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("bordereaux/:id/export")
  async exportBordereau(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() dto: ExportBordereauDto
  ): Promise<unknown> {
    return this.cnamService.exportBordereau(req.tenantId, user.sub, id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Patch("bordereaux/:id/archive")
  async archiveBordereau(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<unknown> {
    return this.cnamService.archiveBordereau(req.tenantId, user.sub, id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("archive")
  async archive(@Req() req: Request & { tenantId: string }): Promise<unknown> {
    return this.cnamService.archiveView(req.tenantId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("rejections/:bordereauItemId")
  async rejectItem(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("bordereauItemId") bordereauItemId: string,
    @Body() dto: RejectItemDto
  ): Promise<unknown> {
    return this.cnamService.rejectItem(req.tenantId, user.sub, bordereauItemId, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Post("correctifs/:rejectionId")
  async correct(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("rejectionId") rejectionId: string,
    @Body() dto: CorrectRejectionDto
  ): Promise<unknown> {
    return this.cnamService.correctRejection(req.tenantId, user.sub, rejectionId, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("plafond")
  async plafond(
    @Req() req: Request & { tenantId: string },
    @Query("month") month?: string,
    @Query("year") year?: string
  ): Promise<unknown> {
    return this.cnamService.plafondEstimation(
      req.tenantId,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined
    );
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("carnets")
  async carnets(
    @Req() req: Request & { tenantId: string },
    @Query("search") search?: string
  ): Promise<unknown> {
    return this.cnamService.carnets(req.tenantId, search);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("carnets/export")
  async exportCarnets(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Query("search") search?: string
  ): Promise<unknown> {
    return this.cnamService.exportCarnets(req.tenantId, user.sub, search);
  }
}
