import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { RoleName } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { LoginDto } from "./dto/login.dto";

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: RoleName;
  email: string;
  firstName: string;
  lastName: string;
  jti?: string;
  type?: "refresh";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      tenantId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: RoleName;
    };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true, tenant: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (dto.tenantSlug && user.tenant.slug !== dto.tenantSlug) {
      throw new UnauthorizedException("Invalid tenant context");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.configService.getOrThrow<string>("JWT_ACCESS_TTL")
    });

    const refreshJti = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        type: "refresh",
        jti: refreshJti
      },
      {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.getOrThrow<string>("JWT_REFRESH_TTL")
      }
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      }),
      this.prisma.refreshToken.create({
        data: {
          id: refreshJti,
          userId: user.id,
          tenantId: user.tenantId,
          tokenHash: await bcrypt.hash(refreshToken, 10),
          expiresAt: new Date(Date.now() + this.parseExpiry(this.configService.getOrThrow<string>("JWT_REFRESH_TTL")))
        }
      })
    ]);

    await this.auditService.log({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "LOGIN",
      entity: "AUTH",
      entityId: user.id,
      afterData: { email: user.email }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name
      }
    };
  }

  async refresh(refreshTokenRaw: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!refreshTokenRaw) {
      throw new BadRequestException("Refresh token is required");
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshTokenRaw, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (!payload.jti || payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token payload");
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.userId !== payload.sub
    ) {
      throw new UnauthorizedException("Refresh token expired or revoked");
    }

    const hashMatches = await bcrypt.compare(refreshTokenRaw, stored.tokenHash);
    if (!hashMatches) {
      throw new UnauthorizedException("Refresh token mismatch");
    }

    const nextJti = randomUUID();
    const nextPayload: JwtPayload = {
      sub: stored.user.id,
      tenantId: stored.user.tenantId,
      role: stored.user.role.name,
      email: stored.user.email,
      firstName: stored.user.firstName,
      lastName: stored.user.lastName,
      type: "refresh",
      jti: nextJti
    };

    const accessToken = await this.jwtService.signAsync(
      {
        sub: nextPayload.sub,
        tenantId: nextPayload.tenantId,
        role: nextPayload.role,
        email: nextPayload.email,
        firstName: nextPayload.firstName,
        lastName: nextPayload.lastName
      },
      {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.configService.getOrThrow<string>("JWT_ACCESS_TTL")
      }
    );

    const nextRefreshToken = await this.jwtService.signAsync(nextPayload, {
      secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.configService.getOrThrow<string>("JWT_REFRESH_TTL")
    });

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: {
          revokedAt: new Date(),
          replacedById: nextJti
        }
      }),
      this.prisma.refreshToken.create({
        data: {
          id: nextJti,
          userId: stored.userId,
          tenantId: stored.tenantId,
          tokenHash: await bcrypt.hash(nextRefreshToken, 10),
          expiresAt: new Date(Date.now() + this.parseExpiry(this.configService.getOrThrow<string>("JWT_REFRESH_TTL")))
        }
      })
    ]);

    return {
      accessToken,
      refreshToken: nextRefreshToken
    };
  }

  async logout(refreshTokenRaw: string | undefined): Promise<void> {
    if (!refreshTokenRaw) {
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshTokenRaw, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
      });

      if (payload.jti) {
        await this.prisma.refreshToken.updateMany({
          where: { id: payload.jti },
          data: { revokedAt: new Date() }
        });
      }
    } catch {
      return;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return;
    }

    await this.auditService.log({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "FORGOT_PASSWORD",
      entity: "AUTH",
      entityId: user.id,
      afterData: { email }
    });
  }

  async me(userId: string): Promise<{
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: RoleName;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name
    };
  }

  private parseExpiry(value: string): number {
    if (value.endsWith("d")) {
      return Number(value.slice(0, -1)) * 24 * 60 * 60 * 1000;
    }

    if (value.endsWith("h")) {
      return Number(value.slice(0, -1)) * 60 * 60 * 1000;
    }

    if (value.endsWith("m")) {
      return Number(value.slice(0, -1)) * 60 * 1000;
    }

    if (value.endsWith("s")) {
      return Number(value.slice(0, -1)) * 1000;
    }

    return Number(value);
  }
}
