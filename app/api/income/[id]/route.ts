import { prisma } from "@/lib/prisma";
import { incomeSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = incomeSchema.parse(await req.json());
    const income = await prisma.income.update({ where: { id }, data });
    return ok(income);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.income.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
