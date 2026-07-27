"use client";

import * as React from "react";

interface UIContextValue {
  quickAddOpen: boolean;
  setQuickAddOpen: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const UIContext = React.createContext<UIContextValue | null>(null);

export function useUI() {
  const ctx = React.useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  return (
    <UIContext.Provider
      value={{ quickAddOpen, setQuickAddOpen, paletteOpen, setPaletteOpen }}
    >
      {children}
    </UIContext.Provider>
  );
}
