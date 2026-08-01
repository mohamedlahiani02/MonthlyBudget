import "server-only";
import { prisma } from "@/lib/prisma";
import { monthRange, monthName } from "@/lib/utils";

/** Previous (year, month) given a month. */
function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

async function sum(model: "income" | "expense", start: Date, end: Date): Promise<number> {
  const res =
    model === "income"
      ? await prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lt: end } } })
      : await prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lt: end } } });
  return res._sum.amount ?? 0;
}

/** Amount carried OUT of (year, month) — already committed. */
export async function getCarryOut(year: number, month: number): Promise<number> {
  const row = await prisma.carryover.findUnique({ where: { month_year: { month, year } } });
  return row?.amount ?? 0;
}

/** Amount carried INTO (year, month) as "income from previous month". */
export async function getCarryIn(year: number, month: number): Promise<number> {
  const p = prevMonth(year, month);
  return getCarryOut(p.year, p.month);
}

export interface CarryoverStatus {
  month: number;
  year: number;
  savingGoal: number;
  income: number; // recorded income this month
  carryIn: number; // from previous month
  expenses: number;
  carryOut: number; // already carried to next month (0 if none)
  leftover: number; // income + carryIn − expenses (before carryOut)
  netAfter: number; // leftover − carryOut ("recette" shown)
  canCarry: boolean; // savingGoal==0 && carryOut==0 && leftover>0
  nextMonthLabel: string;
}

export async function getCarryoverStatus(year: number, month: number): Promise<CarryoverStatus> {
  const { start, end } = monthRange(year, month);
  const [income, expenses, carryIn, carryOut, budget] = await Promise.all([
    sum("income", start, end),
    sum("expense", start, end),
    getCarryIn(year, month),
    getCarryOut(year, month),
    prisma.budget.findUnique({ where: { month_year: { month, year } } }),
  ]);

  const savingGoal = budget?.savingGoal ?? 0;
  const leftover = Number((income + carryIn - expenses).toFixed(2));
  const netAfter = Number((leftover - carryOut).toFixed(2));
  const n = nextMonth(year, month);

  return {
    month,
    year,
    savingGoal,
    income: Number(income.toFixed(2)),
    carryIn: Number(carryIn.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    carryOut: Number(carryOut.toFixed(2)),
    leftover,
    netAfter,
    canCarry: savingGoal === 0 && carryOut === 0 && leftover > 0,
    nextMonthLabel: `${monthName(n.month)} ${n.year}`,
  };
}

/** Carry the full leftover of (year, month) forward. Only when savingGoal==0. */
export async function carryForward(year: number, month: number): Promise<CarryoverStatus> {
  const status = await getCarryoverStatus(year, month);
  if (status.savingGoal !== 0) {
    throw new Error("Carryover only applies when the month's saving goal is 0.");
  }
  if (status.carryOut > 0) {
    throw new Error("This month's surplus has already been carried forward.");
  }
  if (status.leftover <= 0) {
    throw new Error("No positive surplus to carry forward.");
  }
  await prisma.carryover.upsert({
    where: { month_year: { month, year } },
    update: { amount: status.leftover },
    create: { month, year, amount: status.leftover },
  });
  return getCarryoverStatus(year, month);
}

/** Undo the carryover for (year, month). */
export async function undoCarryForward(year: number, month: number): Promise<CarryoverStatus> {
  await prisma.carryover.deleteMany({ where: { month, year } });
  return getCarryoverStatus(year, month);
}
