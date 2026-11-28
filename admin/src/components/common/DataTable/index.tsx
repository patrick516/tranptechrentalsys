// Generic table: grey hairlines, small capital headings, no coloured fills.
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
  caption?: string; // read out by screen readers
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = "No records found.",
  caption,
}: DataTableProps<T>) {
  const alignClass = (align?: "left" | "right") => (align === "right" ? "text-right" : "text-left");

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wider text-slate-500">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap py-2.5 pr-4 last:pr-0 ${alignClass(col.align)}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-slate-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 pr-4 last:pr-0 ${alignClass(col.align)}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
