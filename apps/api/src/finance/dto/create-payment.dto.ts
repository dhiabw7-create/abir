import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID
} from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsNumber()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsDateString()
  paidAt!: string;
}
