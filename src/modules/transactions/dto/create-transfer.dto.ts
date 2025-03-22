import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fromBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsBoolean()
  @IsOptional()
  isTransfer: boolean;

  @IsString()
  @IsOptional()
  // @IsUUID()
  paymentId: string;
}
