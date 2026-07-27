"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  decimals?: number;
  accent?: "primary" | "accent" | "destructive" | "muted";
  hint?: string;
  index?: number;
}

const accentMap = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  destructive: "bg-destructive/15 text-destructive",
  muted: "bg-secondary text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  icon,
  suffix = " DT",
  decimals = 2,
  accent = "primary",
  hint,
  index = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl [&_svg]:h-4 [&_svg]:w-4",
            accentMap[accent]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">
        <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}
