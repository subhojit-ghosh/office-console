/*
  Warnings:

  - Made the column `updatedAt` on table `TaskComment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TaskComment" ALTER COLUMN "updatedAt" SET NOT NULL;
