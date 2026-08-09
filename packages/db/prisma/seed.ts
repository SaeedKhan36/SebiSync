import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Every SEBI intermediary category the extraction agent might tag an
// obligation with. This list is load-bearing, not decorative:
// classifyApplicability silently DROPS any candidate whose
// applicableCategoryCodes match no row here, so a missing category means
// silently losing real obligations at ingestion time. Codes mirror the
// examples given to the model in agents/extraction/prompts/extractionPrompt.ts.
// Codes match the schema's documented set and the closed list the extraction
// prompt now hands the model — all three must stay in sync or obligations
// vanish silently at classification.
const CATEGORIES = [
  { code: "IA", name: "Investment Adviser" },
  { code: "STOCKBROKER", name: "Stockbroker" },
  { code: "DEPOSITORY", name: "Depository / Depository Participant" },
  { code: "AMC", name: "Asset Management Company" },
  { code: "RTA", name: "Registrar and Transfer Agent" },
  { code: "MII", name: "Market Infrastructure Institution" },
] as const;

async function main() {
  const categories = await Promise.all(
    CATEGORIES.map((data) =>
      prisma.intermediaryCategory.upsert({
        where: { code: data.code },
        update: { name: data.name },
        create: data,
      }),
    ),
  );

  const category = categories.find((c) => c.code === "IA")!;

  const intermediary = await prisma.intermediary.create({
    data: { name: "Alpha Wealth Advisors", categoryId: category.id },
  });

  const clients = await Promise.all(
    ["Asha Rao", "Vikram Mehta", "Priya Nair", "Rohan Gupta", "Sneha Iyer"].map((name) =>
      prisma.client.create({ data: { name, intermediaryId: intermediary.id } }),
    ),
  );

  console.log("Seeded:");
  console.log(`  IntermediaryCategory rows = ${categories.length} (${CATEGORIES.map((c) => c.code).join(", ")})`);
  console.log(`  IntermediaryCategory.id = ${category.id} (IA)`);
  console.log(`  Intermediary.id        = ${intermediary.id}`);
  clients.forEach((c) => console.log(`  Client.id              = ${c.id} (${c.name})`));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
