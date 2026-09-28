import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getMcpConfig } from "@/lib/mcp/config";

const VERSION = "v1";

export interface ClientPayload {
  typ: "client";
  redirectUris: string[];
  name: string | null;
  iat: number;
}

export interface AuthCodePayload {
  typ: "code";
  cid: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  exp: number;
}

export interface AccessTokenPayload {
  typ: "at";
  cid: string;
  aud: string;
  scope: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  typ: "rt";
  cid: string;
  aud: string;
  scope: string;
  iat: number;
  exp: number;
}

type Payload = ClientPayload | AuthCodePayload | AccessTokenPayload | RefreshTokenPayload;
type PayloadOf<T extends Payload["typ"]> = Extract<Payload, { typ: T }>;

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function sign(data: string): string {
  return createHmac("sha256", getMcpConfig().tokenSecret).update(data).digest("base64url");
}

/** Stable short identifier for a (potentially long) signed client_id. */
export function clientFingerprint(clientId: string): string {
  return createHash("sha256").update(clientId).digest("base64url");
}

export function encode(payload: Payload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const data = `${VERSION}.${body}`;
  return `${data}.${sign(data)}`;
}

/**
 * Verify signature, type and (when present) expiry. Returns null for any
 * malformed, forged, expired or wrong-type value.
 */
export function decode<T extends Payload["typ"]>(value: string, typ: T): PayloadOf<T> | null {
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const payload = parsed as Payload;
  if (payload.typ !== typ) return null;
  if ("exp" in payload && (typeof payload.exp !== "number" || payload.exp <= nowSeconds())) {
    return null;
  }
  return payload as PayloadOf<T>;
}

/** RFC 7636 S256: BASE64URL(SHA256(ASCII(code_verifier))) == code_challenge. */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const computed = Buffer.from(createHash("sha256").update(codeVerifier).digest("base64url"));
  const expected = Buffer.from(codeChallenge);
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

export const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
export const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9\-_]{43}$/;
