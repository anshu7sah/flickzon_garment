"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface UseTableParams {
  defaultPageSize?: number;
}

export function useTableParams({ defaultPageSize = 10 }: UseTableParams = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? String(defaultPageSize));
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) { params.set(key, value); } else { params.delete(key); }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const setPage = useCallback((p: number) => updateParams({ page: String(p) }), [updateParams]);
  const setPageSize = useCallback((ps: number) => updateParams({ pageSize: String(ps), page: "1" }), [updateParams]);
  const setSearch = useCallback((s: string) => updateParams({ search: s, page: "1" }), [updateParams]);
  const setSort = useCallback((by: string, order: "asc" | "desc") => updateParams({ sortBy: by, sortOrder: order }), [updateParams]);

  return { page, pageSize, search, sortBy, sortOrder, setPage, setPageSize, setSearch, setSort };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
