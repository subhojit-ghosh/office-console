-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "showAssignees" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timeDisplayMultiplier" INTEGER DEFAULT 1;
