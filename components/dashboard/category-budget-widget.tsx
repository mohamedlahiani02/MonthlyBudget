"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Target } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import type { CategoryBudgetRow } from "@/types";

const barColor = (status: string) =>
  status === "over" ? "bg-destructive" : status === "near" ? "bg-amber-500" : "bg-primary";

export function CategoryBudgetWidget({
  rows,
  totals,
}: {
  rows: CategoryBudgetRow[];
  totals: { budgeted: number; spent: number; remaining: number };
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No category budgets"
        description="Budget individual categories to track them here."
        action={
          <Link href="/budget" className="text-sm text-primary hover:underline">
            Set category budgets →
          </Link>
        }
      />
    );
  }

  const top = [...rows].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-secondary/30 p-3 text-sm">
        <span className="text-muted-foreground">Budgeted</span>
        <span className="font-semibold">
          {formatCurrency(totals.spent)} / {formatCurrency(totals.budgeted)}
        </span>
      </div>
      <div className="space-y-3">
        {top.map((r, i) => (
          <div key={r.categoryId}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                {r.name}
                {r.status === "over" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(r.spent)} / {formatCurrency(r.budgeted)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={cn("h-full rounded-full", barColor(r.status))}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, r.pct ?? 0)}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              />
            </div>
          </div>
        ))}
      </div>
      <Link href="/budget" className="block text-right text-xs text-primary hover:underline">
        Manage budgets →
      </Link>
    </div>
  );
}
