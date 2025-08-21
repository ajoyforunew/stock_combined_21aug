import React, { useMemo, useState } from "react";
import { saveAs } from "file-saver";

export default function ForecastTable({ data }) {
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "asc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSearch, setColumnSearch] = useState({});
  const pinnedCols = ["date", "predicted_close", "predicted_volume"];

  const { columns, rows } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { columns: [], rows: [] };
    }
    const keys = Object.keys(data[0] || {});
    const rest = keys.filter((k) => !pinnedCols.includes(k)).sort((a, b) => a.localeCompare(b));
    const columns = [...pinnedCols.filter((k) => keys.includes(k)), ...rest];

    const rows = data.map((row) => {
      const normalized = {};
      columns.forEach((col) => {
        let value = row[col];
        if (typeof value === "number" && Number.isFinite(value)) {
          const abs = Math.abs(value);
          if (abs >= 1_000_000_000) value = (value / 1_000_000_000).toFixed(2) + "B";
          else if (abs >= 1_000_000) value = (value / 1_000_000).toFixed(2) + "M";
          else if (abs >= 1_000) value = (value / 1_000).toFixed(2) + "K";
          else value = abs >= 100 ? value.toFixed(2) : value.toFixed(4);
        }
        normalized[col] = value ?? "";
      });
      return normalized;
    });

    return { columns, rows };
  }, [data]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Global search
      const globalMatch = searchTerm
        ? Object.values(row).some((val) =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
          )
        : true;

      // Column-specific search
      const colMatch = Object.entries(columnSearch).every(([col, term]) => {
        if (!term) return true;
        return String(row[col]).toLowerCase().includes(term.toLowerCase());
      });

      return globalMatch && colMatch;
    });
  }, [rows, searchTerm, columnSearch]);

  const sortedRows = useMemo(() => {
    if (!filteredRows.length || !sortConfig.key) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const va = a[sortConfig.key];
      const vb = b[sortConfig.key];
      const na = Number(String(va).replace(/[BMK]$/, ""));
      const nb = Number(String(vb).replace(/[BMK]$/, ""));
      const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb);
      if (bothNumeric) {
        return sortConfig.direction === "asc" ? na - nb : nb - na;
      }
      return sortConfig.direction === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return sorted;
  }, [filteredRows, sortConfig]);

  // ...existing code...

  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full text-xs border-collapse border border-gray-200 rounded-lg">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {columns.map((col) => {
              const isActive = sortConfig.key === col;
              const arrow = isActive ? (sortConfig.direction === "asc" ? "▲" : "▼") : "";
              return (
                <th
                  key={col}
                  onClick={() => setSortConfig((prev) => ({
                    key: col,
                    direction: prev.key === col && prev.direction === "asc" ? "desc" : "asc"
                  }))}
                  className="px-2 py-1 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer border-b"
                >
                  {col}
                  <span className="ml-1 text-gray-400">{arrow}</span>
                </th>
              );
            })}
          </tr>
          {/* Column-specific filter row */}
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-1 py-1 border-b bg-white">
                <input
                  type="text"
                  placeholder="🔍"
                  value={columnSearch[col] || ""}
                  onChange={(e) =>
                    setColumnSearch((prev) => ({ ...prev, [col]: e.target.value }))
                  }
                  className="border rounded-sm px-1 py-0.5 text-xs w-full"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "odd:bg-white even:bg-gray-50" : "odd:bg-white even:bg-gray-50"}>
              {columns.map((col) => (
                <td key={col} className="px-2 py-1 whitespace-nowrap border-b text-gray-800">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-1 text-xs text-gray-400">
        Tip: Click a header to sort. Use search boxes to filter by column.
      </div>
    </div>
  );
}
