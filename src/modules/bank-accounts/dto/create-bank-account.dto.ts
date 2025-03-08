import {
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BankAccountType } from '../entities/BankAccount';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  initialBalance: number;

  @IsNotEmpty()
  @IsEnum(BankAccountType)
  type: BankAccountType;

  @IsString()
  @IsOptional()
  bankAccountKey?: string;

  @IsString()
  @IsNotEmpty()
  @IsHexColor()
  color: string;
}
