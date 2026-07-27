"use client";

import * as React from "react";
import { api } from "@/lib/client-api";
import type { AccountWithBalanceDTO } from "@/types";

export function useAccounts() {
  const [accounts, setAccounts] = React.useState<AccountWithBalanceDTO[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await api.get<AccountWithBalanceDTO[]>("/api/accounts"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];

  return { accounts, loading, refresh, defaultAccount };
}
