import { logger } from "@/lib/logger";
import { getMcpConfig, McpConfigError, type McpConfig } from "@/lib/mcp/config";
import { resolveScope, resourceMatches } from "@/lib/oauth/authorize";
import { jsonResponse, oauthError, preflight, readParams } from "@/lib/oauth/http";
import {
  PKCE_VERIFIER_PATTERN,
  clientFingerprint,
  decode,
  encode,
  nowSeconds,
  verifyPkceS256,
} from "@/lib/oauth/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function issueTokens(cid: string, scope: string, config: McpConfig): Response {
  const iat = nowSeconds();
  const accessToken = encode({
    typ: "at",
    cid,
    aud: config.resource,
    scope,
    iat,
    exp: iat + config.accessTokenTtlSeconds,
  });
  const refreshToken = encode({
    typ: "rt",
    cid,
    aud: config.resource,
    scope,
    iat,
    exp: iat + config.refreshTokenTtlSeconds,
  });
  return jsonResponse({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: config.accessTokenTtlSeconds,
    refresh_token: refreshToken,
    scope,
  });
}

function reject(grantType: string | null, reason: string, error: string, description: string, status = 400): Response {
  logger.warn({ event: "oauth.token", grantType, outcome: "rejected", reason });
  return oauthError(error, description, status);
}

function handleAuthorizationCode(params: URLSearchParams, config: McpConfig): Response {
  const grant = "authorization_code";
  const code = params.get("code");
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const verifier = params.get("code_verifier");
  if (!code || !clientId || !redirectUri || !verifier) {
    return reject(grant, "missing_parameter", "invalid_request", "code, client_id, redirect_uri and code_verifier are required");
  }
  if (!decode(clientId, "client")) {
    return reject(grant, "unknown_client", "invalid_client", "Unknown client_id", 401);
  }
  const payload = decode(code, "code");
  if (!payload) return reject(grant, "invalid_or_expired_code", "invalid_grant", "Authorization code is invalid or expired");
  if (payload.cid !== clientFingerprint(clientId)) {
    return reject(grant, "client_mismatch", "invalid_grant", "Code was not issued to this client");
  }
  if (payload.redirectUri !== redirectUri) {
    return reject(grant, "redirect_uri_mismatch", "invalid_grant", "redirect_uri does not match");
  }
  if (!PKCE_VERIFIER_PATTERN.test(verifier) || !verifyPkceS256(verifier, payload.codeChallenge)) {
    return reject(grant, "pkce_failed", "invalid_grant", "PKCE verification failed");
  }
  if (!resourceMatches(params.get("resource"), config) || payload.resource !== config.resource) {
    return reject(grant, "resource_mismatch", "invalid_target", "resource does not identify this server");
  }
  logger.info({ event: "oauth.token", grantType: grant, outcome: "ok", clientId: payload.cid });
  return issueTokens(payload.cid, payload.scope, config);
}

function handleRefreshToken(params: URLSearchParams, config: McpConfig): Response {
  const grant = "refresh_token";
  const refreshToken = params.get("refresh_token");
  const clientId = params.get("client_id");
  if (!refreshToken || !clientId) {
    return reject(grant, "missing_parameter", "invalid_request", "refresh_token and client_id are required");
  }
  if (!decode(clientId, "client")) {
    return reject(grant, "unknown_client", "invalid_client", "Unknown client_id", 401);
  }
  const payload = decode(refreshToken, "rt");
  if (!payload) return reject(grant, "invalid_or_expired_refresh_token", "invalid_grant", "Refresh token is invalid or expired");
  if (payload.cid !== clientFingerprint(clientId)) {
    return reject(grant, "client_mismatch", "invalid_grant", "Refresh token was not issued to this client");
  }
  if (payload.aud !== config.resource || !resourceMatches(params.get("resource"), config)) {
    return reject(grant, "resource_mismatch", "invalid_target", "resource does not identify this server");
  }
  const requestedScope = params.get("scope");
  let scope = payload.scope;
  if (requestedScope) {
    const resolved = resolveScope(requestedScope, config);
    const granted = new Set(payload.scope.split(" "));
    if (!resolved || !resolved.split(" ").every((s) => granted.has(s))) {
      return reject(grant, "scope_escalation", "invalid_scope", "Requested scope exceeds the original grant");
    }
    scope = resolved;
  }
  logger.info({ event: "oauth.token", grantType: grant, outcome: "ok", clientId: payload.cid });
  return issueTokens(payload.cid, scope, config);
}

export async function POST(req: Request): Promise<Response> {
  try {
    const config = getMcpConfig();
    let params: URLSearchParams;
    try {
      params = await readParams(req);
    } catch {
      return reject(null, "unparseable_body", "invalid_request", "Request body could not be parsed");
    }
    const grantType = params.get("grant_type");
    if (grantType === "authorization_code") return handleAuthorizationCode(params, config);
    if (grantType === "refresh_token") return handleRefreshToken(params, config);
    return reject(grantType, "unsupported_grant_type", "unsupported_grant_type", "Unsupported grant_type");
  } catch (err) {
    if (err instanceof McpConfigError) {
      logger.error({ event: "oauth.token", outcome: "config_error", reason: err.message });
      return oauthError("server_error", "Server is not configured for OAuth", 503);
    }
    logger.error({ event: "oauth.token", outcome: "error", err });
    return oauthError("server_error", "Internal error", 500);
  }
}

export const OPTIONS = preflight;
