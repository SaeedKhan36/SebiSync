-- One auto-created PER_CLIENT checklist item per (obligation, client).
-- Prisma cannot express a WHERE clause on @@unique, so this lives in SQL.
-- ON CONFLICT DO NOTHING (createMany skipDuplicates) uses this index.
-- PER_EVENT rows are excluded — they have triggerEventId and may repeat.
CREATE UNIQUE INDEX "ComplianceChecklistItem_obligation_client_auto_key"
ON "ComplianceChecklistItem"("obligationId", "clientId")
WHERE "clientId" IS NOT NULL AND "triggerEventId" IS NULL;
