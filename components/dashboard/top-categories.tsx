"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

interface TopCategoriesProps {
  categories: { name: string; type: string; total: number }[];
}

export function TopCategories({ categories }: TopCategoriesProps) {
  if (categories.length === 0) {
    return <EmptyState title="No spending yet" description="Categories will appear once you log expenses." />;
  }
  const max = Math.max(...categories.map((c) => c.total), 1);

  return (
    <div className="space-y-4">
      {categories.map((cat, i) => (
        <div key={cat.name}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{cat.name}</span>
              <Badge variant={cat.type === "Fixed" ? "accent" : "secondary"}>{cat.type}</Badge>
            </div>
            <span className="text-muted-foreground">{formatCurrency(cat.total)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(cat.total / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.05 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
