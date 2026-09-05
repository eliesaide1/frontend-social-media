"use client";

import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25] as const;

interface UsePaginationResult<T> {
  /** The rows for the current page */
  pageItems: T[];
  /** 1-based */
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  pageCount: number;
  total: number;
  /** 1-based index of the first row shown; 0 when there are none */
  firstShown: number;
  lastShown: number;
}

/**
 * Client-side pagination over an already-fetched list.
 *
 * The API has no pagination envelope — every list endpoint returns a bare
 * array, and cursor following happens server-side — so slicing here is the
 * whole of it; there is no page parameter to send.
 *
 * The current page is derived rather than stored: polling can shrink the list
 * under us (a post is deleted, a refresh returns fewer rows), and a stored
 * page index would then point past the end and render an empty table with no
 * way back. Clamping on read means the view always shows something real.
 */
export function usePagination<T>(
  items: T[] | null | undefined,
  initialPageSize: number = PAGE_SIZE_OPTIONS[0],
  /**
   * Changing this jumps back to page 1. Pass the id the list belongs to:
   * switching Facebook page while on page 12 should not land you on page 12
   * of a different page's posts.
   */
  resetKey?: string | number
): UsePaginationResult<T> {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setRawPageSize] = useState(initialPageSize);
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // Derived-during-render reset: cheaper and less surprising than an effect,
  // which would paint the wrong page for a frame first.
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setRequestedPage(1);
  }

  const total = items?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);

  const pageItems = useMemo(() => {
    if (!items) return [];
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const setPage = (next: number) =>
    setRequestedPage(Math.min(Math.max(1, next), pageCount));

  // Keep the first visible row visible when the size changes, so switching
  // 10 -> 25 expands around where you were instead of jumping to the top.
  const setPageSize = (size: number) => {
    const anchor = (page - 1) * pageSize;
    setRawPageSize(size);
    setRequestedPage(Math.floor(anchor / size) + 1);
  };

  return {
    pageItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    firstShown: total === 0 ? 0 : (page - 1) * pageSize + 1,
    lastShown: Math.min(page * pageSize, total),
  };
}
