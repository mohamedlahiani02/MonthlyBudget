import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-time backfill: ensure at least one account exists, then attach every
 * existing expense/income/recurring that has no account to the default one.
 * Idempotent — safe to run multiple times.
 */
async function main() {
  console.log("🔄 Backfilling accounts…");

  let defaultAccount = await prisma.account.findFirst({ where: { isDefault: true } });

  if (!defaultAccount) {
    const existing = await prisma.account.count();
    if (existing === 0) {
      // Seed a few realistic accounts (matches the requested example).
      await prisma.account.createMany({
        data: [
          {
            label: "Caisse principale",
            type: "Caisse",
            openingBalance: 2500,
            isDefault: true,
            isActive: true,
            position: 0,
          },
          {
            label: "Compte BIAT courant",
            type: "Banque",
            bankName: "BIAT",
            openingBalance: 45000,
            isActive: true,
            position: 1,
          },
          {
            label: "Compte Attijari épargne",
            type: "Banque",
            bankName: "Attijari Bank",
            openingBalance: 12000,
            isActive: true,
            position: 2,
          },
        ],
      });
    }
    defaultAccount =
      (await prisma.account.findFirst({ where: { isDefault: true } })) ??
      (await prisma.account.findFirst({ orderBy: { position: "asc" } }));

    // Guarantee exactly one default.
    if (defaultAccount && !defaultAccount.isDefault) {
      await prisma.account.update({
        where: { id: defaultAccount.id },
        data: { isDefault: true },
      });
    }
  }

  if (!defaultAccount) throw new Error("No default account could be resolved");

  const [e, i, r] = await Promise.all([
    prisma.expense.updateMany({ where: { accountId: null }, data: { accountId: defaultAccount.id } }),
    prisma.income.updateMany({ where: { accountId: null }, data: { accountId: defaultAccount.id } }),
    prisma.recurringExpense.updateMany({
      where: { accountId: null },
      data: { accountId: defaultAccount.id },
    }),
  ]);

  console.log("✅ Backfill complete:", {
    defaultAccount: defaultAccount.label,
    expensesUpdated: e.count,
    incomeUpdated: i.count,
    recurringUpdated: r.count,
    totalAccounts: await prisma.account.count(),
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
