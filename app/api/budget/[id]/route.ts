import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = budgetSchema.partial().parse(await req.json());
    const budget = await prisma.budget.update({ where: { id }, data });
    return ok(budget);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.budget.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
