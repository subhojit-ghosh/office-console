/*
  Warnings:

  - You are about to drop the column `createdById` on the `TaskActivity` table. All the data in the column will be lost.
  - Added the required column `userId` to the `TaskActivity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TaskActivity" DROP CONSTRAINT "TaskActivity_createdById_fkey";

-- AlterTable
ALTER TABLE "TaskActivity" DROP COLUMN "createdById",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
