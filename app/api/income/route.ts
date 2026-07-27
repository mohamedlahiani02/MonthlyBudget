import { prisma } from "@/lib/prisma";
import { incomeSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const where: { date?: { gte: Date; lt: Date } } = {};
    if (year) {
      const y = parseInt(year, 10);
      if (month) {
        const m = parseInt(month, 10);
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }
    const income = await prisma.income.findMany({ where, orderBy: { date: "desc" } });
    return ok(income);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = incomeSchema.parse(await req.json());
    const income = await prisma.income.create({ data });
    return ok(income, 201);
  } catch (err) {
    return handleError(err);
  }
}
