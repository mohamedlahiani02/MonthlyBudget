import { prisma } from "@/lib/prisma";
import { subcategoryBudgetSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

// Upsert a subcategory-level budget (envelope). Amount 0 removes it.
export async function POST(req: Request) {
  try {
    const { subcategoryId, month, year, amount, rollover } = subcategoryBudgetSchema.parse(
      await req.json()
    );

    if (amount <= 0) {
      await prisma.subcategoryBudget.deleteMany({ where: { subcategoryId, month, year } });
      return ok({ success: true, removed: true });
    }

    const row = await prisma.subcategoryBudget.upsert({
      where: { subcategoryId_month_year: { subcategoryId, month, year } },
      update: { amount, ...(rollover !== undefined && { rollover }) },
      create: { subcategoryId, month, year, amount, rollover: rollover ?? false },
    });
    return ok(row);
  } catch (err) {
    return handleError(err);
  }
}
