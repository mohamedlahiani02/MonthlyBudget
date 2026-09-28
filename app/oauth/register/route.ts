import { z } from "zod";
import { logger } from "@/lib/logger";
import { getMcpConfig, McpConfigError } from "@/lib/mcp/config";
import { jsonResponse, oauthError, preflight } from "@/lib/oauth/http";
import { encode, nowSeconds } from "@/lib/oauth/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registrationSchema = z.object({
  redirect_uris: z.array(z.string().url()).min(1).max(10),
  client_name: z.string().max(200).optional(),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});

/** RFC 7591 dynamic client registration. Clients are stateless signed descriptors. */
export async function POST(req: Request): Promise<Response> {
  try {
    const config = getMcpConfig();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logger.warn({ event: "oauth.register", outcome: "rejected", reason: "invalid_json" });
      return oauthError("invalid_client_metadata", "Request body must be JSON");
    }
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn({ event: "oauth.register", outcome: "rejected", reason: "invalid_metadata", issues: parsed.error.flatten().fieldErrors });
      return oauthError("invalid_client_metadata", "Invalid client metadata");
    }
    const disallowed = parsed.data.redirect_uris.filter((u) => !config.allowedRedirectUris.has(u));
    if (disallowed.length > 0) {
      logger.warn({ event: "oauth.register", outcome: "rejected", reason: "redirect_uri_not_allowed", redirectUris: disallowed });
      return oauthError("invalid_redirect_uri", "One or more redirect_uris are not allowed");
    }

    const issuedAt = nowSeconds();
    const clientName = parsed.data.client_name ?? null;
    const clientId = encode({
      typ: "client",
      redirectUris: parsed.data.redirect_uris,
      name: clientName,
      iat: issuedAt,
    });
    logger.info({
      event: "oauth.register",
      outcome: "ok",
      clientName,
      redirectUris: parsed.data.redirect_uris,
      requestedAuthMethod: parsed.data.token_endpoint_auth_method ?? null,
    });
    return jsonResponse(
      {
        client_id: clientId,
        client_id_issued_at: issuedAt,
        client_name: clientName ?? undefined,
        redirect_uris: parsed.data.redirect_uris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      201
    );
  } catch (err) {
    if (err instanceof McpConfigError) {
      logger.error({ event: "oauth.register", outcome: "config_error", reason: err.message });
      return oauthError("server_error", "Server is not configured for OAuth", 503);
    }
    logger.error({ event: "oauth.register", outcome: "error", err });
    return oauthError("server_error", "Internal error", 500);
  }
}

export const OPTIONS = preflight;
