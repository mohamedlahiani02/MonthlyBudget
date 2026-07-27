"use client";

import * as React from "react";
import { Loader2, Sparkles, CalendarRange } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency, formatWeekRange } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyStatus } from "@/types";

const STATUS_BADGE = {
  ok: { label: "On track", variant: "default" as const },
  near: { label: "Near limit", variant: "accent" as const },
  over: { label: "Over limit", variant: "destructive" as const },
  none: { label: "No cap", variant: "secondary" as const },
};

export function WeeklyCapSection() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<WeeklyStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.get<WeeklyStatus>("/api/weekly-cap");
      setStatus(s);
      setValue(s.cap ? String(s.cap) : "");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function save(cap: number | null) {
    setSaving(true);
    try {
      const s = await api.put<WeeklyStatus>("/api/weekly-cap", { cap });
      setStatus(s);
      setValue(s.cap ? String(s.cap) : "");
      toast({ title: cap ? "Weekly cap saved" : "Weekly cap cleared", variant: "success" });
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
          <CardTitle>Weekly spending cap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const b = status.breakdown;
  const badge = STATUS_BADGE[status.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <CardTitle>Weekly spending cap</CardTitle>
        </div>
        <CardDescription>
          Limit your weekly variable spending. Tracks {formatWeekRange(new Date(status.weekStart))}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Suggestion breakdown (Pay-Yourself-First) */}
        <div className="rounded-xl border border-white/10 bg-secondary/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Suggested cap
            <span className="ml-auto text-lg font-semibold">{formatCurrency(status.suggested)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Income {formatCurrency(b.income)} − Savings goal {formatCurrency(b.savingGoal)} − Fixed{" "}
            {formatCurrency(b.fixed)} = {formatCurrency(b.discretionary)} discretionary ÷ {b.weeksInMonth} weeks
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => save(Number(status.suggested.toFixed(2)))}
            disabled={saving || status.suggested <= 0}
          >
            Apply suggestion
          </Button>
        </div>

        {/* Set / clear cap */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="weeklyCap">Your weekly cap (DT)</Label>
            <Input
              id="weeklyCap"
              type="number"
              step="0.01"
              placeholder="e.g. 300"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button onClick={() => save(value ? Number(value) : null)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
          {status.cap && (
            <Button variant="outline" onClick={() => save(null)} disabled={saving}>
              Clear
            </Button>
          )}
        </div>

        {/* This week status */}
        {status.cap && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-secondary/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-muted-foreground">this week</span>
            </div>
            <span className="font-medium">
              {formatCurrency(status.spend)} / {formatCurrency(status.cap)}
              {status.pct !== null && (
                <span className="ml-1 text-muted-foreground">({status.pct.toFixed(0)}%)</span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
