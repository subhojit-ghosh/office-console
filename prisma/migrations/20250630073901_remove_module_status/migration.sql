/*
  Warnings:

  - You are about to drop the column `status` on the `Module` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Module" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ModuleStatus";
