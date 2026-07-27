import { prisma } from "@/lib/prisma";
import { recurringExpenseSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const items = await prisma.recurringExpense.findMany({
      orderBy: { createdAt: "desc" },
      include: { subcategory: { include: { category: true } }, account: true },
    });
    return ok(items);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = recurringExpenseSchema.parse(await req.json());
    const item = await prisma.recurringExpense.create({
      data,
      include: { subcategory: { include: { category: true } }, account: true },
    });
    return ok(item, 201);
  } catch (err) {
    return handleError(err);
  }
}
