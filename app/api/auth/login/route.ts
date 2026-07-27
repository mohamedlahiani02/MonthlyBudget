import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validations";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = loginSchema.parse(body);

    const valid = await verifyPassword(password);
    if (!valid) {
      return Response.json({ error: "Incorrect password" }, { status: 401 });
    }

    const token = await createSessionToken();
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
