-- CreateEnum
CREATE TYPE "TaskLinkType" AS ENUM ('BLOCKS', 'DEPENDS_ON');

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" TEXT NOT NULL,
    "type" "TaskLinkType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskLink_sourceId_targetId_type_key" ON "TaskLink"("sourceId", "targetId", "type");

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
