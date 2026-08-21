"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface SB_DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
}

export default function SB_DataTable<T>({
  columns,
  data,
  onRowClick,
}: SB_DataTableProps<T>) {
  return (
    <div className="overflow-x-auto -mx-[18px] px-[18px]">
    <table className="w-full border-collapse min-w-[500px]">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th
              key={i}
              className="px-2.5 py-3 border-b border-line text-left text-[11px] text-[#8a96aa] uppercase tracking-[0.04em]"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            onClick={() => onRowClick?.(row, rowIndex)}
            className={cn(
              onRowClick && "cursor-pointer hover:bg-[#f9fbfe]"
            )}
          >
            {columns.map((col, colIndex) => (
              <td
                key={colIndex}
                className={cn(
                  "px-2.5 py-3 border-b border-line text-[13px]",
                  col.className
                )}
              >
                {typeof col.accessor === "function"
                  ? col.accessor(row)
                  : (row[col.accessor] as React.ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
