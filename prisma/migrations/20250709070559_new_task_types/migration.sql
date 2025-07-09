-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskType" ADD VALUE 'FEATURE';
ALTER TYPE "TaskType" ADD VALUE 'IMPROVEMENT';
ALTER TYPE "TaskType" ADD VALUE 'RESEARCH';
ALTER TYPE "TaskType" ADD VALUE 'DOCUMENTATION';
ALTER TYPE "TaskType" ADD VALUE 'TEST';
ALTER TYPE "TaskType" ADD VALUE 'MEETING';
