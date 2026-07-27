import "server-only";
import { prisma } from "@/lib/prisma";
import { weekRange, monthRange, median } from "@/lib/utils";

const WEEKLY_CAP_KEY = "weekly_cap";

export type WeeklyStatusLevel = "ok" | "near" | "over" | "none";

export interface WeeklyStatus {
  weekStart: string;
  weekEnd: string;
  spend: number;
  cap: number | null;
  suggested: number;
  remaining: number | null;
  pct: number | null;
  status: WeeklyStatusLevel;
  breakdown: {
    income: number;
    savingGoal: number;
    fixed: number;
    discretionary: number;
    weeksInMonth: number;
  };
}

const NEAR_THRESHOLD = 80; // % of cap

/** Sum of variable-category expenses in [start, end). */
async function sumVariableExpenses(start: Date, end: Date): Promise<number> {
  const rows = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: {
      amount: true,
      subcategory: { select: { category: { select: { type: true } } } },
    },
  });
  return rows
    .filter((r) => r.subcategory.category.type === "Variable")
    .reduce((s, r) => s + r.amount, 0);
}

async function sumFixedExpenses(start: Date, end: Date): Promise<number> {
  const rows = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: {
      amount: true,
      subcategory: { select: { category: { select: { type: true } } } },
    },
  });
  return rows
    .filter((r) => r.subcategory.category.type === "Fixed")
    .reduce((s, r) => s + r.amount, 0);
}

export async function getWeeklyCap(): Promise<number | null> {
  const row = await prisma.setting.findUnique({ where: { key: WEEKLY_CAP_KEY } });
  if (!row) return null;
  const n = Number(row.value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function setWeeklyCap(cap: number | null): Promise<void> {
  if (cap === null || cap <= 0) {
    await prisma.setting.deleteMany({ where: { key: WEEKLY_CAP_KEY } });
    return;
  }
  await prisma.setting.upsert({
    where: { key: WEEKLY_CAP_KEY },
    update: { value: String(cap) },
    create: { key: WEEKLY_CAP_KEY, value: String(cap) },
  });
}

/**
 * Savings-driven weekly cap suggestion (Pay-Yourself-First / zero-based):
 *   discretionary = income − savingGoal − fixed expenses
 *   suggested     = max(0, discretionary) / weeksInMonth
 * Falls back to the median of recent weeks' variable spend when there's no
 * budget/income/savings data to work from.
 */
async function computeSuggestion(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start: mStart, end: mEnd } = monthRange(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeksInMonth = Number((daysInMonth / 7).toFixed(2));

  const [budget, incomeAgg, fixed] = await Promise.all([
    prisma.budget.findUnique({ where: { month_year: { month, year } } }),
    prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: mStart, lt: mEnd } } }),
    sumFixedExpenses(mStart, mEnd),
  ]);

  const income = (incomeAgg._sum.amount ?? 0) || (budget?.monthlyBudget ?? 0);
  const savingGoal = budget?.savingGoal ?? 0;
  const discretionary = Math.max(0, income - savingGoal - fixed);
  let suggested = weeksInMonth > 0 ? discretionary / weeksInMonth : 0;

  // Fallback: no meaningful inputs → median of last 8 weeks of variable spend.
  if (income <= 0 && savingGoal <= 0) {
    const weeks: number[] = [];
    for (let i = 1; i <= 8; i++) {
      const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * i);
      const { start, end } = weekRange(ref);
      weeks.push(await sumVariableExpenses(start, end));
    }
    suggested = median(weeks);
  }

  return {
    suggested: Number(suggested.toFixed(2)),
    breakdown: {
      income: Number(income.toFixed(2)),
      savingGoal: Number(savingGoal.toFixed(2)),
      fixed: Number(fixed.toFixed(2)),
      discretionary: Number(discretionary.toFixed(2)),
      weeksInMonth,
    },
  };
}

export async function getWeeklyStatus(now = new Date()): Promise<WeeklyStatus> {
  const { start, end } = weekRange(now);
  const [spend, cap, suggestion] = await Promise.all([
    sumVariableExpenses(start, end),
    getWeeklyCap(),
    computeSuggestion(now),
  ]);

  let status: WeeklyStatusLevel = "none";
  let pct: number | null = null;
  let remaining: number | null = null;
  if (cap && cap > 0) {
    pct = Number(((spend / cap) * 100).toFixed(1));
    remaining = Number((cap - spend).toFixed(2));
    status = pct >= 100 ? "over" : pct >= NEAR_THRESHOLD ? "near" : "ok";
  }

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    spend: Number(spend.toFixed(2)),
    cap,
    suggested: suggestion.suggested,
    remaining,
    pct,
    status,
    breakdown: suggestion.breakdown,
  };
}
