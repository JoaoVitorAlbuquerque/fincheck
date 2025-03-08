/*
  Warnings:

  - A unique constraint covering the columns `[bank_account_key]` on the table `bank_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bank_account_key` to the `bank_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "bank_account_key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_bank_account_key_key" ON "bank_accounts"("bank_account_key");
