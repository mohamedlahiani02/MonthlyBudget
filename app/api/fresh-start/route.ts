import { freshStartSchema } from "@/lib/validations";
import { createFreshStart, deleteFreshStart, FreshStartError, listFreshStarts } from "@/lib/fresh-start";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    return ok(await listFreshStarts());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const input = freshStartSchema.parse(await req.json());
    return ok(await createFreshStart(input), 201);
  } catch (err) {
    if (err instanceof FreshStartError) return Response.json({ error: err.message }, { status: 400 });
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const month = new URL(req.url).searchParams.get("month");
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
    }
    await deleteFreshStart(month);
    return ok({ success: true });
  } catch (err) {
    if (err instanceof FreshStartError) return Response.json({ error: err.message }, { status: 404 });
    return handleError(err);
  }
}
