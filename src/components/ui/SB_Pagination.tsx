"use client";

import SB_Select from "@/components/ui/SB_Select";
import { cn } from "@/lib/utils";
import { PAGE_SIZE_OPTIONS } from "@/hooks/usePagination";

interface SB_PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  firstShown: number;
  lastShown: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Row noun for the count, e.g. "posts" */
  label?: string;
  pageSizeOptions?: readonly number[];
  className?: string;
}

/**
 * Builds a compact page list with ellipses: 1 … 4 5 [6] 7 8 … 20.
 * Always shows the first and last page so the ends stay one click away.
 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, pageCount, page]);
  for (const offset of [-1, 1]) {
    const neighbour = page + offset;
    if (neighbour > 1 && neighbour < pageCount) pages.add(neighbour);
  }
  // Keep the strip a stable width near the ends, where the window is clipped.
  if (page <= 3) [2, 3, 4].forEach((p) => p < pageCount && pages.add(p));
  if (page >= pageCount - 2)
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach(
      (p) => p > 1 && pages.add(p)
    );

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push("gap");
    out.push(p);
    previous = p;
  }
  return out;
}

export default function SB_Pagination({
  page,
  pageCount,
  pageSize,
  total,
  firstShown,
  lastShown,
  onPageChange,
  onPageSizeChange,
  label = "rows",
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: SB_PaginationProps) {
  if (total === 0) return null;

  const stepClass =
    "px-2.5 py-1.5 rounded-[10px] border border-line bg-white text-[#33405a] text-xs cursor-pointer hover:bg-[#f5f7fb] disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 mt-3.5 pt-3.5 border-t border-line",
        className
      )}
    >
      <div className="flex items-center gap-2.5 text-xs text-muted">
        <span>
          {firstShown}–{lastShown} of {total} {label}
        </span>
        <SB_Select
          className="!px-2.5 !py-1.5 !text-xs !rounded-[10px]"
          options={pageSizeOptions.map((size) => ({
            label: `${size} / page`,
            value: String(size),
          }))}
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
        />
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={stepClass}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>

          {pageWindow(page, pageCount).map((entry, i) =>
            entry === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  "min-w-[30px] px-2 py-1.5 rounded-[10px] border text-xs cursor-pointer",
                  entry === page
                    ? "bg-brand text-white border-brand font-bold"
                    : "bg-white text-[#33405a] border-line hover:bg-[#f5f7fb]"
                )}
              >
                {entry}
              </button>
            )
          )}

          <button
            type="button"
            className={stepClass}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
