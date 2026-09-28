import { logger } from "@/lib/logger";
import { getMcpConfig, McpConfigError } from "@/lib/mcp/config";
import { jsonResponse, preflight } from "@/lib/oauth/http";
import { authorizationServerMetadata } from "@/lib/oauth/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  try {
    return jsonResponse(authorizationServerMetadata(getMcpConfig()));
  } catch (err) {
    if (err instanceof McpConfigError) {
      logger.error({ event: "oauth.discovery", outcome: "config_error", reason: err.message });
      return jsonResponse({ error: "server_misconfigured" }, 503);
    }
    throw err;
  }
}

export const OPTIONS = preflight;
