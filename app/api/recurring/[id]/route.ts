import { prisma } from "@/lib/prisma";
import { recurringExpenseSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = recurringExpenseSchema.partial().parse(await req.json());
    const item = await prisma.recurringExpense.update({
      where: { id },
      data,
      include: { subcategory: { include: { category: true } }, account: true },
    });
    return ok(item);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.recurringExpense.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
