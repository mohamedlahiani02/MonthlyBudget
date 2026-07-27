import "server-only";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";

/**
 * Lazily generate expenses from active RecurringExpense definitions for a given
 * month. Idempotent: an expense is only created if one with the same
 * description + subcategory does not already exist within that month.
 */
export async function generateRecurringForMonth(year: number, month: number): Promise<number> {
  const recurring = await prisma.recurringExpense.findMany({
    where: { active: true },
    include: { subcategory: true },
  });
  if (recurring.length === 0) return 0;

  const { start, end } = monthRange(year, month);
  let created = 0;

  for (const r of recurring) {
    const day = Math.min(Math.max(1, r.dayOfMonth), 28);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    const description =
      r.description && r.description.trim().length > 0
        ? r.description
        : `${r.subcategory.name} (recurring)`;

    const existing = await prisma.expense.findFirst({
      where: {
        subcategoryId: r.subcategoryId,
        description,
        date: { gte: start, lt: end },
      },
    });
    if (existing) continue;

    await prisma.expense.create({
      data: {
        amount: r.amount,
        description,
        date,
        paymentMethod: "Recurring",
        subcategoryId: r.subcategoryId,
      },
    });
    created++;
  }

  return created;
}
