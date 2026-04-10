import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { RoleName } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateUserDto } from "./dto.create-user";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(tenantId: string): Promise<unknown[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      include: { role: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateUserDto
  ): Promise<unknown> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("User already exists");
    }

    const role = await this.ensureRole(tenantId, dto.role);

    const created = await this.prisma.user.create({
      data: {
        tenantId,
        roleId: role.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10)
      },
      include: {
        role: true
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "CREATE",
      entity: "User",
      entityId: created.id,
      afterData: {
        email: created.email,
        role: created.role.name
      }
    });

    return created;
  }

  async resetPassword(
    tenantId: string,
    actorUserId: string,
    userId: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10)
      }
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      action: "UPDATE",
      entity: "UserPassword",
      entityId: userId
    });
  }

  private async ensureRole(tenantId: string, roleName: RoleName): Promise<{ id: string }> {
    const existing = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: roleName
        }
      }
    });

    if (existing) {
      return { id: existing.id };
    }

    const created = await this.prisma.role.create({
      data: {
        tenantId,
        name: roleName,
        description: `${roleName} role`
      }
    });

    return { id: created.id };
  }
}
