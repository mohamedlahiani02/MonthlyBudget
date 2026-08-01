import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { carryoverSchema } from "@/lib/validations";
import { getCarryoverStatus, carryForward, undoCarryForward } from "@/lib/carryover";
import { ok, handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);
    return ok(await getCarryoverStatus(year, month));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { month, year, action } = carryoverSchema.parse(await req.json());
    const status =
      action === "carry" ? await carryForward(year, month) : await undoCarryForward(year, month);
    return ok(status);
  } catch (err) {
    // Domain rule violations (e.g. already carried, saving goal ≠ 0) → 400.
    if (
      err instanceof Error &&
      !(err instanceof ZodError) &&
      !(err instanceof Prisma.PrismaClientKnownRequestError)
    ) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return handleError(err);
  }
}
