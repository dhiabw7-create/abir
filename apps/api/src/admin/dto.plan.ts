import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsNumber()
  monthlyPrice!: number;

  @IsNumber()
  yearlyPrice!: number;

  @IsInt()
  @Min(1)
  maxDoctors!: number;

  @IsInt()
  @Min(1)
  maxStaff!: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  yearlyPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDoctors?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStaff?: number;
}
