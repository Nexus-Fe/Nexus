"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { AddressItem } from "@/types/address";
import { matchesQuery, removeVietnameseTones } from "@/utils/vietnamese";

// Module-level singleton cache để chỉ fetch file address.json 1 lần duy nhất trong toàn session
let inMemoryAddresses: AddressItem[] | null = null;
let activeFetchPromise: Promise<AddressItem[]> | null = null;

export async function fetchStaticAddressData(): Promise<AddressItem[]> {
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

/**
 * Tra cứu thông tin địa chỉ từ mã tỉnh và mã phường đã lưu
 */
export async function lookupAddressByCodes(
  provinceId: string,
  wardCode: string,
): Promise<AddressItem | undefined> {
  try {
    const data = inMemoryAddresses ?? (await fetchStaticAddressData());
    return data.find(
      (item) => item.wardCode === wardCode && String(item.provinceId) === String(provinceId),
    );
  } catch {
    return undefined;
  }
}

/**
 * Hook tiện ích đóng phần tử khi nhấp chuột ra ngoài container
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onClickOutside: () => void): void {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, onClickOutside]);
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
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>, onSelect?: (item: AddressItem) => void) => void;
}

/**
 * Hook tìm kiếm địa chỉ nhanh:
 * - Lazy load address.json
 * - Debounce 300ms
 * - Lọc trực tiếp trên mảng dữ liệu (không phân biệt dấu / hoa thường)
 * - Tối ưu vòng lặp sớm (early-exit) lấy tối đa 10 phần tử
 * - Hỗ trợ sẵn điều hướng phím (ArrowUp, ArrowDown, Enter, Escape)
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
      queueMicrotask(() => {
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
      });
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

        // Sử dụng for loop kết hợp early exit (ngắt ngay khi đạt maxResults)
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, onSelect?: (item: AddressItem) => void) => {
      if (!isOpen || results.length === 0) {
        if (event.key === "ArrowDown" && query.trim()) setIsOpen(true);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          onSelect?.(results[selectedIndex]);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen, results, selectedIndex, query],
  );

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
    handleKeyDown,
  };
}
