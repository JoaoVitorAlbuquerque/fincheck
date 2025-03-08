import {
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsNumber,
<<<<<<< HEAD
  IsOptional,
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
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
<<<<<<< HEAD
  @IsOptional()
  bankAccountKey?: string;

  @IsString()
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
  @IsNotEmpty()
  @IsHexColor()
  color: string;
}
