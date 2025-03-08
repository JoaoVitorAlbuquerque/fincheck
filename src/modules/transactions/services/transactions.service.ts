import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repositories';
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service';
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service';
import { ValidateTransactionOwnershipService } from './validate-transaction-ownership.service';
import { TransactionType } from '../entities/Transaction';
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repositories';
import { Prisma } from '@prisma/client';
import { CreateTransferDto } from '../dto/create-transfer.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly validateTransactionOwnershipService: ValidateTransactionOwnershipService,
  ) {}

  // @Cron('')
  // async processScheduledTransactions() {
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);

  //   const transactions = await this.transactionsRepo.findMany({
  //     where: {
  //       scheduledAt: today,
  //       status: 'PENDING',
  //     },
  //   });

  //   for (const transaction of transactions) {
  //     // Lógica para processar a transação
  //     await this.transactionsRepo.update({
  //       where: { id: transaction.id },
  //       data: { status: 'PROCESSED' },
  //     });
  //   }
  // }

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    const { bankAccountId, categoryId, date, name, type, value } =
      createTransactionDto;

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
    });

    return this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
      },
    });
  }

  async transferFunds(
    userId: string,
    {
      fromBankAccountId,
      toBankAccountId,
      amount,
      date,
      name,
      isTransfer = true,
    }: CreateTransferDto,
  ) {
    if (fromBankAccountId === toBankAccountId) {
      throw new Error('Não é possível transferir para a mesma conta.');
    }

    // Buscar conta de origem com saldo atualizado
    const fromAccount = (await this.bankAccountsRepo.findUnique({
      where: { id: fromBankAccountId, userId }, // Verifica se a conta pertence ao usuário
      include: { transactions: true }, // Pegamos o saldo atual
    })) as Prisma.BankAccountGetPayload<{ include: { transactions: true } }>;

    console.log('fromAccount:', JSON.stringify(fromAccount, null, 2));

    if (!fromAccount) {
      throw new Error('Conta de origem não encontrada.');
    }

    // Passo 2: Calcular saldo atual da conta de origem
    const totalDeposits = fromAccount.transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.value, 0);

    const totalWithdrawals = fromAccount.transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.value, 0);

    const currentBalance =
      fromAccount.initialBalance + totalDeposits - totalWithdrawals;

    if (currentBalance < amount) {
      throw new Error('Saldo insuficiente.');
    }

    // Passo 3: Buscar conta de destino
    const toAccount = await this.bankAccountsRepo.findUnique({
      where: { id: toBankAccountId },
      include: { transactions: true }, // Inclui transações para calcular o saldo destino
    });

    if (!toAccount) {
      throw new Error('Conta de destino não encontrada.');
    }

    // Passo 4: Criar a transação de débito (saída) para a conta de origem
    const dataExpense = await this.transactionsRepo.create({
      data: {
        userId,
        name,
        date,
        bankAccountId: fromBankAccountId,
        type: 'EXPENSE',
        value: amount,
        isTransfer,
      },
    });

    // Passo 5: Criar a transação de crédito (entrada) para a conta de destino
    const dataIncome = await this.transactionsRepo.create({
      data: {
        userId: toAccount.userId,
        name: `Transferência de entrada - ${name}`,
        date,
        bankAccountId: toBankAccountId,
        type: 'INCOME',
        value: amount,
        isTransfer,
      },
    });

    console.log('Expense', dataExpense);
    console.log('Income', dataIncome);

    return {
      message: 'Transferência realizada com sucesso!',
      dataExpense,
      dataIncome,
    };
  }

  findAllByUserId(
    userId: string,
    filters: {
      month: number;
      year: number;
      bankAccountId?: string;
      type?: TransactionType;
    },
  ) {
    return this.transactionsRepo.findMany({
      where: {
        userId,
        bankAccountId: filters.bankAccountId,
        type: filters.type,
        date: {
          gte: new Date(Date.UTC(filters.year, filters.month)),
          lt: new Date(Date.UTC(filters.year, filters.month + 1)),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    });
  }

  async update(
    userId: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const { bankAccountId, categoryId, date, name, type, value } =
      updateTransactionDto;

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
      transactionId,
    });

    return this.transactionsRepo.update({
      where: { id: transactionId },
      data: {
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
      },
    });
  }

  async remove(userId: string, transactionId: string) {
    await this.validateEntitiesOwnership({ userId, transactionId });

    await this.transactionsRepo.delete({
      where: { id: transactionId },
    });

    return null;
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
    transactionId,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
    transactionId?: string;
  }) {
    await Promise.all([
      transactionId &&
        this.validateTransactionOwnershipService.validate(
          userId,
          transactionId,
        ),
      bankAccountId &&
        this.validateBankAccountOwnershipService.validate(
          userId,
          bankAccountId,
        ),
      categoryId &&
        this.validateCategoryOwnershipService.validate(userId, categoryId),
    ]);
  }
}
