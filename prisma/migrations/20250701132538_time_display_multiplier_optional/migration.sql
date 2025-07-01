-- AlterTable
ALTER TABLE "Module" ALTER COLUMN "timeDisplayMultiplier" DROP NOT NULL,
ALTER COLUMN "timeDisplayMultiplier" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "timeDisplayMultiplier" DROP NOT NULL,
ALTER COLUMN "timeDisplayMultiplier" DROP DEFAULT;
