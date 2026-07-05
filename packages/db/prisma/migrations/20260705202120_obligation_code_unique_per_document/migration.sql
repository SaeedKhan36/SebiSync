-- DropIndex
DROP INDEX "Obligation_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Obligation_documentId_code_key" ON "Obligation"("documentId", "code");

