import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    if (year && month) {
      const budget = await prisma.budget.findUnique({
        where: { month_year: { month: parseInt(month, 10), year: parseInt(year, 10) } },
      });
      return ok(budget);
    }
    const budgets = await prisma.budget.findMany({
      where: year ? { year: parseInt(year, 10) } : undefined,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return ok(budgets);
  } catch (err) {
    return handleError(err);
  }
}

// Upsert: one budget per month/year.
export async function POST(req: Request) {
  try {
    const data = budgetSchema.parse(await req.json());
    const budget = await prisma.budget.upsert({
      where: { month_year: { month: data.month, year: data.year } },
      update: { monthlyBudget: data.monthlyBudget, savingGoal: data.savingGoal },
      create: data,
    });
    return ok(budget);
  } catch (err) {
    return handleError(err);
  }
}
