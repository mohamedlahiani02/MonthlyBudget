"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import type { RecentTx } from "@/lib/finance";

interface RecentTransactionsProps {
  expenses: RecentTx[];
  income: RecentTx[];
}

export function RecentTransactions({ expenses, income }: RecentTransactionsProps) {
  const items = [
    ...expenses.map((e) => ({ ...e, type: "expense" as const })),
    ...income.map((i) => ({ ...i, type: "income" as const })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  if (items.length === 0) {
    return <EmptyState title="No transactions yet" description="Add your first expense or income to see it here." />;
  }

  return (
    <ul className="divide-y divide-white/5">
      {items.map((item) => {
        const isIncome = item.type === "income";
        return (
          <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isIncome ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              }`}
            >
              {isIncome ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.description}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.meta ?? "Income"} · {formatDate(item.date)}
              </p>
            </div>
            <span
              className={`text-sm font-semibold ${
                isIncome ? "text-primary" : "text-foreground"
              }`}
            >
              {isIncome ? "+" : "−"}
              {formatCurrency(item.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
