"use client";

import * as React from "react";
import { api } from "@/lib/client-api";
import type { CategoryWithSubs } from "@/types";

export function useCategories() {
  const [categories, setCategories] = React.useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CategoryWithSubs[]>("/api/categories");
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, loading, refresh, setCategories };
}
