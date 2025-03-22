import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repositories';

@Injectable()
export class ValidatePdfOwnershipService {
  constructor(private readonly transactionsRepo: TransactionsRepository) {}

  async validate(userId: string, fileName: string) {
    const isOwner = await this.transactionsRepo.findFirst({
      where: { pdfUrl: fileName, userId },
    });

    if (!isOwner) {
      throw new NotFoundException('Pdf not found.');
    }
  }
}
