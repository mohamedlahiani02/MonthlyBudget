"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Target, AlertTriangle } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency, monthName, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryBudgetComparison, CategoryBudgetRow } from "@/types";

const barColor = (status: string) =>
  status === "over" ? "bg-destructive" : status === "near" ? "bg-amber-500" : "bg-primary";

export function CategoryBudgetsSection({ month, year }: { month: number; year: number }) {
  const { toast } = useToast();
  const [data, setData] = React.useState<CategoryBudgetComparison | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<CategoryBudgetComparison>(
        `/api/category-budgets?month=${month}&year=${year}`
      );
      setData(d);
      setDrafts(Object.fromEntries(d.rows.map((r) => [r.categoryId, r.budgeted ? String(r.budgeted) : ""])));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function saveRow(row: CategoryBudgetRow) {
    const raw = drafts[row.categoryId] ?? "";
    const amount = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(amount) || amount === row.budgeted) return;
    setSavingId(row.categoryId);
    try {
      await api.post("/api/category-budgets", { categoryId: row.categoryId, month, year, amount });
      await load();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle>Category budgets</CardTitle>
        </div>
        <CardDescription>
          Optional — set a budget per category for {monthName(month)} {year} and compare with actual spend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            {data.totals.budgeted > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-secondary/30 p-3 text-sm">
                <span className="text-muted-foreground">Total budgeted</span>
                <span className="font-semibold">
                  {formatCurrency(data.totals.spent)} / {formatCurrency(data.totals.budgeted)}
                  <span
                    className={cn(
                      "ml-1",
                      data.totals.remaining < 0 ? "text-destructive" : "text-primary"
                    )}
                  >
                    ({data.totals.remaining < 0 ? "over " : ""}
                    {formatCurrency(Math.abs(data.totals.remaining))})
                  </span>
                </span>
              </div>
            )}

            <div className="space-y-3">
              {data.rows.map((row, i) => {
                const budgeted = row.budgeted > 0;
                return (
                  <div key={row.categoryId} className="rounded-xl border border-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium">{row.name}</span>
                        <Badge variant={row.type === "Fixed" ? "accent" : "secondary"}>{row.type}</Badge>
                        {row.status === "over" && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                      <span className="whitespace-nowrap text-sm text-muted-foreground">
                        spent {formatCurrency(row.spent)}
                      </span>
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Budget"
                          className="h-8"
                          value={drafts[row.categoryId] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [row.categoryId]: e.target.value }))
                          }
                          onBlur={() => saveRow(row)}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          disabled={savingId === row.categoryId}
                        />
                      </div>
                    </div>
                    {budgeted && (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <motion.div
                          className={cn("h-full rounded-full", barColor(row.status))}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, row.pct ?? 0)}%` }}
                          transition={{ duration: 0.5, delay: i * 0.03 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
