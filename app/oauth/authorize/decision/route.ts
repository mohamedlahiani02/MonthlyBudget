import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getMcpConfig, McpConfigError } from "@/lib/mcp/config";
import { buildRedirect, issueAuthorizationCode, validateAuthorizeRequest } from "@/lib/oauth/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plainError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let config;
  try {
    config = getMcpConfig();
  } catch (err) {
    if (err instanceof McpConfigError) {
      logger.error({ event: "oauth.authorize", outcome: "config_error", reason: err.message });
      return plainError("Server is not configured for OAuth", 503);
    }
    throw err;
  }

  const origin = req.headers.get("origin");
  const allowedOrigins = new Set([new URL(config.issuer).origin, new URL(req.url).origin]);
  if (!origin || !allowedOrigins.has(origin)) {
    logger.warn({ event: "oauth.authorize", outcome: "rejected", reason: "origin_mismatch", origin });
    return plainError("Cross-origin authorization decisions are not allowed", 403);
  }

  const store = await cookies();
  if (!(await verifySessionToken(store.get(SESSION_COOKIE)?.value))) {
    logger.warn({ event: "oauth.authorize", outcome: "rejected", reason: "no_session" });
    return plainError("Not signed in", 401);
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(await req.text());
  } catch {
    return plainError("Malformed request", 400);
  }

  const result = validateAuthorizeRequest(params, config);
  if (!result.ok) {
    logger.warn({ event: "oauth.authorize", outcome: "rejected", reason: result.description });
    if (!result.redirectable) return plainError(result.description, 400);
    return NextResponse.redirect(
      buildRedirect(result.redirectUri, {
        error: result.error,
        error_description: result.description,
        state: result.state,
      }),
      303
    );
  }

  const { request } = result;
  if (params.get("decision") !== "approve") {
    logger.info({ event: "oauth.authorize", outcome: "denied", clientName: request.client.name });
    return NextResponse.redirect(
      buildRedirect(request.redirectUri, { error: "access_denied", state: request.state }),
      303
    );
  }

  const code = issueAuthorizationCode(request, config);
  logger.info({ event: "oauth.authorize", outcome: "approved", clientName: request.client.name, redirectUri: request.redirectUri });
  return NextResponse.redirect(
    buildRedirect(request.redirectUri, { code, state: request.state, iss: config.issuer }),
    303
  );
}
