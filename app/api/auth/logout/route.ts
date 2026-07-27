import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function POST() {
  try {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
