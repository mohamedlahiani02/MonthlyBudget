import { weeklyCapSchema } from "@/lib/validations";
import { getWeeklyStatus, setWeeklyCap } from "@/lib/weekly";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    return ok(await getWeeklyStatus(new Date()));
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const { cap } = weeklyCapSchema.parse(await req.json());
    await setWeeklyCap(cap);
    return ok(await getWeeklyStatus(new Date()));
  } catch (err) {
    return handleError(err);
  }
}
