import { Module } from '@nestjs/common';
import { TransactionsService } from './services/transactions.service';
import { TransactionsController } from './transactions.controller';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { ValidateTransactionOwnershipService } from './services/validate-transaction-ownership.service';
import { ValidatePdfOwnershipService } from './services/validate-pdf-ownership.service';

@Module({
  imports: [BankAccountsModule, CategoriesModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    ValidateTransactionOwnershipService,
    ValidatePdfOwnershipService,
  ],
})
export class TransactionsModule {}
