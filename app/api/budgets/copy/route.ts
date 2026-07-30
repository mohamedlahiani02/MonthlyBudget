import { copyBudgetSchema } from "@/lib/validations";
import { copyBudgets } from "@/lib/category-budget";
import { ok, handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const { fromMonth, fromYear, toMonth, toYear } = copyBudgetSchema.parse(await req.json());
    const result = await copyBudgets(fromYear, fromMonth, toYear, toMonth);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
