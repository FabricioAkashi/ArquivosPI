"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { parseCsvRows } from "@/lib/csv-parser";

interface CsvTableViewerProps {
  content: string;
}

export default function CsvTableViewer({ content }: CsvTableViewerProps) {
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const parsedRows = useMemo(() => parseCsvRows(content), [content]);
  const headers = parsedRows[0] || [];
  const dataRows = useMemo(() => parsedRows.slice(1), [parsedRows]);

  const displayedRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = q
      ? dataRows.filter((row) =>
          row.some((cell) => cell.toLowerCase().includes(q))
        )
      : dataRows;

    if (sortCol !== null) {
      list = [...list].sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const an = Number(av.replace(",", "."));
        const bn = Number(bv.replace(",", "."));

        const cmp =
          av !== "" && bv !== "" && !Number.isNaN(an) && !Number.isNaN(bn)
            ? an - bn
            : av.localeCompare(bv, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [dataRows, filter, sortCol, sortDir]);

  const toggleSort = (colIdx: number) => {
    if (sortCol !== colIdx) {
      setSortCol(colIdx);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortCol(null);
    }
  };

  if (parsedRows.length === 0) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-dashed border-[#1a1614]/15 bg-white/80 p-8 text-center font-mono text-xs text-[#736d67] dark:border-white/15 dark:bg-[#1b1815]/80 dark:text-[#9c968f]">
        Arquivo CSV vazio.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {/* Barra de busca e estatísticas da tabela */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#1a1614]/12 bg-white/85 px-4 py-2.5 backdrop-blur-xs dark:border-white/10 dark:bg-[#1b1815]/85">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#736d67] dark:text-[#9c968f]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar linhas..."
            className="w-full rounded-full border border-[#1a1614]/15 bg-[#f5f6f1] py-1.5 pr-3 pl-8 font-mono text-xs text-[#1a1614] outline-none transition focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:focus:border-[#d77435]"
          />
        </div>
        <span className="font-mono text-[11px] text-[#736d67] dark:text-[#9c968f]">
          {displayedRows.length} de {dataRows.length}{" "}
          {dataRows.length === 1 ? "registro" : "registros"} · {headers.length}{" "}
          colunas
        </span>
      </div>

      {/* Tabela Interativa */}
      <div className="overflow-hidden rounded-2xl border border-[#1a1614]/12 bg-white/95 shadow-xs backdrop-blur-xs dark:border-white/10 dark:bg-[#1b1815]/95">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-[#1a1614]/12 bg-[#f5f6f1]/90 font-mono text-[11px] uppercase tracking-wider text-[#6d8352] dark:border-white/10 dark:bg-[#201c19]/90 dark:text-[#7f9564]">
              <tr>
                <th className="w-10 border-r border-dashed border-[#1a1614]/10 px-3 py-2.5 text-right text-[#736d67]/60 dark:border-white/10">
                  #
                </th>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    onClick={() => toggleSort(idx)}
                    className="cursor-pointer select-none px-3.5 py-2.5 font-semibold transition hover:bg-[#1a1614]/5 dark:hover:bg-white/5"
                    title="Clique para ordenar esta coluna"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span>{header || `Coluna ${idx + 1}`}</span>
                      {sortCol === idx ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-[#c96726] dark:text-[#d77435]" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-[#c96726] dark:text-[#d77435]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1614]/8 font-mono dark:divide-white/8">
              {displayedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="transition-colors hover:bg-[#c96726]/[0.04] dark:hover:bg-[#d77435]/[0.06]"
                >
                  <td className="border-r border-dashed border-[#1a1614]/10 px-3 py-2 text-right text-[10px] text-[#736d67]/50 dark:border-white/10 dark:text-[#9c968f]/50">
                    {rIdx + 1}
                  </td>
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="max-w-[260px] truncate px-3.5 py-2 text-[#1a1614] dark:text-[#fafbf7]"
                      title={row[cIdx] || ""}
                    >
                      {row[cIdx] || (
                        <span className="text-[#736d67]/40 dark:text-[#9c968f]/40">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
