-- CreateEnum
CREATE TYPE "ObligationFanOutStatus" AS ENUM ('NONE', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Obligation" ADD COLUMN     "fanOutError" TEXT,
ADD COLUMN     "fanOutRunId" TEXT,
ADD COLUMN     "fanOutStatus" "ObligationFanOutStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "RegulatoryDocument" ADD COLUMN     "lastIngestionRunId" TEXT;
