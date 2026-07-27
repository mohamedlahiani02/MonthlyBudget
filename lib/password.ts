import "server-only";
import { prisma } from "@/lib/prisma";

const PASSWORD_KEY = "app_password";

/** The active password: DB override (if set via Settings) else APP_PASSWORD env. */
export async function getActivePassword(): Promise<string> {
  const override = await prisma.setting.findUnique({ where: { key: PASSWORD_KEY } });
  if (override?.value) return override.value;
  return process.env.APP_PASSWORD ?? "";
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  const active = await getActivePassword();
  if (!active) return false;
  if (candidate.length !== active.length) return false;
  let diff = 0;
  for (let i = 0; i < active.length; i++) diff |= candidate.charCodeAt(i) ^ active.charCodeAt(i);
  return diff === 0;
}

export async function setPassword(newPassword: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: PASSWORD_KEY },
    update: { value: newPassword },
    create: { key: PASSWORD_KEY, value: newPassword },
  });
}
