import { changePasswordSchema } from "@/lib/validations";
import { verifyPassword, setPassword } from "@/lib/password";
import { ok, handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(await req.json());
    const valid = await verifyPassword(currentPassword);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    await setPassword(newPassword);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
