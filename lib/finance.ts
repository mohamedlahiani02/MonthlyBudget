import "server-only";
import { prisma } from "@/lib/prisma";
import { dayRange, monthRange, yearRange, monthName } from "@/lib/utils";
import { generateRecurringForMonth } from "@/lib/recurring";
import { getCarryIn, getCarryOut } from "@/lib/carryover";

/** Median of a numeric list (0 for empty). */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Number(value.toFixed(2));
}

export interface DashboardData {
  today: { income: number; expenses: number };
  month: {
    income: number;
    expenses: number;
    fixed: number;
    variable: number;
    remainingBudget: number;
    savings: number;
    budget: number;
    savingGoal: number;
    utilization: number;
    medianDailyVariable: number;
    biggestExpense: { amount: number; description: string } | null;
  };
  recentExpenses: RecentTx[];
  recentIncome: RecentTx[];
  topCategories: { name: string; type: string; total: number }[];
  categoryBreakdown: { name: string; value: number }[];
  fixedVsVariable: { name: string; value: number }[];
  monthlySeries: MonthlyPoint[];
  heatmap: { date: string; total: number }[];
}

export interface RecentTx {
  id: string;
  amount: number;
  description: string;
  date: string;
  meta?: string;
}

export interface MonthlyPoint {
  month: string;
  monthIndex: number;
  income: number;
  expenses: number;
  savings: number;
}

async function sumExpenses(start: Date, end: Date): Promise<number> {
  const res = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { date: { gte: start, lt: end } },
  });
  return res._sum.amount ?? 0;
}

async function sumIncome(start: Date, end: Date): Promise<number> {
  const res = await prisma.income.aggregate({
    _sum: { amount: true },
    where: { date: { gte: start, lt: end } },
  });
  return res._sum.amount ?? 0;
}

/** Sum of expenses split by parent category type (Fixed / Variable) for a period. */
async function sumByType(start: Date, end: Date) {
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: {
      amount: true,
      subcategory: { select: { category: { select: { type: true } } } },
    },
  });
  let fixed = 0;
  let variable = 0;
  for (const e of expenses) {
    if (e.subcategory.category.type === "Fixed") fixed += e.amount;
    else variable += e.amount;
  }
  return { fixed, variable };
}

export async function getDashboardData(
  year: number,
  month: number,
  now = new Date()
): Promise<DashboardData> {
  // Lazily materialise recurring expenses for the viewed month.
  await generateRecurringForMonth(year, month);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const { start: mStart, end: mEnd } = monthRange(year, month);
  // "Today" only applies when viewing the actual current month.
  const { start: dStart, end: dEnd } = isCurrentMonth
    ? dayRange(now)
    : { start: mEnd, end: mEnd }; // empty range -> zero

  const [
    todayIncome,
    todayExpenses,
    monthIncome,
    monthExpenses,
    byType,
    budget,
    recentExpensesRaw,
    recentIncomeRaw,
    biggest,
    grouped,
    monthExpenseRows,
  ] = await Promise.all([
    sumIncome(dStart, dEnd),
    sumExpenses(dStart, dEnd),
    sumIncome(mStart, mEnd),
    sumExpenses(mStart, mEnd),
    sumByType(mStart, mEnd),
    prisma.budget.findUnique({ where: { month_year: { month, year } } }),
    prisma.expense.findMany({
      where: { date: { gte: mStart, lt: mEnd } },
      orderBy: { date: "desc" },
      take: 6,
      include: { subcategory: { include: { category: true } } },
    }),
    prisma.income.findMany({
      where: { date: { gte: mStart, lt: mEnd } },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.expense.findFirst({
      where: { date: { gte: mStart, lt: mEnd } },
      orderBy: { amount: "desc" },
    }),
    prisma.expense.groupBy({
      by: ["subcategoryId"],
      where: { date: { gte: mStart, lt: mEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: mStart, lt: mEnd } },
      select: {
        amount: true,
        date: true,
        subcategory: { select: { category: { select: { type: true } } } },
      },
    }),
  ]);

  // Carryover: surplus received from the previous month counts as income here,
  // and surplus sent to next month reduces this month's net ("recette").
  const [carryIn, carryOut] = await Promise.all([
    getCarryIn(year, month),
    getCarryOut(year, month),
  ]);

  const monthlyBudget = budget?.monthlyBudget ?? 0;
  const savingGoal = budget?.savingGoal ?? 0;
  const displayIncome = monthIncome + carryIn;
  const remainingBudget = monthlyBudget - monthExpenses;
  const savings = displayIncome - monthExpenses - carryOut;
  const utilization = monthlyBudget > 0 ? (monthExpenses / monthlyBudget) * 100 : 0;

  // Median daily *variable* spending (excludes fixed expenses; robust to
  // one-off spikes). Computed over days elapsed (current month) or all days
  // of a past/future month, counting no-spend days as 0.
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;

  const variableByDay = new Map<number, number>();
  for (const row of monthExpenseRows) {
    if (row.subcategory.category.type !== "Variable") continue;
    const day = row.date.getDate();
    variableByDay.set(day, (variableByDay.get(day) ?? 0) + row.amount);
  }
  const dailyVariableTotals: number[] = [];
  for (let d = 1; d <= daysElapsed; d++) dailyVariableTotals.push(variableByDay.get(d) ?? 0);
  const medianDailyVariable = median(dailyVariableTotals);

  // Category breakdown + top categories
  const subIds = grouped.map((g) => g.subcategoryId);
  const subs = subIds.length
    ? await prisma.subcategory.findMany({
        where: { id: { in: subIds } },
        include: { category: true },
      })
    : [];
  const subMap = new Map(subs.map((s) => [s.id, s]));
  const catTotals = new Map<string, { name: string; type: string; total: number }>();
  for (const g of grouped) {
    const sub = subMap.get(g.subcategoryId);
    if (!sub) continue;
    const key = sub.category.id;
    const prev = catTotals.get(key) ?? {
      name: sub.category.name,
      type: sub.category.type,
      total: 0,
    };
    prev.total += g._sum.amount ?? 0;
    catTotals.set(key, prev);
  }
  const topCategories = [...catTotals.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  const categoryBreakdown = [...catTotals.values()]
    .map((c) => ({ name: c.name, value: Number(c.total.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  // Heatmap for the current month (day -> total)
  const heatmapMap = new Map<string, number>();
  for (const row of monthExpenseRows) {
    const key = row.date.toISOString().slice(0, 10);
    heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + row.amount);
  }
  const heatmap = [...heatmapMap.entries()].map(([date, total]) => ({
    date,
    total: Number(total.toFixed(2)),
  }));

  // 12-month rolling series for charts
  const monthlySeries = await getMonthlySeries(year);

  return {
    today: { income: todayIncome, expenses: todayExpenses },
    month: {
      income: displayIncome,
      expenses: monthExpenses,
      fixed: byType.fixed,
      variable: byType.variable,
      remainingBudget,
      savings,
      budget: monthlyBudget,
      savingGoal,
      utilization,
      medianDailyVariable,
      biggestExpense: biggest
        ? { amount: biggest.amount, description: biggest.description }
        : null,
    },
    recentExpenses: recentExpensesRaw.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      date: e.date.toISOString(),
      meta: `${e.subcategory.category.name} · ${e.subcategory.name}`,
    })),
    recentIncome: recentIncomeRaw.map((i) => ({
      id: i.id,
      amount: i.amount,
      description: i.description,
      date: i.date.toISOString(),
    })),
    topCategories,
    categoryBreakdown,
    fixedVsVariable: [
      { name: "Fixed", value: Number(byType.fixed.toFixed(2)) },
      { name: "Variable", value: Number(byType.variable.toFixed(2)) },
    ],
    monthlySeries,
    heatmap,
  };
}

export async function getMonthlySeries(year: number): Promise<MonthlyPoint[]> {
  const { start, end } = yearRange(year);
  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    }),
    prisma.income.findMany({
      where: { date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    }),
  ]);
  const points: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => ({
    month: monthName(i + 1).slice(0, 3),
    monthIndex: i,
    income: 0,
    expenses: 0,
    savings: 0,
  }));
  for (const e of expenses) points[e.date.getMonth()].expenses += e.amount;
  for (const i of incomes) points[i.date.getMonth()].income += i.amount;
  for (const p of points) {
    p.expenses = Number(p.expenses.toFixed(2));
    p.income = Number(p.income.toFixed(2));
    p.savings = Number((p.income - p.expenses).toFixed(2));
  }
  return points;
}

export interface YearlyData {
  year: number;
  annualIncome: number;
  annualExpenses: number;
  annualSavings: number;
  bestSavingMonth: { month: string; value: number } | null;
  worstSpendingMonth: { month: string; value: number } | null;
  averageMonthlyExpenses: number;
  averageMonthlyIncome: number;
  series: MonthlyPoint[];
}

export async function getYearBreakdown(year: number) {
  const { start, end } = yearRange(year);
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: {
      amount: true,
      subcategory: { select: { category: { select: { name: true, type: true } } } },
    },
  });
  const catMap = new Map<string, number>();
  let fixed = 0;
  let variable = 0;
  for (const e of expenses) {
    const cat = e.subcategory.category;
    catMap.set(cat.name, (catMap.get(cat.name) ?? 0) + e.amount);
    if (cat.type === "Fixed") fixed += e.amount;
    else variable += e.amount;
  }
  const categoryBreakdown = [...catMap.entries()]
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
  return {
    categoryBreakdown,
    fixedVsVariable: [
      { name: "Fixed", value: Number(fixed.toFixed(2)) },
      { name: "Variable", value: Number(variable.toFixed(2)) },
    ],
  };
}

export async function getYearlyData(year: number): Promise<YearlyData> {
  const series = await getMonthlySeries(year);
  const annualIncome = series.reduce((s, p) => s + p.income, 0);
  const annualExpenses = series.reduce((s, p) => s + p.expenses, 0);
  const annualSavings = annualIncome - annualExpenses;

  const activeMonths = series.filter((p) => p.income > 0 || p.expenses > 0);
  const divisor = activeMonths.length || 1;

  let bestSavingMonth: { month: string; value: number } | null = null;
  let worstSpendingMonth: { month: string; value: number } | null = null;
  for (const p of series) {
    if (bestSavingMonth === null || p.savings > bestSavingMonth.value) {
      bestSavingMonth = { month: p.month, value: p.savings };
    }
    if (worstSpendingMonth === null || p.expenses > worstSpendingMonth.value) {
      worstSpendingMonth = { month: p.month, value: p.expenses };
    }
  }

  return {
    year,
    annualIncome: Number(annualIncome.toFixed(2)),
    annualExpenses: Number(annualExpenses.toFixed(2)),
    annualSavings: Number(annualSavings.toFixed(2)),
    bestSavingMonth,
    worstSpendingMonth,
    averageMonthlyExpenses: Number((annualExpenses / divisor).toFixed(2)),
    averageMonthlyIncome: Number((annualIncome / divisor).toFixed(2)),
    series,
  };
}
