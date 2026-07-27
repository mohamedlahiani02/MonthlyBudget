"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, GaugeCircle } from "lucide-react";
import { formatCurrency, formatWeekRange, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { WeeklyStatus } from "@/types";

const STATUS = {
  ok: { label: "On track", badge: "default" as const, bar: "bg-primary", ring: "text-primary" },
  near: { label: "Near limit", badge: "accent" as const, bar: "bg-amber-500", ring: "text-amber-500" },
  over: { label: "Over limit", badge: "destructive" as const, bar: "bg-destructive", ring: "text-destructive" },
  none: { label: "No cap set", badge: "secondary" as const, bar: "bg-primary", ring: "text-muted-foreground" },
};

export function WeeklyCapWidget({ status }: { status: WeeklyStatus }) {
  const { toast } = useToast();
  const s = STATUS[status.status];
  const pct = status.pct ?? 0;
  const barPct = Math.min(100, pct);

  // Alert once when near/over on load.
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    if (status.status === "over") {
      fired.current = true;
      toast({
        title: "Weekly cap exceeded",
        description: `You've spent ${formatCurrency(status.spend)} of your ${formatCurrency(status.cap ?? 0)} weekly cap.`,
        variant: "destructive",
      });
    } else if (status.status === "near") {
      fired.current = true;
      toast({
        title: "Approaching weekly cap",
        description: `${pct.toFixed(0)}% of your weekly cap used.`,
      });
    }
  }, [status, toast, pct]);

  const Icon = status.status === "over" ? AlertTriangle : status.status === "near" ? GaugeCircle : CheckCircle2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatWeekRange(new Date(status.weekStart))} · variable spend
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(status.spend)}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-secondary", s.ring)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {status.cap ? (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className={cn("h-full rounded-full", s.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{ duration: 0.7 }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Badge variant={s.badge}>{s.label}</Badge>
            <span className="text-muted-foreground">
              {formatCurrency(status.spend)} / {formatCurrency(status.cap)}
              {status.remaining !== null && (
                <span className={status.remaining < 0 ? "text-destructive" : "text-primary"}>
                  {" "}
                  · {status.remaining < 0 ? "over by " : ""}
                  {formatCurrency(Math.abs(status.remaining))}
                  {status.remaining >= 0 ? " left" : ""}
                </span>
              )}
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-secondary/30 p-3 text-sm">
          <p className="text-muted-foreground">
            No weekly cap set. Suggested:{" "}
            <span className="font-semibold text-foreground">{formatCurrency(status.suggested)}</span>
          </p>
          <Link href="/budget" className="text-primary hover:underline">
            Set a weekly cap →
          </Link>
        </div>
      )}
    </div>
  );
}
