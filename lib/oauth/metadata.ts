import "server-only";
import type { McpConfig } from "@/lib/mcp/config";

export function protectedResourceMetadataUrl(config: McpConfig): string {
  return `${config.issuer}/.well-known/oauth-protected-resource/api/mcp`;
}

/** RFC 9728 protected resource metadata. */
export function protectedResourceMetadata(config: McpConfig) {
  return {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: config.scopes,
    bearer_methods_supported: ["header"],
    resource_name: "Monthly Budget",
  };
}

/** RFC 8414 authorization server metadata. */
export function authorizationServerMetadata(config: McpConfig) {
  return {
    issuer: config.issuer,
    authorization_endpoint: `${config.issuer}/oauth/authorize`,
    token_endpoint: `${config.issuer}/oauth/token`,
    registration_endpoint: `${config.issuer}/oauth/register`,
    scopes_supported: config.scopes,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  };
}
