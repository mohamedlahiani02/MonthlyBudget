import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = expenseSchema.parse(await req.json());
    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: { subcategory: { include: { category: true } } },
    });
    return ok(expense);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
