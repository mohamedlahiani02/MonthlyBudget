"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  FolderTree,
  BarChart3,
  Settings,
  Wallet2,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Wallet2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Finance</p>
          <p className="text-xs text-muted-foreground leading-tight">Dashboard</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 text-xs text-muted-foreground">
        Press <kbd className="rounded bg-secondary px-1.5 py-0.5">Ctrl</kbd>+
        <kbd className="rounded bg-secondary px-1.5 py-0.5">K</kbd>
      </p>
    </div>
  );
}
