import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = categorySchema.partial().parse(await req.json());
    const category = await prisma.category.update({
      where: { id },
      data,
      include: { subcategories: { orderBy: { position: "asc" } } },
    });
    return ok(category);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.category.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
