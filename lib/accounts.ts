import "server-only";
import { prisma } from "@/lib/prisma";
import type { Account } from "@prisma/client";

export interface AccountWithBalance extends Account {
  balance: number;
  incomeTotal: number;
  expenseTotal: number;
  transferIn: number;
  transferOut: number;
}

/**
 * Compute the live balance of every account:
 *   balance = openingBalance + income − expenses + transfersIn − transfersOut
 */
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const [accounts, incomeByAcc, expenseByAcc, transferOut, transferIn] = await Promise.all([
    prisma.account.findMany({ orderBy: { position: "asc" } }),
    prisma.income.groupBy({ by: ["accountId"], _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["accountId"], _sum: { amount: true } }),
    prisma.transfer.groupBy({ by: ["fromAccountId"], _sum: { amount: true } }),
    prisma.transfer.groupBy({ by: ["toAccountId"], _sum: { amount: true } }),
  ]);

  const incMap = new Map(incomeByAcc.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const expMap = new Map(expenseByAcc.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const outMap = new Map(transferOut.map((r) => [r.fromAccountId, r._sum.amount ?? 0]));
  const inMap = new Map(transferIn.map((r) => [r.toAccountId, r._sum.amount ?? 0]));

  return accounts.map((a) => {
    const incomeTotal = incMap.get(a.id) ?? 0;
    const expenseTotal = expMap.get(a.id) ?? 0;
    const transferOutTotal = outMap.get(a.id) ?? 0;
    const transferInTotal = inMap.get(a.id) ?? 0;
    const balance =
      a.openingBalance + incomeTotal - expenseTotal + transferInTotal - transferOutTotal;
    return {
      ...a,
      incomeTotal,
      expenseTotal,
      transferIn: transferInTotal,
      transferOut: transferOutTotal,
      balance: Number(balance.toFixed(3)),
    };
  });
}

/** Total net worth across active accounts. */
export async function getNetWorth(): Promise<number> {
  const accounts = await getAccountsWithBalances();
  return Number(
    accounts.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0).toFixed(3)
  );
}

/** Ensure only the given account is the default (unset others). */
export async function makeSoleDefault(accountId: string) {
  await prisma.$transaction([
    prisma.account.updateMany({ where: { id: { not: accountId } }, data: { isDefault: false } }),
    prisma.account.update({ where: { id: accountId }, data: { isDefault: true } }),
  ]);
}
