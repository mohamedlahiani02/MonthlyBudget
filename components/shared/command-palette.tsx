"use client";

import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/components/shared/sidebar";
import { useUI } from "@/components/shared/ui-context";
import { Plus, LogOut } from "lucide-react";
import { api } from "@/lib/client-api";

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, setQuickAddOpen } = useUI();

  function go(href: string) {
    setPaletteOpen(false);
    router.push(href);
  }

  async function logout() {
    setPaletteOpen(false);
    await api.post("/api/auth/logout", {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setPaletteOpen(false);
              setQuickAddOpen(true);
            }}
          >
            <Plus /> Quick add expense
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.href} onSelect={() => go(item.href)}>
                <Icon /> {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Session">
          <CommandItem onSelect={logout}>
            <LogOut /> Log out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
