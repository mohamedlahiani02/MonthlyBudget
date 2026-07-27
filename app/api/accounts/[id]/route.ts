import { prisma } from "@/lib/prisma";
import { accountSchema } from "@/lib/validations";
import { makeSoleDefault } from "@/lib/accounts";
import { ok, handleError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

    const [expenses, incomes, transfersOut, transfersIn] = await Promise.all([
      prisma.expense.findMany({
        where: { accountId: id },
        orderBy: { date: "desc" },
        take: 50,
        include: { subcategory: { include: { category: true } } },
      }),
      prisma.income.findMany({ where: { accountId: id }, orderBy: { date: "desc" }, take: 50 }),
      prisma.transfer.findMany({
        where: { fromAccountId: id },
        orderBy: { date: "desc" },
        include: { toAccount: true },
      }),
      prisma.transfer.findMany({
        where: { toAccountId: id },
        orderBy: { date: "desc" },
        include: { fromAccount: true },
      }),
    ]);

    return ok({ account, expenses, incomes, transfersOut, transfersIn });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = accountSchema.partial().parse(await req.json());

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.bankName !== undefined && {
          bankName: data.type === "Caisse" || data.type === "Autre" ? null : data.bankName,
        }),
        ...(data.openingBalance !== undefined && { openingBalance: data.openingBalance }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });

    if (data.isDefault) await makeSoleDefault(id);
    return ok(account);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Guard: block deletion when the account is referenced anywhere.
    const [exp, inc, rec, tFrom, tTo] = await Promise.all([
      prisma.expense.count({ where: { accountId: id } }),
      prisma.income.count({ where: { accountId: id } }),
      prisma.recurringExpense.count({ where: { accountId: id } }),
      prisma.transfer.count({ where: { fromAccountId: id } }),
      prisma.transfer.count({ where: { toAccountId: id } }),
    ]);
    const used = exp + inc + rec + tFrom + tTo;
    if (used > 0) {
      return Response.json(
        {
          error:
            "This account has transactions and cannot be deleted. Deactivate it instead to keep the history.",
          used,
        },
        { status: 409 }
      );
    }

    const account = await prisma.account.findUnique({ where: { id } });
    await prisma.account.delete({ where: { id } });

    // If we removed the default, promote another account.
    if (account?.isDefault) {
      const next = await prisma.account.findFirst({ orderBy: { position: "asc" } });
      if (next) await prisma.account.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
