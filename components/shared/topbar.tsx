"use client";

import { useRouter } from "next/navigation";
import { Menu, Plus, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useUI } from "@/components/shared/ui-context";
import { api } from "@/lib/client-api";
import { useToast } from "@/hooks/use-toast";

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { setQuickAddOpen, setPaletteOpen } = useUI();
  const router = useRouter();
  const { toast } = useToast();

  async function logout() {
    await api.post("/api/auth/logout", {});
    toast({ title: "Logged out" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-background/70 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 md:max-w-xs"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded bg-background px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => setQuickAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick add</span>
        </Button>
        <ThemeToggle />
        <Button variant="outline" size="icon" onClick={logout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
