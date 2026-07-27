import "server-only";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";

export type BudgetStatusLevel = "ok" | "near" | "over" | "none";

export interface CategoryBudgetRow {
  categoryId: string;
  name: string;
  type: string;
  budgeted: number; // 0 if not budgeted
  spent: number;
  remaining: number;
  pct: number | null; // null when not budgeted
  status: BudgetStatusLevel;
}

export interface CategoryBudgetComparison {
  rows: CategoryBudgetRow[]; // every category (for the editor)
  budgeted: CategoryBudgetRow[]; // only rows with a budget set
  totals: { budgeted: number; spent: number; remaining: number };
}

const NEAR = 80;

/** Actual + budgeted spend per category for a given month. */
export async function getCategoryBudgetComparison(
  year: number,
  month: number
): Promise<CategoryBudgetComparison> {
  const { start, end } = monthRange(year, month);

  const [categories, budgets, grouped] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    prisma.categoryBudget.findMany({ where: { month, year } }),
    prisma.expense.groupBy({
      by: ["subcategoryId"],
      where: { date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  // Map subcategory -> category to roll expense sums up to the category.
  const subIds = grouped.map((g) => g.subcategoryId);
  const subs = subIds.length
    ? await prisma.subcategory.findMany({
        where: { id: { in: subIds } },
        select: { id: true, categoryId: true },
      })
    : [];
  const subToCat = new Map(subs.map((s) => [s.id, s.categoryId]));
  const spentByCat = new Map<string, number>();
  for (const g of grouped) {
    const catId = subToCat.get(g.subcategoryId);
    if (!catId) continue;
    spentByCat.set(catId, (spentByCat.get(catId) ?? 0) + (g._sum.amount ?? 0));
  }

  const budgetByCat = new Map(budgets.map((b) => [b.categoryId, b.amount]));

  const rows: CategoryBudgetRow[] = categories.map((c) => {
    const budgeted = budgetByCat.get(c.id) ?? 0;
    const spent = Number((spentByCat.get(c.id) ?? 0).toFixed(2));
    const remaining = Number((budgeted - spent).toFixed(2));
    let pct: number | null = null;
    let status: BudgetStatusLevel = "none";
    if (budgeted > 0) {
      pct = Number(((spent / budgeted) * 100).toFixed(1));
      status = pct >= 100 ? "over" : pct >= NEAR ? "near" : "ok";
    }
    return { categoryId: c.id, name: c.name, type: c.type, budgeted, spent, remaining, pct, status };
  });

  const budgeted = rows.filter((r) => r.budgeted > 0);
  const totals = {
    budgeted: Number(budgeted.reduce((s, r) => s + r.budgeted, 0).toFixed(2)),
    spent: Number(budgeted.reduce((s, r) => s + r.spent, 0).toFixed(2)),
    remaining: Number(budgeted.reduce((s, r) => s + r.remaining, 0).toFixed(2)),
  };

  return { rows, budgeted, totals };
}
