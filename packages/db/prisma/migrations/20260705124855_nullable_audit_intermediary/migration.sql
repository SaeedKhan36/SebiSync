-- DropForeignKey
ALTER TABLE "AuditLogEntry" DROP CONSTRAINT "AuditLogEntry_intermediaryId_fkey";

-- AlterTable
ALTER TABLE "AuditLogEntry" ALTER COLUMN "intermediaryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "Intermediary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

