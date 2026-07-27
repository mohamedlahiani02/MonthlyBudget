import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId");
    const subcategoryId = searchParams.get("subcategoryId");
    const paymentMethod = searchParams.get("paymentMethod");
    const accountId = searchParams.get("accountId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const take = searchParams.get("take");

    const where: Prisma.ExpenseWhereInput = {};

    if (q) where.description = { contains: q, mode: "insensitive" };
    if (subcategoryId) where.subcategoryId = subcategoryId;
    else if (categoryId) where.subcategory = { categoryId };
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (accountId) where.accountId = accountId;

    if (year) {
      const y = parseInt(year, 10);
      if (month) {
        const m = parseInt(month, 10);
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: take ? parseInt(take, 10) : undefined,
      include: { subcategory: { include: { category: true } }, account: true },
    });
    return ok(expenses);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = expenseSchema.parse(await req.json());
    const expense = await prisma.expense.create({
      data,
      include: { subcategory: { include: { category: true } }, account: true },
    });
    return ok(expense, 201);
  } catch (err) {
    return handleError(err);
  }
}
