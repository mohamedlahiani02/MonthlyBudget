"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function YearSelect({ year }: { year: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => current - i);

  return (
    <Select value={String(year)} onValueChange={(v) => router.push(`${pathname}?year=${v}`)}>
      <SelectTrigger className="w-32">
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
  );
}
