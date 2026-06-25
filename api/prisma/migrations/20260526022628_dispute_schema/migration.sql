/*
  Warnings:

  - Added the required column `updatedAt` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "decisionReason" TEXT,
ADD COLUMN     "reasonCategory" TEXT NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "responseDeadline" TIMESTAMP(3),
ADD COLUMN     "sellerResponse" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "DisputeAuditLog" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DisputeAuditLog" ADD CONSTRAINT "DisputeAuditLog_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
