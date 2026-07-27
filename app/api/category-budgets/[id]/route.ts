import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.categoryBudget.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
