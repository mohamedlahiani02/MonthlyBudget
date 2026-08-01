"use client";

import * as React from "react";
import { ArrowRightLeft, Loader2, ArrowDownLeft, Info } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CarryoverStatus } from "@/types";

export function CarryoverSection({
  month,
  year,
  onChanged,
}: {
  month: number;
  year: number;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<CarryoverStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await api.get<CarryoverStatus>(`/api/carryover?month=${month}&year=${year}`));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function act(action: "carry" | "undo") {
    setSaving(true);
    try {
      const s = await api.post<CarryoverStatus>("/api/carryover", { month, year, action });
      setStatus(s);
      toast({
        title: action === "carry" ? "Surplus carried forward" : "Carryover undone",
        variant: "success",
      });
      onChanged?.();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Month-end carryover</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <CardTitle>Month-end carryover</CardTitle>
        </div>
        <CardDescription>
          When the saving goal is 0, roll this month&apos;s leftover forward as income for next month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Received from previous month */}
        {status.carryIn > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
            <ArrowDownLeft className="h-4 w-4 text-primary" />
            <span>
              Received <span className="font-semibold">{formatCurrency(status.carryIn)}</span> carried
              over from the previous month (counted as income).
            </span>
          </div>
        )}

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Income" value={status.income + status.carryIn} />
          <Stat label="Expenses" value={status.expenses} />
          <Stat label="Saving goal" value={status.savingGoal} />
          <Stat
            label={status.carryOut > 0 ? "Net (after carry)" : "Net (recette)"}
            value={status.netAfter}
            accent={status.netAfter === 0 ? "primary" : undefined}
          />
        </div>

        {/* Action */}
        {status.carryOut > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-secondary/30 p-3">
            <span className="text-sm">
              <span className="font-semibold">{formatCurrency(status.carryOut)}</span> carried to{" "}
              {status.nextMonthLabel}. Net is 0.
            </span>
            <Button variant="outline" size="sm" onClick={() => act("undo")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Undo
            </Button>
          </div>
        ) : status.canCarry ? (
          <Button onClick={() => act("carry")} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Carry {formatCurrency(status.leftover)} forward to {status.nextMonthLabel}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {status.savingGoal !== 0
              ? "Set the saving goal to 0 to enable carrying the surplus forward."
              : status.leftover <= 0
                ? "No positive surplus to carry this month."
                : "Nothing to carry."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-secondary/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-semibold ${accent === "primary" ? "text-primary" : ""}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
