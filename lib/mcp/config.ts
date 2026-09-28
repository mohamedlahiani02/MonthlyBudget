import "server-only";
import { z } from "zod";

const DEFAULT_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
];

const envSchema = z.object({
  MCP_PUBLIC_BASE_URL: z
    .string()
    .url()
    .transform((v) => v.replace(/\/+$/, "")),
  MCP_TOKEN_SECRET: z.string().min(32, "MCP_TOKEN_SECRET must be at least 32 characters"),
  MCP_ALLOWED_REDIRECT_URIS: z.string().optional(),
});

export interface McpConfig {
  issuer: string;
  resource: string;
  tokenSecret: string;
  allowedRedirectUris: ReadonlySet<string>;
  scopes: readonly string[];
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  authCodeTtlSeconds: number;
}

export class McpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpConfigError";
  }
}

let cached: McpConfig | null = null;

/** Validated MCP/OAuth configuration. Throws McpConfigError when env is incomplete. */
export function getMcpConfig(): McpConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new McpConfigError(`Invalid MCP configuration: ${fields}`);
  }
  const env = parsed.data;
  const redirectUris = env.MCP_ALLOWED_REDIRECT_URIS
    ? env.MCP_ALLOWED_REDIRECT_URIS.split(",").map((u) => u.trim()).filter(Boolean)
    : DEFAULT_REDIRECT_URIS;

  cached = {
    issuer: env.MCP_PUBLIC_BASE_URL,
    resource: `${env.MCP_PUBLIC_BASE_URL}/api/mcp`,
    tokenSecret: env.MCP_TOKEN_SECRET,
    allowedRedirectUris: new Set(redirectUris),
    scopes: ["budget"],
    accessTokenTtlSeconds: 60 * 60,
    refreshTokenTtlSeconds: 60 * 60 * 24 * 30,
    authCodeTtlSeconds: 60,
  };
  return cached;
}
