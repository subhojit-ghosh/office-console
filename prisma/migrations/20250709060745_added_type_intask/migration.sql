-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK', 'BUG');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'TASK';
