import { prisma } from "@/lib/prisma";
import { subcategorySchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const subs = await prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ categoryId: "asc" }, { position: "asc" }],
      include: { category: true },
    });
    return ok(subs);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = subcategorySchema.parse(await req.json());
    const count = await prisma.subcategory.count({ where: { categoryId: data.categoryId } });
    const sub = await prisma.subcategory.create({
      data: { ...data, position: count },
    });
    return ok(sub, 201);
  } catch (err) {
    return handleError(err);
  }
}
