import "server-only";
import { prisma } from "@/lib/prisma";
import { monthRange, monthName } from "@/lib/utils";

/** Domain-rule violation (maps to HTTP 400), distinct from infra/DB errors. */
export class CarryoverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CarryoverError";
  }
}

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

async function isCarried(year: number, month: number): Promise<boolean> {
  const row = await prisma.carryover.findUnique({ where: { month_year: { month, year } } });
  return !!row;
}

/**
 * Amount carried OUT of (year, month), computed dynamically so it always
 * tracks the month's current transactions: 0 unless the month is marked as
 * carried, otherwise the full positive leftover at read time.
 */
export async function getCarryOut(year: number, month: number): Promise<number> {
  if (!(await isCarried(year, month))) return 0;
  const { start, end } = monthRange(year, month);
  const [income, expenses, carryIn] = await Promise.all([
    sum("income", start, end),
    sum("expense", start, end),
    getCarryIn(year, month),
  ]);
  const leftover = income + carryIn - expenses;
  return Number(Math.max(0, leftover).toFixed(2));
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
  carried: boolean; // whether this month is marked as carried
  carryOut: number; // amount carried to next month (0 if not carried)
  leftover: number; // income + carryIn − expenses (before carryOut)
  netAfter: number; // leftover − carryOut ("recette" shown)
  canCarry: boolean; // savingGoal==0 && !carried && leftover>0
  nextMonthLabel: string;
}

export async function getCarryoverStatus(year: number, month: number): Promise<CarryoverStatus> {
  const { start, end } = monthRange(year, month);
  const [income, expenses, carryIn, carried, budget] = await Promise.all([
    sum("income", start, end),
    sum("expense", start, end),
    getCarryIn(year, month),
    isCarried(year, month),
    prisma.budget.findUnique({ where: { month_year: { month, year } } }),
  ]);

  const savingGoal = budget?.savingGoal ?? 0;
  const leftover = Number((income + carryIn - expenses).toFixed(2));
  const carryOut = carried ? Number(Math.max(0, leftover).toFixed(2)) : 0;
  const netAfter = Number((leftover - carryOut).toFixed(2));
  const n = nextMonth(year, month);

  return {
    month,
    year,
    savingGoal,
    income: Number(income.toFixed(2)),
    carryIn: Number(carryIn.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    carried,
    carryOut,
    leftover,
    netAfter,
    canCarry: savingGoal === 0 && !carried && leftover > 0,
    nextMonthLabel: `${monthName(n.month)} ${n.year}`,
  };
}

/** Mark (year, month) as carried. Only when savingGoal==0 and there's a surplus. */
export async function carryForward(year: number, month: number): Promise<CarryoverStatus> {
  const status = await getCarryoverStatus(year, month);
  if (status.savingGoal !== 0) {
    throw new CarryoverError("Carryover only applies when the month's saving goal is 0.");
  }
  if (status.carried) {
    throw new CarryoverError("This month's surplus has already been carried forward.");
  }
  if (status.leftover <= 0) {
    throw new CarryoverError("No positive surplus to carry forward.");
  }
  // `amount` is stored for reference only; reads recompute dynamically.
  await prisma.carryover.upsert({
    where: { month_year: { month, year } },
    update: { amount: status.leftover },
    create: { month, year, amount: status.leftover },
  });
  return getCarryoverStatus(year, month);
}

/** Undo the carryover marker for (year, month). */
export async function undoCarryForward(year: number, month: number): Promise<CarryoverStatus> {
  await prisma.carryover.deleteMany({ where: { month, year } });
  return getCarryoverStatus(year, month);
}
