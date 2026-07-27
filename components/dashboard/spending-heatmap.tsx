"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SpendingHeatmapProps {
  year: number;
  month: number; // 1-12
  data: { date: string; total: number }[];
}

export function SpendingHeatmap({ year, month, data }: SpendingHeatmapProps) {
  const totals = new Map(data.map((d) => [d.date, d.total]));
  const max = Math.max(...data.map((d) => d.total), 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon=0

  const cells: (null | { day: number; total: number })[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = new Date(year, month - 1, d).toISOString().slice(0, 10);
    cells.push({ day: d, total: totals.get(key) ?? 0 });
  }

  function intensity(total: number) {
    if (total <= 0) return "bg-secondary/50";
    const ratio = total / max;
    if (ratio > 0.75) return "bg-primary";
    if (ratio > 0.5) return "bg-primary/70";
    if (ratio > 0.25) return "bg-primary/45";
    return "bg-primary/25";
  }

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={`e-${i}`} />
          ) : (
            <div
              key={cell.day}
              title={`${cell.day}: ${formatCurrency(cell.total)}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-[10px] font-medium text-foreground/80",
                intensity(cell.total)
              )}
            >
              {cell.day}
            </div>
          )
        )}
      </div>
    </div>
  );
}
