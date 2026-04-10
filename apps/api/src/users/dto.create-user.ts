import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { RoleName } from "@prisma/client";

export class CreateUserDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(RoleName)
  role!: RoleName;

  @IsString()
  @MinLength(8)
  password!: string;
}
