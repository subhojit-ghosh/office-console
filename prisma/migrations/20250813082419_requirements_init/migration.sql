-- CreateEnum
CREATE TYPE "public"."RequirementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."RequirementType" AS ENUM ('NEW_PROJECT', 'FEATURE_REQUEST', 'CHANGE_REQUEST', 'BUG');

-- CreateTable
CREATE TABLE "public"."Requirement" (
    "id" TEXT NOT NULL,
    "type" "public"."RequirementType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "public"."RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Requirement" ADD CONSTRAINT "Requirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Requirement" ADD CONSTRAINT "Requirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Requirement" ADD CONSTRAINT "Requirement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
