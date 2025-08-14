-- CreateEnum
CREATE TYPE "public"."RequirementActivityType" AS ENUM ('CREATED', 'FIELD_CHANGE', 'UPDATED');

-- CreateTable
CREATE TABLE "public"."RequirementActivity" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "type" "public"."RequirementActivityType" NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RequirementActivity" ADD CONSTRAINT "RequirementActivity_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "public"."Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequirementActivity" ADD CONSTRAINT "RequirementActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
