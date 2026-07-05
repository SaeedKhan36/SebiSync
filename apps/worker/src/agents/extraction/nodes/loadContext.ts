import { prisma } from "@sebi/db";
import type { ExtractionStateType } from "../state";

export async function loadContext(state: ExtractionStateType): Promise<Partial<ExtractionStateType>> {
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId: state.documentId },
    orderBy: { chunkIndex: "asc" },
  });
  return { chunks };
}
