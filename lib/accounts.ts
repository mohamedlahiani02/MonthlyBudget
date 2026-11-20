import "server-only";
import { prisma } from "@/lib/prisma";
import type { Account } from "@prisma/client";
import { anchorsByAccount, listFreshStarts, monthStart } from "@/lib/fresh-start";

export interface AccountWithBalance extends Account {
  balance: number;
  incomeTotal: number;
  expenseTotal: number;
  transferIn: number;
  transferOut: number;
  /** "YYYY-MM" of the fresh start the balance is counted from, or null. */
  balanceFrom: string | null;
}

interface Flows {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
}

async function flowsSince(accountId: string, since: Date): Promise<Flows> {
  const date = { gte: since };
  const [income, expense, tIn, tOut] = await Promise.all([
    prisma.income.aggregate({ _sum: { amount: true }, where: { accountId, date } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { accountId, date } }),
    prisma.transfer.aggregate({ _sum: { amount: true }, where: { toAccountId: accountId, date } }),
    prisma.transfer.aggregate({ _sum: { amount: true }, where: { fromAccountId: accountId, date } }),
  ]);
  return {
    income: income._sum.amount ?? 0,
    expense: expense._sum.amount ?? 0,
    transferIn: tIn._sum.amount ?? 0,
    transferOut: tOut._sum.amount ?? 0,
  };
}

/**
 * Compute the live balance of every account:
 *   balance = start + income − expenses + transfersIn − transfersOut
 * where start is the opening balance over all time, or the amount set by the
 * latest fresh start (counting only transactions from that month onward).
 */
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const [accounts, incomeByAcc, expenseByAcc, transferOut, transferIn, freshStarts] = await Promise.all([
    prisma.account.findMany({ orderBy: { position: "asc" } }),
    prisma.income.groupBy({ by: ["accountId"], _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["accountId"], _sum: { amount: true } }),
    prisma.transfer.groupBy({ by: ["fromAccountId"], _sum: { amount: true } }),
    prisma.transfer.groupBy({ by: ["toAccountId"], _sum: { amount: true } }),
    listFreshStarts(),
  ]);

  const incMap = new Map(incomeByAcc.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const expMap = new Map(expenseByAcc.map((r) => [r.accountId, r._sum.amount ?? 0]));
  const outMap = new Map(transferOut.map((r) => [r.fromAccountId, r._sum.amount ?? 0]));
  const inMap = new Map(transferIn.map((r) => [r.toAccountId, r._sum.amount ?? 0]));
  const anchors = anchorsByAccount(freshStarts);

  return Promise.all(
    accounts.map(async (a) => {
      const anchor = anchors.get(a.id);
      const flows: Flows = anchor
        ? await flowsSince(a.id, monthStart(anchor.month))
        : {
            income: incMap.get(a.id) ?? 0,
            expense: expMap.get(a.id) ?? 0,
            transferIn: inMap.get(a.id) ?? 0,
            transferOut: outMap.get(a.id) ?? 0,
          };
      const start = anchor ? anchor.amount : a.openingBalance;
      const balance = start + flows.income - flows.expense + flows.transferIn - flows.transferOut;
      return {
        ...a,
        incomeTotal: flows.income,
        expenseTotal: flows.expense,
        transferIn: flows.transferIn,
        transferOut: flows.transferOut,
        balance: Number(balance.toFixed(3)),
        balanceFrom: anchor?.month ?? null,
      };
    })
  );
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
