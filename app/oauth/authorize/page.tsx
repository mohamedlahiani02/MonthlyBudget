import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getMcpConfig, McpConfigError } from "@/lib/mcp/config";
import { AUTHORIZE_PARAM_NAMES, buildRedirect, validateAuthorizeRequest } from "@/lib/oauth/authorize";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") params.set(k, v);
  }
  return params;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h1 className="text-lg font-semibold">Authorization request rejected</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default async function AuthorizePage({ searchParams }: { searchParams: SearchParams }) {
  const params = toParams(await searchParams);

  const store = await cookies();
  if (!(await verifySessionToken(store.get(SESSION_COOKIE)?.value))) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${params.toString()}`)}`);
  }

  let config;
  try {
    config = getMcpConfig();
  } catch (err) {
    if (err instanceof McpConfigError) {
      logger.error({ event: "oauth.authorize", outcome: "config_error", reason: err.message });
      return <ErrorCard message="The server is not configured for OAuth." />;
    }
    throw err;
  }

  const result = validateAuthorizeRequest(params, config);
  if (!result.ok) {
    logger.warn({
      event: "oauth.authorize",
      outcome: "rejected",
      reason: result.description,
      redirectable: result.redirectable,
    });
    if (result.redirectable) {
      redirect(
        buildRedirect(result.redirectUri, {
          error: result.error,
          error_description: result.description,
          state: result.state,
        })
      );
    }
    return <ErrorCard message={result.description} />;
  }

  const { client, redirectUri } = result.request;
  const clientLabel = client.name ?? new URL(redirectUri).host;
  logger.info({ event: "oauth.authorize", outcome: "consent_shown", clientName: client.name, redirectUri });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">Connect {clientLabel}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {clientLabel} is requesting access to read your budget data and add expenses and income.
          </p>
          <p className="mt-2 break-all text-xs text-muted-foreground">Redirects to {redirectUri}</p>
        </div>
        <form method="post" action="/oauth/authorize/decision" className="flex gap-3">
          {AUTHORIZE_PARAM_NAMES.map((name) => {
            const value = params.get(name);
            return value === null ? null : <input key={name} type="hidden" name={name} value={value} />;
          })}
          <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
            Deny
          </Button>
          <Button type="submit" name="decision" value="approve" className="flex-1">
            Approve
          </Button>
        </form>
      </div>
    </div>
  );
}
