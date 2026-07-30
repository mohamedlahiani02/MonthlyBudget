"use client";

import * as React from "react";
import { ChevronDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Target } from "lucide-react";
import type { BudgetComparison, BudgetCategoryNode } from "@/types";

/** Budget-vs-actual variance table: category rows expand to subcategory envelopes. */
export function VarianceTable({ data }: { data: BudgetComparison }) {
  const budgeted = data.categories.filter((c) => c.budgeted > 0);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  if (budgeted.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Nothing budgeted this month"
        description="Set category or subcategory budgets to compare against actuals."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-b border-white/5 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3 font-medium">Category</th>
            <th className="p-3 text-right font-medium">Budgeted</th>
            <th className="p-3 text-right font-medium">Spent</th>
            <th className="p-3 text-right font-medium">Variance</th>
            <th className="p-3 text-right font-medium">Used</th>
          </tr>
        </thead>
        <tbody>
          {budgeted.map((cat) => (
            <CategoryRows
              key={cat.categoryId}
              cat={cat}
              open={!!open[cat.categoryId]}
              onToggle={() => setOpen((o) => ({ ...o, [cat.categoryId]: !o[cat.categoryId] }))}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10 font-semibold">
            <td className="p-3">Total</td>
            <td className="p-3 text-right">{formatCurrency(data.totals.budgeted)}</td>
            <td className="p-3 text-right">{formatCurrency(data.totals.spent)}</td>
            <td className={cn("p-3 text-right", data.totals.remaining < 0 ? "text-destructive" : "text-primary")}>
              {data.totals.remaining < 0 ? "−" : "+"}
              {formatCurrency(Math.abs(data.totals.remaining))}
            </td>
            <td className="p-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Variance({ value }: { value: number }) {
  const over = value < 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5", over ? "text-destructive" : "text-primary")}>
      {over ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
      {over ? "over " : "under "}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

function CategoryRows({
  cat,
  open,
  onToggle,
}: {
  cat: BudgetCategoryNode;
  open: boolean;
  onToggle: () => void;
}) {
  const hasSubs = cat.bySub && cat.subcategories.some((s) => s.budgeted > 0);
  return (
    <>
      <tr className="border-b border-white/5 hover:bg-secondary/20">
        <td className="p-3">
          <button
            type="button"
            onClick={hasSubs ? onToggle : undefined}
            className={cn("flex items-center gap-2", hasSubs && "cursor-pointer")}
          >
            {hasSubs ? (
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">{cat.name}</span>
            <Badge variant={cat.type === "Fixed" ? "accent" : "secondary"}>{cat.type}</Badge>
          </button>
        </td>
        <td className="p-3 text-right">{formatCurrency(cat.available)}</td>
        <td className="p-3 text-right">{formatCurrency(cat.spent)}</td>
        <td className="p-3 text-right">
          <Variance value={cat.remaining} />
        </td>
        <td className="p-3 text-right text-muted-foreground">{cat.pct?.toFixed(0) ?? "—"}%</td>
      </tr>
      {open &&
        hasSubs &&
        cat.subcategories
          .filter((s) => s.budgeted > 0)
          .map((s) => (
            <tr key={s.id} className="border-b border-white/5 bg-background/30 text-muted-foreground">
              <td className="py-2 pl-11 pr-3">{s.name}</td>
              <td className="p-2 text-right">{formatCurrency(s.available)}</td>
              <td className="p-2 text-right">{formatCurrency(s.spent)}</td>
              <td className="p-2 text-right">
                <Variance value={s.remaining} />
              </td>
              <td className="p-2 text-right">{s.pct?.toFixed(0) ?? "—"}%</td>
            </tr>
          ))}
    </>
  );
}
