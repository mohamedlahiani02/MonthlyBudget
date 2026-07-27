import { prisma } from "@/lib/prisma";
import { accountSchema } from "@/lib/validations";
import { getAccountsWithBalances, makeSoleDefault } from "@/lib/accounts";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const accounts = await getAccountsWithBalances();
    return ok(accounts);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const data = accountSchema.parse(await req.json());
    const count = await prisma.account.count();
    const isFirst = count === 0;

    const account = await prisma.account.create({
      data: {
        label: data.label,
        type: data.type,
        bankName: data.type === "Banque" ? data.bankName ?? null : null,
        openingBalance: data.openingBalance,
        isActive: data.isActive,
        isDefault: isFirst || data.isDefault,
        position: count,
      },
    });

    if (account.isDefault) await makeSoleDefault(account.id);
    return ok(account, 201);
  } catch (err) {
    return handleError(err);
  }
}
