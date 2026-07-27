import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const categories = await prisma.category.findMany({
      where: type === "Fixed" || type === "Variable" ? { type } : undefined,
      orderBy: { position: "asc" },
      include: { subcategories: { orderBy: { position: "asc" } } },
    });
    return ok(categories);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = categorySchema.parse(await req.json());
    const count = await prisma.category.count();
    const category = await prisma.category.create({
      data: { ...data, position: count },
      include: { subcategories: true },
    });
    return ok(category, 201);
  } catch (err) {
    return handleError(err);
  }
}
