-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'SIGNED_OFF';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "signedOffAt" TIMESTAMP(3),
ADD COLUMN     "signedOffById" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_signedOffById_fkey" FOREIGN KEY ("signedOffById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
