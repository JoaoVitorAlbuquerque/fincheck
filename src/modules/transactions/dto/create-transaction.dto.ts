import {
<<<<<<< HEAD
  IsBoolean,
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
<<<<<<< HEAD
  IsOptional,
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '../entities/Transaction';
<<<<<<< HEAD
// import { StatusType } from '../entities/Status';
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  bankAccountId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  value: number;

<<<<<<< HEAD
  // @IsNotEmpty()
  // @IsEnum(StatusType)
  // status: StatusType; //

  // @IsDateString()
  // scheduledAt: string; //

=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;
<<<<<<< HEAD

  @IsBoolean()
  @IsOptional()
  isTransfer: boolean;
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
}
