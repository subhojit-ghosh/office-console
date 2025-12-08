-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "crIdMandatoryTaskTypes" JSONB,
ADD COLUMN     "moduleMandatoryForTasks" BOOLEAN NOT NULL DEFAULT false;
