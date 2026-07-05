import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.intermediaryCategory.create({
    data: { code: "IA", name: "Investment Adviser" },
  });

  const intermediary = await prisma.intermediary.create({
    data: { name: "Alpha Wealth Advisors", categoryId: category.id },
  });

  const clients = await Promise.all(
    ["Asha Rao", "Vikram Mehta", "Priya Nair", "Rohan Gupta", "Sneha Iyer"].map((name) =>
      prisma.client.create({ data: { name, intermediaryId: intermediary.id } }),
    ),
  );

  console.log("Seeded:");
  console.log(`  IntermediaryCategory.id = ${category.id}`);
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
