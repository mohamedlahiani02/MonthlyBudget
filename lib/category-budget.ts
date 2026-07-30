import "server-only";
import { prisma } from "@/lib/prisma";
import { monthRange, monthName } from "@/lib/utils";

export type BudgetStatusLevel = "ok" | "near" | "over" | "none";

const NEAR = 80;

function statusFor(available: number, spent: number): { pct: number | null; status: BudgetStatusLevel } {
  if (available <= 0) return { pct: null, status: "none" };
  const pct = Number(((spent / available) * 100).toFixed(1));
  return { pct, status: pct >= 100 ? "over" : pct >= NEAR ? "near" : "ok" };
}

const monthKey = (y: number, m: number) => y * 12 + (m - 1);

export interface EnvelopeNode {
  id: string; // subcategoryId
  name: string;
  budgeted: number; // this month's allocation
  rollover: boolean;
  carryover: number; // accumulated unspent/overspent from prior months
  available: number; // budgeted + carryover
  spent: number;
  remaining: number; // available - spent
  pct: number | null;
  status: BudgetStatusLevel;
}

export interface BudgetCategoryNode {
  categoryId: string;
  name: string;
  type: string;
  bySub: boolean; // true when this category is budgeted via subcategory envelopes
  budgeted: number; // effective this-month allocation (sum of subs OR category-global)
  categoryBudget: number; // the category-global row amount (0 if none)
  rollover: boolean; // category-level rollover (only when !bySub)
  carryover: number;
  available: number;
  spent: number;
  remaining: number;
  pct: number | null;
  status: BudgetStatusLevel;
  subcategories: EnvelopeNode[]; // full list (for the editor); budgeted may be 0
}

export interface BudgetComparison {
  month: number;
  year: number;
  categories: BudgetCategoryNode[];
  totals: { budgeted: number; spent: number; remaining: number };
  hasAnyBudget: boolean;
}

// ---- shared loaders -------------------------------------------------------

/** Spend per subcategory within [start,end). */
async function spentBySubcategory(start: Date, end: Date): Promise<Map<string, number>> {
  const grouped = await prisma.expense.groupBy({
    by: ["subcategoryId"],
    where: { date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return new Map(grouped.map((g) => [g.subcategoryId, g._sum.amount ?? 0]));
}

/**
 * Carryover for rollover-enabled envelopes: for each prior month that had a
 * budget row, accumulate (budgeted − spent). Returns maps keyed by envelope id.
 */
async function computeCarryovers(
  year: number,
  month: number,
  catRolloverIds: Set<string>,
  subRolloverIds: Set<string>
): Promise<{ cat: Map<string, number>; sub: Map<string, number> }> {
  const cat = new Map<string, number>();
  const sub = new Map<string, number>();
  if (catRolloverIds.size === 0 && subRolloverIds.size === 0) return { cat, sub };

  const currentKey = monthKey(year, month);

  // Prior budget rows for the rollover envelopes.
  const [catRows, subRows] = await Promise.all([
    catRolloverIds.size
      ? prisma.categoryBudget.findMany({ where: { categoryId: { in: [...catRolloverIds] } } })
      : Promise.resolve([]),
    subRolloverIds.size
      ? prisma.subcategoryBudget.findMany({ where: { subcategoryId: { in: [...subRolloverIds] } } })
      : Promise.resolve([]),
  ]);

  const priorCat = catRows.filter((r) => monthKey(r.year, r.month) < currentKey);
  const priorSub = subRows.filter((r) => monthKey(r.year, r.month) < currentKey);
  if (priorCat.length === 0 && priorSub.length === 0) return { cat, sub };

  // Earliest prior month we need spending for.
  const keys = [...priorCat, ...priorSub].map((r) => monthKey(r.year, r.month));
  const minKey = Math.min(...keys);
  const minYear = Math.floor(minKey / 12);
  const minMonth = (minKey % 12) + 1;
  const rangeStart = new Date(minYear, minMonth - 1, 1);
  const rangeEnd = new Date(year, month - 1, 1); // exclusive: up to current month start

  // Spend per subcategory per month across the prior range.
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    select: { amount: true, date: true, subcategoryId: true },
  });
  const subSpendByMonth = new Map<string, number>(); // key `${subId}|${monthKey}`
  const catSpendByMonth = new Map<string, number>(); // key `${catId}|${monthKey}`
  // Need subId -> catId
  const subs = await prisma.subcategory.findMany({ select: { id: true, categoryId: true } });
  const subToCat = new Map(subs.map((s) => [s.id, s.categoryId]));
  for (const e of expenses) {
    const k = monthKey(e.date.getFullYear(), e.date.getMonth() + 1);
    const sk = `${e.subcategoryId}|${k}`;
    subSpendByMonth.set(sk, (subSpendByMonth.get(sk) ?? 0) + e.amount);
    const catId = subToCat.get(e.subcategoryId);
    if (catId) {
      const ck = `${catId}|${k}`;
      catSpendByMonth.set(ck, (catSpendByMonth.get(ck) ?? 0) + e.amount);
    }
  }

  for (const r of priorCat) {
    const k = monthKey(r.year, r.month);
    const spent = catSpendByMonth.get(`${r.categoryId}|${k}`) ?? 0;
    cat.set(r.categoryId, (cat.get(r.categoryId) ?? 0) + (r.amount - spent));
  }
  for (const r of priorSub) {
    const k = monthKey(r.year, r.month);
    const spent = subSpendByMonth.get(`${r.subcategoryId}|${k}`) ?? 0;
    sub.set(r.subcategoryId, (sub.get(r.subcategoryId) ?? 0) + (r.amount - spent));
  }
  return { cat, sub };
}

// ---- main comparison ------------------------------------------------------

export async function getBudgetComparison(year: number, month: number): Promise<BudgetComparison> {
  const { start, end } = monthRange(year, month);

  const [categories, catBudgets, subBudgets, spentSub] = await Promise.all([
    prisma.category.findMany({
      orderBy: { position: "asc" },
      include: { subcategories: { orderBy: { position: "asc" } } },
    }),
    prisma.categoryBudget.findMany({ where: { month, year } }),
    prisma.subcategoryBudget.findMany({ where: { month, year } }),
    spentBySubcategory(start, end),
  ]);

  const catBudgetMap = new Map(catBudgets.map((b) => [b.categoryId, b]));
  const subBudgetMap = new Map(subBudgets.map((b) => [b.subcategoryId, b]));

  const catRolloverIds = new Set(catBudgets.filter((b) => b.rollover).map((b) => b.categoryId));
  const subRolloverIds = new Set(subBudgets.filter((b) => b.rollover).map((b) => b.subcategoryId));
  const carryovers = await computeCarryovers(year, month, catRolloverIds, subRolloverIds);

  const nodes: BudgetCategoryNode[] = categories.map((c) => {
    const subNodes: EnvelopeNode[] = c.subcategories.map((s) => {
      const b = subBudgetMap.get(s.id);
      const budgeted = b?.amount ?? 0;
      const rollover = b?.rollover ?? false;
      const carryover = rollover ? Number((carryovers.sub.get(s.id) ?? 0).toFixed(2)) : 0;
      const spent = Number((spentSub.get(s.id) ?? 0).toFixed(2));
      const available = Number((budgeted + carryover).toFixed(2));
      const remaining = Number((available - spent).toFixed(2));
      const { pct, status } = statusFor(available, spent);
      return { id: s.id, name: s.name, budgeted, rollover, carryover, available, spent, remaining, pct, status };
    });

    const hasSubBudgets = subNodes.some((s) => s.budgeted > 0);
    const catBudgetRow = catBudgetMap.get(c.id);
    const categoryBudget = catBudgetRow?.amount ?? 0;

    // Effective allocation: subcategory rollup when present, else category-global.
    const catSpent = Number(
      c.subcategories.reduce((sum, s) => sum + (spentSub.get(s.id) ?? 0), 0).toFixed(2)
    );

    let budgeted: number;
    let rollover: boolean;
    let carryover: number;
    if (hasSubBudgets) {
      budgeted = Number(subNodes.reduce((s, n) => s + n.budgeted, 0).toFixed(2));
      rollover = subNodes.some((n) => n.rollover);
      carryover = Number(subNodes.reduce((s, n) => s + n.carryover, 0).toFixed(2));
    } else {
      budgeted = categoryBudget;
      rollover = catBudgetRow?.rollover ?? false;
      carryover = rollover ? Number((carryovers.cat.get(c.id) ?? 0).toFixed(2)) : 0;
    }
    const available = Number((budgeted + carryover).toFixed(2));
    const remaining = Number((available - catSpent).toFixed(2));
    const { pct, status } = statusFor(available, catSpent);

    return {
      categoryId: c.id,
      name: c.name,
      type: c.type,
      bySub: hasSubBudgets,
      budgeted,
      categoryBudget,
      rollover,
      carryover,
      available,
      spent: catSpent,
      remaining,
      pct,
      status,
      subcategories: subNodes,
    };
  });

  const budgetedNodes = nodes.filter((n) => n.budgeted > 0);
  const totals = {
    budgeted: Number(budgetedNodes.reduce((s, n) => s + n.available, 0).toFixed(2)),
    spent: Number(budgetedNodes.reduce((s, n) => s + n.spent, 0).toFixed(2)),
    remaining: Number(budgetedNodes.reduce((s, n) => s + n.remaining, 0).toFixed(2)),
  };

  return {
    month,
    year,
    categories: nodes,
    totals,
    hasAnyBudget: catBudgets.length > 0 || subBudgets.length > 0,
  };
}

// ---- trend (for the report) ----------------------------------------------

export interface BudgetTrendPoint {
  label: string; // "Jul"
  month: number;
  year: number;
  budgeted: number;
  spent: number;
}

/** Budgeted (effective) vs actual spend in budgeted envelopes over the last N months. */
export async function getBudgetTrend(endYear: number, endMonth: number, months = 6): Promise<BudgetTrendPoint[]> {
  const points: BudgetTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const comp = await getBudgetComparison(y, m);
    points.push({
      label: monthName(m).slice(0, 3),
      month: m,
      year: y,
      budgeted: comp.totals.budgeted,
      spent: comp.totals.spent,
    });
  }
  return points;
}

// ---- copy budgets between months -----------------------------------------

export async function copyBudgets(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<{ categories: number; subcategories: number }> {
  const [catRows, subRows] = await Promise.all([
    prisma.categoryBudget.findMany({ where: { month: fromMonth, year: fromYear } }),
    prisma.subcategoryBudget.findMany({ where: { month: fromMonth, year: fromYear } }),
  ]);

  await prisma.$transaction([
    ...catRows.map((r) =>
      prisma.categoryBudget.upsert({
        where: { categoryId_month_year: { categoryId: r.categoryId, month: toMonth, year: toYear } },
        update: { amount: r.amount, rollover: r.rollover },
        create: { categoryId: r.categoryId, month: toMonth, year: toYear, amount: r.amount, rollover: r.rollover },
      })
    ),
    ...subRows.map((r) =>
      prisma.subcategoryBudget.upsert({
        where: { subcategoryId_month_year: { subcategoryId: r.subcategoryId, month: toMonth, year: toYear } },
        update: { amount: r.amount, rollover: r.rollover },
        create: {
          subcategoryId: r.subcategoryId,
          month: toMonth,
          year: toYear,
          amount: r.amount,
          rollover: r.rollover,
        },
      })
    ),
  ]);

  return { categories: catRows.length, subcategories: subRows.length };
}
