/*
  Warnings:

  - You are about to drop the column `timeDisplayMultiplier` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `timeDisplayMultiplier` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `timeDisplayMultiplier` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "timeDisplayMultiplier";

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "timeDisplayMultiplier";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "timeDisplayMultiplier";
