import { prisma } from "@/lib/prisma";
import { categoryBudgetSchema } from "@/lib/validations";
import { getCategoryBudgetComparison } from "@/lib/category-budget";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);
    return ok(await getCategoryBudgetComparison(year, month));
  } catch (err) {
    return handleError(err);
  }
}

// Upsert a category budget. Amount 0 removes it.
export async function POST(req: Request) {
  try {
    const { categoryId, month, year, amount } = categoryBudgetSchema.parse(await req.json());

    if (amount <= 0) {
      await prisma.categoryBudget.deleteMany({ where: { categoryId, month, year } });
      return ok({ success: true, removed: true });
    }

    const row = await prisma.categoryBudget.upsert({
      where: { categoryId_month_year: { categoryId, month, year } },
      update: { amount },
      create: { categoryId, month, year, amount },
    });
    return ok(row);
  } catch (err) {
    return handleError(err);
  }
}
