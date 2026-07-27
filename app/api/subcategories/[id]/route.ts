import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, handleError } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  categoryId: z.string().min(1).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = updateSchema.parse(await req.json());
    const sub = await prisma.subcategory.update({ where: { id }, data });
    return ok(sub);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.subcategory.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
