-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "timeDisplayMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "timeDisplayMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00;
