"use client";

import * as React from "react";
import { Loader2, Undo2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountWithBalanceDTO } from "@/types";

interface FreshStart {
  month: string;
  balances: Record<string, number>;
  untracked: string[];
}

const MONTHS_TO_OFFER = 6;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shift(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function label(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function FreshStartDialog({
  open,
  onOpenChange,
  accounts,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountWithBalanceDTO[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const active = React.useMemo(() => accounts.filter((a) => a.isActive), [accounts]);
  const [month, setMonth] = React.useState(currentMonthKey);
  const [untracked, setUntracked] = React.useState<Set<string>>(() => new Set([shift(currentMonthKey(), -1)]));
  const [mode, setMode] = React.useState<"zero" | "custom">("zero");
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [existing, setExisting] = React.useState<FreshStart[]>([]);
  const [saving, setSaving] = React.useState(false);

  const loadExisting = React.useCallback(async () => {
    setExisting(await api.get<FreshStart[]>("/api/fresh-start"));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    loadExisting();
    setAmounts(Object.fromEntries(active.map((a) => [a.id, String(a.balance)])));
  }, [open, active, loadExisting]);

  function changeMonth(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    setMonth(value);
    setUntracked(new Set([shift(value, -1)]));
  }

  function toggleUntracked(key: string) {
    setUntracked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    const balances: Record<string, number> = {};
    for (const a of active) {
      const value = mode === "zero" ? 0 : Number.parseFloat(amounts[a.id] ?? "");
      if (!Number.isFinite(value)) {
        toast({ title: "Invalid amount", description: `Check the amount for ${a.label}`, variant: "destructive" });
        return;
      }
      balances[a.id] = value;
    }
    setSaving(true);
    try {
      await api.post("/api/fresh-start", { month, balances, untracked: [...untracked] });
      toast({ title: `${label(month)} opened fresh`, variant: "success" });
      await loadExisting();
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not save", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function undo(key: string) {
    try {
      await api.del(`/api/fresh-start?month=${key}`);
      toast({ title: `Fresh start for ${label(key)} removed`, variant: "success" });
      await loadExisting();
      onChanged();
    } catch (err) {
      toast({ title: "Could not undo", description: (err as Error).message, variant: "destructive" });
    }
  }

  const offered = Array.from({ length: MONTHS_TO_OFFER }, (_, i) => shift(month, -(i + 1)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a month fresh</DialogTitle>
          <DialogDescription>
            Set each account&apos;s opening balance for a month. Earlier transactions stay in your history but no
            longer affect balances. Months you didn&apos;t track are estimated in analytics from your previous months.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fresh-month">Month to open</Label>
            <Input id="fresh-month" type="month" value={month} onChange={(e) => changeMonth(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Months you didn&apos;t track</Label>
            <div className="grid grid-cols-2 gap-2">
              {offered.map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <input type="checkbox" checked={untracked.has(key)} onChange={() => toggleUntracked(key)} />
                  {label(key)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Opening balances</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={mode === "zero" ? "default" : "outline"} onClick={() => setMode("zero")}>
                All at zero
              </Button>
              <Button type="button" variant={mode === "custom" ? "default" : "outline"} onClick={() => setMode("custom")}>
                Enter amounts
              </Button>
            </div>
            {mode === "custom" && (
              <div className="space-y-2 pt-1">
                {active.map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="flex-1 truncate text-sm">{a.label}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      className="w-36"
                      value={amounts[a.id] ?? ""}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button className="w-full" onClick={submit} disabled={saving || active.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Open {label(month)}
          </Button>

          {existing.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Existing fresh starts</Label>
              {existing.map((e) => (
                <div key={e.month} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{label(e.month)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Object.values(e.balances).reduce((s, v) => s + v, 0))} total
                      {e.untracked.length > 0 && ` · estimated: ${e.untracked.map(label).join(", ")}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => undo(e.month)}>
                    <Undo2 className="h-4 w-4" /> Undo
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
