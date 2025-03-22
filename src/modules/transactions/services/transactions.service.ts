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
import * as PDFDocument from 'pdfkit';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as crypto from 'node:crypto';
import { env } from 'src/shared/config/env';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ValidatePdfOwnershipService } from './validate-pdf-ownership.service';

@Injectable()
export class TransactionsService {
  private s3: S3Client;

  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly validateTransactionOwnershipService: ValidateTransactionOwnershipService,
    private readonly validatePdfOwnershipService: ValidatePdfOwnershipService,
  ) {
    this.s3 = new S3Client({
      region: env.awsRegion,
      credentials: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
      },
    });
  }

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

    const { fileNameGenerated } = await this.uploadToS3(name);

    return this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
        pdfUrl: fileNameGenerated,
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
      paymentId,
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

    const pdfBuffer = await this.generateTransferPDF({
      fromBankAccountId,
      toBankAccountId,
      amount,
      date,
      name,
      paymentId,
      isTransfer,
    });
    console.log('pdf', pdfBuffer);

    const { fileNameGenerated } = await this.uploadToS3(
      name,
      pdfBuffer,
      isTransfer,
    );

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
        paymentId,
        pdfUrl: fileNameGenerated, // Retornar o "fileUrl"
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
        paymentId,
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

  async getFileFromS3(userId: string, fileName: string) {
    await this.validateEntitiesOwnership({ userId, fileName });

    if (!fileName) {
      return {
        statusCode: 400,
        error: 'File name is required.',
      };
    }

    const command = new GetObjectCommand({
      Bucket: env.bucketName,
      Key: fileName,
    });

    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 60 });

    return { signedUrl };
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
    transactionId,
    fileName,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
    transactionId?: string;
    fileName?: string;
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
      fileName && this.validatePdfOwnershipService.validate(userId, fileName),
    ]);
  }

  private async generateTransferPDF({
    name,
    amount,
    date,
    fromBankAccountId,
    toBankAccountId,
    paymentId,
  }: CreateTransferDto): Promise<Buffer> {
    // const pdfDoc = await PDFDocument.create();
    // const page = pdfDoc.addPage([600, 800]);

    // // const logoPath = path.resolve(__dirname, '');
    // // const logoBytes = fs.readFileSync(logoPath);
    // // const logoImage = await pdfDoc.embedPng(logoBytes);

    // // Dimensões da logo
    // // const logoWidth = 100;
    // // const logoHeight = 50;

    // // Adicionar a logo ao PDF
    // // page.drawImage(logoImage, {
    // //   x: 20, // Distância da esquerda
    // //   y: 350, // Posição vertical
    // //   width: logoWidth,
    // //   height: logoHeight,
    // // });

    // // Adicionar uma linha horizontal abaixo da logo
    // page.drawLine({
    //   start: { x: 20, y: 330 }, // Começa abaixo da logo
    //   end: { x: 580, y: 330 }, // Vai até a outra extremidade
    //   thickness: 1, // Espessura da linha
    //   color: rgb(0, 0, 0), // Preto
    // });

    // // Adicionar detalhes da transação
    // // page.drawText(`Comprovante de Transferência`, { x: 20, y: 310, size: 14 });
    // page.drawText(`Comprovante de Transferência`, { x: 20, y: 350, size: 16 });
    // page.drawText(`${Date.now()}`, { x: 20, y: 340, size: 12 });

    // page.drawText(`ID da transação: ${paymentId}`, {
    //   x: 20,
    //   y: 280,
    //   size: 12,
    // });
    // page.drawText(`Data: ${date}`, { x: 20, y: 260, size: 12 });
    // page.drawText(`Valor: R$ ${amount.toFixed(2)}`, {
    //   x: 20,
    //   y: 240,
    //   size: 12,
    // });
    // page.drawText(`De: Conta ${fromBankAccountId}`, {
    //   x: 20,
    //   y: 220,
    //   size: 12,
    // });
    // page.drawText(`Para: Conta ${toBankAccountId}`, {
    //   x: 20,
    //   y: 200,
    //   size: 12,
    // });

    // page.drawText(`Descrição: ${name}`, {
    //   x: 20,
    //   y: 180,
    //   size: 12,
    // });

    // /// Gerar o PDF como Uint8Array
    // const pdfBytes = await pdfDoc.save();
    // // const pdfBuffer = Buffer.from(pdfBytes); // Convertendo para Buffer

    // // Criar um diretório temporário para armazenar o PDF
    // const dir = path.resolve(__dirname, '..', 'tmp');
    // if (!fs.existsSync(dir)) {
    //   fs.mkdirSync(dir, { recursive: true });
    // }

    // // Caminho onde o arquivo será salvo temporariamente
    // const filePath = path.join(dir, `${paymentId}.pdf`);

    // // Salvar o PDF localmente antes do upload
    // fs.writeFileSync(filePath, pdfBytes);

    // return filePath; // Retorna o caminho do arquivo gerado

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ✅ **Adicionar logo centralizado no cabeçalho**
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('financeX', { align: 'center' });

      // ✅ **Linha horizontal separando o cabeçalho**
      doc.moveDown(3);
      doc.moveTo(50, 80).lineTo(550, 80).stroke();

      // ✅ **Adicionar título**
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Relatório de Transação', { align: 'center' })
        .moveDown(2);

      // ✅ **Adicionar detalhes da transação**
      doc.fontSize(12).font('Helvetica');

      doc.text(`Nome: ${name}`);
      doc.text(`Valor: R$ ${amount.toFixed(2)}`);
      doc.text(`Data: ${new Date(date).toLocaleDateString()}`);
      doc.text(`Conta Origem: ${fromBankAccountId}`);
      doc.text(`Conta Destino: ${toBankAccountId}`);
      doc.text(`ID do Pagamento: ${paymentId}`);

      doc.end();
    });
  }

  private async uploadToS3(
    fileName: string,
    fileBuffer?: Buffer,
    isTransfer?: boolean,
  ) {
    if (!fileBuffer && isTransfer) {
      return {
        statusCode: 400,
        error: 'File is required.',
      };
    }

    const fileNameGenerated = `uploads/transfer/${Date.now().toString()}-${crypto.randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: env.bucketName,
      Key: fileNameGenerated,
      Body: fileBuffer,
      ContentType: 'application/pdf',
    });

    const response = await this.s3.send(command);

    return {
      response,
      fileNameGenerated,
    };
  }
}
