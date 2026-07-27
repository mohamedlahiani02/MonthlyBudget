"use client";

import { useRouter, usePathname } from "next/navigation";
import { MONTH_NAMES } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PeriodSelect({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => current - i);

  function go(m: number, y: number) {
    router.push(`${pathname}?month=${m}&year=${y}`);
  }

  return (
    <div className="flex gap-2">
      <Select value={String(month)} onValueChange={(v) => go(Number(v), year)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => go(month, Number(v))}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
