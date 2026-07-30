"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Target,
  AlertTriangle,
  ChevronDown,
  Copy,
  Repeat,
  Loader2,
  ListTree,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency, monthName, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BudgetComparison, BudgetCategoryNode, EnvelopeNode } from "@/types";

const barColor = (status: string) =>
  status === "over" ? "bg-destructive" : status === "near" ? "bg-amber-500" : "bg-primary";

export function CategoryBudgetsSection({ month, year }: { month: number; year: number }) {
  const { toast } = useToast();
  const [data, setData] = React.useState<BudgetComparison | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [copying, setCopying] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await api.get<BudgetComparison>(`/api/category-budgets?month=${month}&year=${year}`)
      );
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function copyLastMonth() {
    const prev = new Date(year, month - 2, 1);
    setCopying(true);
    try {
      const res = await api.post<{ categories: number; subcategories: number }>(
        "/api/budgets/copy",
        { fromMonth: prev.getMonth() + 1, fromYear: prev.getFullYear(), toMonth: month, toYear: year }
      );
      toast({
        title: "Budgets copied",
        description: `${res.categories + res.subcategories} envelopes from ${monthName(prev.getMonth() + 1)}.`,
        variant: "success",
      });
      load();
    } catch (err) {
      toast({ title: "Copy failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle>Category budgets</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={copyLastMonth} disabled={copying}>
            {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Copy last month
          </Button>
        </div>
        <CardDescription>
          Budget a category globally, or expand it to budget each subcategory. Toggle rollover to carry
          unspent balance to next month. {monthName(month)} {year}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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

            <div className="space-y-2.5">
              {data.categories.map((cat) => (
                <CategoryRow
                  key={cat.categoryId}
                  cat={cat}
                  month={month}
                  year={year}
                  expanded={!!open[cat.categoryId] || cat.bySub}
                  onToggle={() =>
                    setOpen((o) => ({ ...o, [cat.categoryId]: !(o[cat.categoryId] || cat.bySub) }))
                  }
                  onChanged={load}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  cat,
  month,
  year,
  expanded,
  onToggle,
  onChanged,
}: {
  cat: BudgetCategoryNode;
  month: number;
  year: number;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = React.useState(cat.categoryBudget ? String(cat.categoryBudget) : "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDraft(cat.categoryBudget ? String(cat.categoryBudget) : "");
  }, [cat.categoryBudget]);

  async function saveCategory(amount: number, rollover?: boolean) {
    setSaving(true);
    try {
      await api.post("/api/category-budgets", {
        categoryId: cat.categoryId,
        month,
        year,
        amount,
        ...(rollover !== undefined && { rollover }),
      });
      onChanged();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const budgeted = cat.budgeted > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-secondary/20">
      {/* Header — always visible, tappable to expand */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
        <span className="truncate font-medium">{cat.name}</span>
        <Badge variant={cat.type === "Fixed" ? "accent" : "secondary"} className="shrink-0">
          {cat.type}
        </Badge>
        {cat.status === "over" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
        <span className="ml-auto shrink-0 text-sm text-muted-foreground">
          {budgeted ? (
            <>
              {formatCurrency(cat.spent)}
              <span className="text-muted-foreground/60"> / {formatCurrency(cat.available)}</span>
            </>
          ) : (
            <span className="text-muted-foreground/60">not budgeted</span>
          )}
        </span>
      </button>

      {budgeted && (
        <div className="px-3 pb-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className={cn("h-full rounded-full", barColor(cat.status))}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, cat.pct ?? 0)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-white/5 p-3">
          {/* Category-global budget (only when not budgeting by subcategory) */}
          {!cat.bySub && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Category budget (global)
                </label>
                <RolloverToggle
                  on={cat.rollover}
                  disabled={!budgeted}
                  onToggle={() => saveCategory(cat.categoryBudget, !cat.rollover)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="Amount (DT)"
                  className="h-9 flex-1"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    const amt = draft === "" ? 0 : Number(draft);
                    if (amt !== cat.categoryBudget) saveCategory(amt);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  disabled={saving}
                />
                {cat.rollover && cat.carryover !== 0 && (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    +{formatCurrency(cat.carryover)} rolled over
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Or budget each subcategory below for finer control.
              </p>
            </div>
          )}

          {/* Subcategory envelopes */}
          <div className="space-y-2">
            {cat.subcategories.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ListTree className="h-3.5 w-3.5" /> Subcategory envelopes
                </div>
                {cat.subcategories.map((sub) => (
                  <SubRow key={sub.id} sub={sub} month={month} year={year} onChanged={onChanged} />
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No subcategories in this category.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubRow({
  sub,
  month,
  year,
  onChanged,
}: {
  sub: EnvelopeNode;
  month: number;
  year: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = React.useState(sub.budgeted ? String(sub.budgeted) : "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDraft(sub.budgeted ? String(sub.budgeted) : "");
  }, [sub.budgeted]);

  async function save(amount: number, rollover?: boolean) {
    setSaving(true);
    try {
      await api.post("/api/subcategory-budgets", {
        subcategoryId: sub.id,
        month,
        year,
        amount,
        ...(rollover !== undefined && { rollover }),
      });
      onChanged();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const budgeted = sub.budgeted > 0;

  return (
    <div className="rounded-lg bg-background/40 p-2.5">
      {/* Mobile-first: label row, then controls row — never overflows */}
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm">{sub.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {budgeted ? (
            <>
              {formatCurrency(sub.spent)} / {formatCurrency(sub.available)}
            </>
          ) : (
            <>spent {formatCurrency(sub.spent)}</>
          )}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="Budget (DT)"
          className="h-8 flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const amt = draft === "" ? 0 : Number(draft);
            if (amt !== sub.budgeted) save(amt);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          disabled={saving}
        />
        <RolloverToggle
          on={sub.rollover}
          disabled={!budgeted}
          onToggle={() => save(sub.budgeted, !sub.rollover)}
        />
      </div>
      {budgeted && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className={cn("h-full rounded-full", barColor(sub.status))}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, sub.pct ?? 0)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {sub.rollover && sub.carryover !== 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {sub.carryover > 0 ? "+" : ""}
              {formatCurrency(sub.carryover)} rolled over
            </p>
          )}
        </>
      )}
    </div>
  );
}

function RolloverToggle({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title="Roll unspent balance to next month"
      className={cn(
        "flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs transition-colors",
        disabled && "cursor-not-allowed opacity-40",
        on
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-white/10 bg-secondary/40 text-muted-foreground"
      )}
    >
      <Repeat className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Rollover</span>
    </button>
  );
}
