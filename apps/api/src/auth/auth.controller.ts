import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtUser } from "../common/guards/jwt.strategy.type";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<{
    accessToken: string;
    user: {
      id: string;
      tenantId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
  }> {
    const result = await this.authService.login(dto);

    this.setRefreshCookie(response, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: {
        ...result.user,
        role: result.user.role
      }
    };
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ accessToken: string }> {
    const raw = dto.refreshToken ?? request.cookies?.refreshToken;
    const tokens = await this.authService.refresh(raw);
    this.setRefreshCookie(response, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @HttpCode(204)
  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    await this.authService.logout(request.cookies?.refreshToken);
    response.clearCookie("refreshToken");
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return {
      message: "If this email exists, password reset instructions have been sent."
    };
  }

  @Get("me")
  async me(@CurrentUser() user: JwtUser): Promise<{
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }> {
    const result = await this.authService.me(user.sub);
    return {
      ...result,
      role: result.role
    };
  }

  private setRefreshCookie(response: Response, token: string): void {
    const secure = process.env.COOKIE_SECURE === "true";
    response.cookie("refreshToken", token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
}
