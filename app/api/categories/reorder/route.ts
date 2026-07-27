import { prisma } from "@/lib/prisma";
import { reorderSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function PUT(req: Request) {
  try {
    const { ids } = reorderSchema.parse(await req.json());
    await prisma.$transaction(
      ids.map((id, position) =>
        prisma.category.update({ where: { id }, data: { position } })
      )
    );
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
