import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { FinanceRangeDto } from "./dto/finance-range.dto";
import { FinanceService } from "./finance.service";

@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("overview")
  async overview(
    @Req() req: Request & { tenantId: string },
    @Query() query: FinanceRangeDto
  ): Promise<unknown> {
    return this.financeService.overview(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get("payments")
  async payments(
    @Req() req: Request & { tenantId: string },
    @Query() query: FinanceRangeDto
  ): Promise<unknown> {
    return this.financeService.listPayments(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("payments")
  async createPayment(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePaymentDto
  ): Promise<unknown> {
    return this.financeService.createPayment(req.tenantId, user.sub, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR)
  @Get("by-doctor")
  async byDoctor(
    @Req() req: Request & { tenantId: string },
    @Query() query: FinanceRangeDto
  ): Promise<unknown> {
    return this.financeService.revenueByDoctor(req.tenantId, query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("export")
  async exportCsv(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Query() query: FinanceRangeDto
  ): Promise<unknown> {
    return this.financeService.exportCsv(req.tenantId, user.sub, query);
  }
}
