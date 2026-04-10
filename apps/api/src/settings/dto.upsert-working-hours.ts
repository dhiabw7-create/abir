import {
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class WorkingHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsBoolean()
  isActive!: boolean;
}

export class UpsertWorkingHoursDto {
  @IsUUID()
  doctorId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourItemDto)
  items!: WorkingHourItemDto[];
}

export { WorkingHourItemDto };
