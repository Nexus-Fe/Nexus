"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AddressItem } from "@/types/address";
import { matchesQuery, removeVietnameseTones } from "@/utils/vietnamese";

// Module-level singleton cache để chỉ fetch file address.json 1 lần duy nhất trong toàn session
let inMemoryAddresses: AddressItem[] | null = null;
let activeFetchPromise: Promise<AddressItem[]> | null = null;

async function fetchStaticAddressData(): Promise<AddressItem[]> {
  if (inMemoryAddresses) return inMemoryAddresses;
  if (activeFetchPromise) return activeFetchPromise;

  activeFetchPromise = fetch("/address.json", {
    headers: { Accept: "application/json" },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Không thể tải dữ liệu địa chỉ (${res.status} ${res.statusText})`);
      }
      return res.json() as Promise<AddressItem[]>;
    })
    .then((data) => {
      inMemoryAddresses = Array.isArray(data) ? data : [];
      return inMemoryAddresses;
    })
    .catch((err) => {
      activeFetchPromise = null;
      throw err;
    });

  return activeFetchPromise;
}

export interface UseAddressSearchResult {
  query: string;
  setQuery: (val: string) => void;
  results: AddressItem[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  error: string | null;
  loadDataIfNeeded: () => Promise<void>;
  clearSearch: () => void;
}

/**
 * Hook tìm kiếm địa chỉ nhanh:
 * - Lazy load address.json
 * - Debounce 300ms
 * - Lọc trực tiếp trên mảng dữ liệu (không phân biệt dấu / hoa thường)
 * - Tối ưu vòng lặp sớm (early-exit) lấy tối đa 10 phần tử
 */
export function useAddressSearch(maxResults = 10): UseAddressSearchResult {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<AddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm kích hoạt tải dữ liệu nếu chưa có sẵn trong cache
  const loadDataIfNeeded = useCallback(async () => {
    if (inMemoryAddresses) return;
    setIsLoading(true);
    setError(null);
    try {
      await fetchStaticAddressData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải danh mục địa chỉ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Xử lý Debounce 300ms cho ô nhập liệu
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Khi debouncedQuery thay đổi, tiến hành lọc dữ liệu
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        setIsLoading(true);
        const allAddresses = inMemoryAddresses ?? (await fetchStaticAddressData());
        if (isCancelled) return;

        const normalizedQuery = removeVietnameseTones(trimmed);
        const queryTokens = normalizedQuery.split(" ").filter(Boolean);

        // Sử dụng for...of loop kết hợp early exit (ngắt ngay khi đạt maxResults)
        const matched: AddressItem[] = [];
        for (let i = 0; i < allAddresses.length; i++) {
          const item = allAddresses[i];
          if (matchesQuery(item.searchText, queryTokens)) {
            matched.push(item);
            if (matched.length >= maxResults) {
              break;
            }
          }
        }

        setResults(matched);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Lỗi tìm kiếm");
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, maxResults]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    error,
    loadDataIfNeeded,
    clearSearch,
  };
}
