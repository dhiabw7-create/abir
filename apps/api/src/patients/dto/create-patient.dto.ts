import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString
} from "class-validator";

export class CreatePatientDto {
  @IsString()
  ficheNumber!: string;

  @IsOptional()
  @IsString()
  cnamNumber?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsArray()
  allergies?: string[];

  @IsOptional()
  @IsArray()
  chronicTreatments?: string[];
}
