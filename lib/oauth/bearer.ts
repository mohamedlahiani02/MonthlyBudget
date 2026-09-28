import "server-only";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpConfig } from "@/lib/mcp/config";
import { decode } from "@/lib/oauth/tokens";

export type BearerResult =
  | { ok: true; authInfo: AuthInfo }
  | { ok: false; reason: "missing" | "malformed" | "invalid_or_expired" | "wrong_audience" };

export function verifyBearer(authorization: string | null, config: McpConfig): BearerResult {
  if (!authorization) return { ok: false, reason: "missing" };
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  if (!match) return { ok: false, reason: "malformed" };
  const token = match[1];
  const payload = decode(token, "at");
  if (!payload) return { ok: false, reason: "invalid_or_expired" };
  if (payload.aud !== config.resource) return { ok: false, reason: "wrong_audience" };
  return {
    ok: true,
    authInfo: {
      token,
      clientId: payload.cid,
      scopes: payload.scope.split(" "),
      expiresAt: payload.exp,
      resource: new URL(payload.aud),
    },
  };
}
