import "server-only";
import type { McpConfig } from "@/lib/mcp/config";
import {
  PKCE_CHALLENGE_PATTERN,
  clientFingerprint,
  decode,
  encode,
  nowSeconds,
  type ClientPayload,
} from "@/lib/oauth/tokens";

export interface AuthorizeRequest {
  clientId: string;
  client: ClientPayload;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  scope: string;
  resource: string;
}

/**
 * Errors where the redirect target cannot be trusted must be shown to the user
 * instead of redirecting (RFC 6749 section 4.1.2.1).
 */
export type AuthorizeValidation =
  | { ok: true; request: AuthorizeRequest }
  | { ok: false; redirectable: false; description: string }
  | { ok: false; redirectable: true; redirectUri: string; state: string | null; error: string; description: string };

const normalizeResource = (value: string): string => value.replace(/\/+$/, "");

/** Resolve a requested space-delimited scope against the supported set. */
export function resolveScope(requested: string | null, config: McpConfig): string | null {
  if (!requested || !requested.trim()) return config.scopes.join(" ");
  const parts = requested.trim().split(/\s+/);
  return parts.every((s) => config.scopes.includes(s)) ? parts.join(" ") : null;
}

export function resourceMatches(requested: string | null, config: McpConfig): boolean {
  return !requested || normalizeResource(requested) === normalizeResource(config.resource);
}

export function validateAuthorizeRequest(params: URLSearchParams, config: McpConfig): AuthorizeValidation {
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const state = params.get("state");

  if (!clientId) return { ok: false, redirectable: false, description: "client_id is required" };
  const client = decode(clientId, "client");
  if (!client) return { ok: false, redirectable: false, description: "Unknown client_id" };
  if (!redirectUri) return { ok: false, redirectable: false, description: "redirect_uri is required" };
  if (!client.redirectUris.includes(redirectUri) || !config.allowedRedirectUris.has(redirectUri)) {
    return { ok: false, redirectable: false, description: "redirect_uri is not registered for this client" };
  }

  const fail = (error: string, description: string): AuthorizeValidation => ({
    ok: false,
    redirectable: true,
    redirectUri,
    state,
    error,
    description,
  });

  if (params.get("response_type") !== "code") {
    return fail("unsupported_response_type", "Only response_type=code is supported");
  }
  const codeChallenge = params.get("code_challenge");
  if (!codeChallenge || !PKCE_CHALLENGE_PATTERN.test(codeChallenge)) {
    return fail("invalid_request", "A valid PKCE code_challenge is required");
  }
  if (params.get("code_challenge_method") !== "S256") {
    return fail("invalid_request", "code_challenge_method must be S256");
  }
  const scope = resolveScope(params.get("scope"), config);
  if (!scope) return fail("invalid_scope", "Requested scope is not supported");
  const resource = params.get("resource");
  if (!resourceMatches(resource, config)) {
    return fail("invalid_target", "resource does not identify this server");
  }

  return {
    ok: true,
    request: { clientId, client, redirectUri, codeChallenge, state, scope, resource: config.resource },
  };
}

export function buildRedirect(
  redirectUri: string,
  params: Record<string, string | null>
): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null) url.searchParams.set(k, v);
  }
  return url.toString();
}

export function issueAuthorizationCode(request: AuthorizeRequest, config: McpConfig): string {
  return encode({
    typ: "code",
    cid: clientFingerprint(request.clientId),
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    resource: request.resource,
    scope: request.scope,
    exp: nowSeconds() + config.authCodeTtlSeconds,
  });
}

export const AUTHORIZE_PARAM_NAMES = [
  "response_type",
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
  "resource",
] as const;
