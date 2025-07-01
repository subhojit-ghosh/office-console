/*
  Warnings:

  - You are about to alter the column `timeDisplayMultiplier` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(4,2)`.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "timeDisplayMultiplier" SET DATA TYPE DECIMAL(4,2);
