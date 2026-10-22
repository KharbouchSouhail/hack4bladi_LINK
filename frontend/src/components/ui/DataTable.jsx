import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";

// Columns: { key, header, render(row), sortValue?(row), className?, align? }.
export default function DataTable({ columns, rows, rowKey = "id", pageSize = 10, empty, initialSort = null, caption }) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (!column?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = column.sortValue(a);
      const y = column.sortValue(b);
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x > y ? 1 : -1) * dir;
    });
  }, [columns, rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, (current + 1) * pageSize);

  function toggleSort(key) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  if (rows.length === 0) return empty ?? null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={`px-4 py-2.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase ${c.align === "right" ? "text-right" : ""} ${c.className ?? ""}`}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 rounded-xs uppercase hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-accent-600"
                    >
                      {c.header}
                      {sort?.key === c.key &&
                        (sort.dir === "asc" ? <ArrowUp aria-hidden="true" size={12} /> : <ArrowDown aria-hidden="true" size={12} />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row[rowKey]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle text-gray-800 ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-600">
          <span className="tabular-nums">
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">{children}</div>;
}
