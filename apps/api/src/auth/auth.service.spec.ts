import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { RoleName } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    refreshToken: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn()
    },
    $transaction: jest.fn()
  } as any;

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn()
  } as unknown as JwtService;

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: "access-secret",
        JWT_REFRESH_SECRET: "refresh-secret",
        JWT_ACCESS_TTL: "15m",
        JWT_REFRESH_TTL: "7d"
      };
      return map[key];
    })
  } as unknown as ConfigService;

  const auditService = {
    log: jest.fn()
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService, configService, auditService as any);
  });

  it("throws on invalid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: "x@test.dev", password: "password123" })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns tokens for valid credentials", async () => {
    const hash = await bcrypt.hash("password123", 10);

    prisma.user.findUnique.mockResolvedValue({
      id: "user-id",
      tenantId: "tenant-id",
      email: "doctor@test.dev",
      firstName: "John",
      lastName: "Doe",
      passwordHash: hash,
      isActive: true,
      tenant: {
        slug: "tenant-slug"
      },
      role: {
        name: RoleName.DOCTOR
      }
    });

    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    prisma.$transaction.mockResolvedValue(undefined);

    const result = await service.login({
      email: "doctor@test.dev",
      password: "password123",
      tenantSlug: "tenant-slug"
    });

    expect(result.accessToken).toEqual("access-token");
    expect(result.refreshToken).toEqual("refresh-token");
    expect(result.user.email).toEqual("doctor@test.dev");
  });
});
