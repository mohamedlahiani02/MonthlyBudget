"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface BudgetRingProps {
  utilization: number; // percentage
  spent: number;
  budget: number;
}

export function BudgetRing({ utilization, spent, budget }: BudgetRingProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, utilization));
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 100 ? "hsl(var(--destructive))" : pct >= 80 ? "hsl(38 92% 50%)" : "hsl(var(--primary))";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-48 w-48">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="14"
          />
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold">{pct.toFixed(0)}%</span>
          <span className="text-xs text-muted-foreground">used</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {formatCurrency(spent)} of {formatCurrency(budget)}
        </p>
      </div>
    </div>
  );
}
