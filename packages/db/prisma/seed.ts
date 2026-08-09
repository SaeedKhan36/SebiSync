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

// One tenant per corpus we ingest. propagateObligation fans out by CATEGORY,
// so an obligation tagged STOCKBROKER publishes to nobody unless a
// stockbroker intermediary exists — the fan-out succeeds, creates zero
// checklist items, and the dashboard stays empty with no error anywhere.
// Seeding both categories is what makes a two-corpus demo show anything.
const TENANTS = [
  {
    name: "Alpha Wealth Advisors",
    categoryCode: "IA",
    clients: ["Asha Rao", "Vikram Mehta", "Priya Nair", "Rohan Gupta", "Sneha Iyer"],
  },
  {
    name: "Meridian Securities",
    categoryCode: "STOCKBROKER",
    clients: ["Kabir Shah", "Lakshmi Menon", "Arjun Desai", "Farah Qureshi", "Ninad Kulkarni"],
  },
] as const;

// Intermediary and Client have no natural unique key in the schema (only id
// and the nullable clerkOrgId), so `upsert` isn't available without adding a
// compound unique constraint that real-world duplicate names would then
// forbid. find-then-create gives the same idempotence — re-running the seed
// tops up missing rows instead of duplicating the whole tenant book.
async function ensureIntermediary(name: string, categoryId: string) {
  const existing = await prisma.intermediary.findFirst({ where: { name, categoryId } });
  return existing ?? prisma.intermediary.create({ data: { name, categoryId } });
}

async function ensureClient(name: string, intermediaryId: string) {
  const existing = await prisma.client.findFirst({ where: { name, intermediaryId } });
  return existing ?? prisma.client.create({ data: { name, intermediaryId } });
}

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
  const categoryByCode = new Map(categories.map((c) => [c.code, c]));

  console.log("Seeded:");
  console.log(
    `  IntermediaryCategory rows = ${categories.length} (${CATEGORIES.map((c) => c.code).join(", ")})`,
  );

  for (const tenant of TENANTS) {
    const category = categoryByCode.get(tenant.categoryCode)!;
    const intermediary = await ensureIntermediary(tenant.name, category.id);
    const clients = await Promise.all(
      tenant.clients.map((name) => ensureClient(name, intermediary.id)),
    );

    console.log(`\n  ${tenant.name} [${tenant.categoryCode}]`);
    console.log(`    IntermediaryCategory.id = ${category.id}`);
    console.log(`    Intermediary.id         = ${intermediary.id}`);
    clients.forEach((c) => console.log(`    Client.id               = ${c.id} (${c.name})`));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
