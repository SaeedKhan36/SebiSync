-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'EXTRACTING', 'EXTRACTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLIANT', 'GAP', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "GapType" AS ENUM ('MISSING_EVIDENCE', 'PAST_DEADLINE', 'STALE_EVIDENCE', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "GapSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "IntermediaryCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntermediaryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intermediary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sebiRegNo" TEXT,
    "clerkOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Intermediary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "intermediaryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "circularNumber" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "r2ObjectKey" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'UPLOADED',
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulatoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "sectionPath" TEXT,
    "text" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "obligatedAction" TEXT NOT NULL,
    "triggerEvent" TEXT,
    "frequency" TEXT,
    "deadlineDays" INTEGER,
    "deadlineBasis" TEXT,
    "penaltyOrRisk" TEXT,
    "citationText" TEXT NOT NULL,
    "citationPage" INTEGER,
    "citationSection" TEXT,
    "extractionConfidence" DOUBLE PRECISION,
    "status" "ObligationStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligationSourceChunk" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,

    CONSTRAINT "ObligationSourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceChecklistItem" (
    "id" TEXT NOT NULL,
    "intermediaryId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "clientId" TEXT,
    "assignedToUserId" TEXT,
    "lastEvidenceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "clientId" TEXT,
    "evidenceType" TEXT NOT NULL,
    "r2ObjectKey" TEXT,
    "description" TEXT,
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceGap" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "gapType" "GapType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" "GapSeverity" NOT NULL DEFAULT 'MEDIUM',
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "intermediaryId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obligationId" TEXT,
    "checklistItemId" TEXT,
    "evidenceRecordId" TEXT,
    "gapId" TEXT,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IntermediaryCategoryToObligation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IntermediaryCategoryToObligation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntermediaryCategory_code_key" ON "IntermediaryCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Intermediary_clerkOrgId_key" ON "Intermediary"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryDocument_supersedesId_key" ON "RegulatoryDocument"("supersedesId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_chunkIndex_idx" ON "DocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Obligation_code_key" ON "Obligation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ObligationSourceChunk_obligationId_chunkId_key" ON "ObligationSourceChunk"("obligationId", "chunkId");

-- CreateIndex
CREATE INDEX "ComplianceChecklistItem_intermediaryId_status_idx" ON "ComplianceChecklistItem"("intermediaryId", "status");

-- CreateIndex
CREATE INDEX "AuditLogEntry_intermediaryId_createdAt_idx" ON "AuditLogEntry"("intermediaryId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_entityType_entityId_idx" ON "AuditLogEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "_IntermediaryCategoryToObligation_B_index" ON "_IntermediaryCategoryToObligation"("B");

-- AddForeignKey
ALTER TABLE "Intermediary" ADD CONSTRAINT "Intermediary_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IntermediaryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "Intermediary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryDocument" ADD CONSTRAINT "RegulatoryDocument_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "RegulatoryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RegulatoryDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RegulatoryDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationSourceChunk" ADD CONSTRAINT "ObligationSourceChunk_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationSourceChunk" ADD CONSTRAINT "ObligationSourceChunk_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceChecklistItem" ADD CONSTRAINT "ComplianceChecklistItem_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "Intermediary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceChecklistItem" ADD CONSTRAINT "ComplianceChecklistItem_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceChecklistItem" ADD CONSTRAINT "ComplianceChecklistItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ComplianceChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ComplianceChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "Intermediary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ComplianceChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "EvidenceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "ComplianceGap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IntermediaryCategoryToObligation" ADD CONSTRAINT "_IntermediaryCategoryToObligation_A_fkey" FOREIGN KEY ("A") REFERENCES "IntermediaryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IntermediaryCategoryToObligation" ADD CONSTRAINT "_IntermediaryCategoryToObligation_B_fkey" FOREIGN KEY ("B") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
