import { prisma } from "@/lib/prisma";
import { transferSchema } from "@/lib/validations";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const transfers = await prisma.transfer.findMany({
      where: accountId
        ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] }
        : undefined,
      orderBy: { date: "desc" },
      include: { fromAccount: true, toAccount: true },
    });
    return ok(transfers);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = transferSchema.parse(await req.json());
    const transfer = await prisma.transfer.create({
      data,
      include: { fromAccount: true, toAccount: true },
    });
    return ok(transfer, 201);
  } catch (err) {
    return handleError(err);
  }
}
