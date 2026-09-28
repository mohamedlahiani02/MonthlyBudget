import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { logger } from "@/lib/logger";
import { getMcpConfig, McpConfigError, type McpConfig } from "@/lib/mcp/config";
import { createBudgetMcpServer } from "@/lib/mcp/server";
import { verifyBearer } from "@/lib/oauth/bearer";
import { CORS_HEADERS, jsonResponse, preflight } from "@/lib/oauth/http";
import { protectedResourceMetadataUrl } from "@/lib/oauth/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function unauthorized(config: McpConfig, withError: boolean): Response {
  const challenge = [
    `Bearer resource_metadata="${protectedResourceMetadataUrl(config)}"`,
    withError ? `error="invalid_token"` : null,
    `scope="${config.scopes.join(" ")}"`,
  ]
    .filter(Boolean)
    .join(", ");
  return jsonResponse({ error: "unauthorized" }, 401, { "WWW-Authenticate": challenge });
}

async function handle(req: Request): Promise<Response> {
  let config: McpConfig;
  try {
    config = getMcpConfig();
  } catch (err) {
    if (err instanceof McpConfigError) {
      logger.error({ event: "mcp.config_error", reason: err.message });
      return jsonResponse({ error: "server_misconfigured" }, 503);
    }
    throw err;
  }

  const auth = verifyBearer(req.headers.get("authorization"), config);
  if (!auth.ok) {
    logger.warn({
      event: "mcp.auth",
      outcome: "rejected",
      reason: auth.reason,
      method: req.method,
      userAgent: req.headers.get("user-agent"),
    });
    return unauthorized(config, auth.reason !== "missing");
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed: stateless server" }, id: null },
      405,
      { Allow: "POST, OPTIONS" }
    );
  }

  logger.debug({ event: "mcp.auth", outcome: "accepted", clientId: auth.authInfo.clientId });

  const server = createBudgetMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    const res = await transport.handleRequest(req, { authInfo: auth.authInfo });
    return withCors(res);
  } catch (err) {
    logger.error({ event: "mcp.request_error", err });
    return jsonResponse(
      { jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null },
      500
    );
  } finally {
    await server.close().catch((err: unknown) => logger.warn({ event: "mcp.close_error", err }));
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
export const OPTIONS = preflight;
