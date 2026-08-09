-- CreateEnum
CREATE TYPE "SupersessionKind" AS ENUM ('NEW', 'AMENDS', 'UNCHANGED');

-- CreateEnum
CREATE TYPE "SupersessionProposalStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "Obligation" ADD COLUMN     "supersedesId" TEXT;

-- CreateTable
CREATE TABLE "SupersessionProposal" (
    "id" TEXT NOT NULL,
    "newObligationId" TEXT NOT NULL,
    "priorObligationId" TEXT,
    "kind" "SupersessionKind" NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "rationale" TEXT NOT NULL,
    "status" "SupersessionProposalStatus" NOT NULL DEFAULT 'PROPOSED',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupersessionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupersessionProposal_newObligationId_key" ON "SupersessionProposal"("newObligationId");

-- CreateIndex
CREATE INDEX "SupersessionProposal_status_idx" ON "SupersessionProposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Obligation_supersedesId_key" ON "Obligation"("supersedesId");

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Obligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupersessionProposal" ADD CONSTRAINT "SupersessionProposal_newObligationId_fkey" FOREIGN KEY ("newObligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupersessionProposal" ADD CONSTRAINT "SupersessionProposal_priorObligationId_fkey" FOREIGN KEY ("priorObligationId") REFERENCES "Obligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

