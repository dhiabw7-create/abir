import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RoleName } from "@prisma/client";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { CreateSignedUploadDto } from "./dto/create-signed-upload.dto";
import { FinalizeUploadDto } from "./dto/finalize-upload.dto";
import { FilesService } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("signed-url")
  async signedUrl(
    @Req() req: Request & { tenantId: string },
    @Body() dto: CreateSignedUploadDto
  ): Promise<unknown> {
    return this.filesService.createSignedUpload(req.tenantId, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("upload-local")
  @UseInterceptors(FileInterceptor("file"))
  async uploadLocal(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: any,
    @Body("category") category: string,
    @Body("patientId") patientId?: string,
    @Body("consultationId") consultationId?: string,
    @Body("isMedical") isMedicalRaw?: string
  ): Promise<unknown> {
    const isMedical = isMedicalRaw === "true";
    return this.filesService.uploadLocal(req.tenantId, user.sub, user.role, file, {
      category,
      patientId,
      consultationId,
      isMedical
    });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Post("finalize")
  async finalize(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Body() dto: FinalizeUploadDto
  ): Promise<unknown> {
    return this.filesService.finalizeUpload(req.tenantId, user.sub, user.role, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get()
  async list(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Query("patientId") patientId?: string,
    @Query("consultationId") consultationId?: string
  ): Promise<unknown> {
    return this.filesService.list(req.tenantId, user.role, patientId, consultationId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.DOCTOR, RoleName.SECRETARY)
  @Get(":id")
  async getOne(
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: JwtUser,
    @Param("id") id: string
  ): Promise<unknown> {
    return this.filesService.findOne(req.tenantId, user.role, id);
  }
}
