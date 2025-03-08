import { Injectable } from '@nestjs/common';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repositories';
import { ValidateBankAccountOwnershipService } from './validate-bank-account-ownership.service';

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}

<<<<<<< HEAD
  private generateBankAccountKey(): string {
    const numbers = '0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let code = '';

    for (let i = 0; i < 3; i++) {
      code += numbers[Math.floor(Math.random() * numbers.length)];
      code += letters[Math.floor(Math.random() * letters.length)];
    }

    return code;
  }

  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    const { color, bankAccountKey, initialBalance, name, type } =
      createBankAccountDto;

    const key = this.generateBankAccountKey();
=======
  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    const { color, initialBalance, name, type } = createBankAccountDto;
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb

    return this.bankAccountsRepo.create({
      data: {
        userId,
        color,
<<<<<<< HEAD
        bankAccountKey: key,
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
        initialBalance,
        name,
        type,
      },
    });
  }

  async findAllByUserId(userId: string) {
    const bankAccounts = await this.bankAccountsRepo.findMany({
      where: { userId },
      include: {
        transactions: {
          select: {
            type: true,
            value: true,
          },
        },
      },
    });

    return bankAccounts.map(({ transactions, ...bankAccount }) => {
      const totalTransactions = transactions.reduce(
        (acc, transaction) =>
          acc +
          (transaction.type === 'INCOME'
            ? transaction.value
            : -transaction.value),
        0,
      );

      const currentBalance = bankAccount.initialBalance + totalTransactions;

      return {
        ...bankAccount,
        currentBalance,
        transactions,
      };
    });
  }

<<<<<<< HEAD
  async findBankAccoutByKey(bankAccountKey: string) {
    const bankAccount = await this.bankAccountsRepo.findFirst({
      where: { bankAccountKey },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return bankAccount;
=======
  findOne(id: number) {
    return `This action returns a #${id} bankAccount`;
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
  }

  async update(
    userId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    );

    const { color, initialBalance, name, type } = updateBankAccountDto;

    return this.bankAccountsRepo.update({
      where: { id: bankAccountId },
      data: { color, initialBalance, name, type },
    });
  }

  async remove(userId: string, bankAccountId: string) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    );

    await this.bankAccountsRepo.delete({
      where: { id: bankAccountId },
    });

    return null;
  }
}
