"use client";

import Link from "next/link";
import { Landmark, Wallet, CircleDollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

interface AccountLite {
  id: string;
  label: string;
  type: string;
  bankName: string | null;
  balance: number;
  isActive: boolean;
}

export function AccountsWidget({
  accounts,
  netWorth,
}: {
  accounts: AccountLite[];
  netWorth: number;
}) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="No accounts"
        description="Create accounts to track balances."
        action={
          <Link href="/accounts" className="text-sm text-primary hover:underline">
            Go to Accounts →
          </Link>
        }
      />
    );
  }

  const icon = (t: string) =>
    t === "Banque" ? <Landmark className="h-4 w-4" /> : t === "Caisse" ? <Wallet className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-secondary/30 p-3">
        <span className="text-sm text-muted-foreground">Net worth</span>
        <span className="text-lg font-semibold">{formatCurrency(netWorth)}</span>
      </div>
      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              {icon(a.type)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {a.bankName ?? a.type}
                {!a.isActive && " · inactive"}
              </p>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(a.balance)}</span>
          </li>
        ))}
      </ul>
      <Link href="/accounts" className="block text-right text-xs text-primary hover:underline">
        Manage accounts →
      </Link>
    </div>
  );
}
