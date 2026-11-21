"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  FileText,
  Folder as FolderIcon,
  Layers,
  Search,
  X,
} from "lucide-react";
import { FileItem, Folder, Semester } from "@/lib/types";
import { formatBytes } from "@/lib/file-utils";
import { motionTokens } from "./arc/motion-tokens";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  semesters: Semester[];
  folders: Folder[];
  files: FileItem[];
  onSelectSemester: (semesterId: string) => void;
  onSelectFolder: (folder: Folder) => void;
  onSelectFile: (file: FileItem) => void;
}

interface PaletteResult {
  id: string;
  kind: "semester" | "folder" | "file";
  title: string;
  subtitle: string;
  badge: string;
  onSelect: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  semesters,
  folders,
  files,
  onSelectSemester,
  onSelectFolder,
  onSelectFile,
}: CommandPaletteProps) {
  const reduced = !!useReducedMotion();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const semesterMap = useMemo(() => {
    const map = new Map<string, Semester>();
    semesters.forEach((s) => map.set(s.id, s));
    return map;
  }, [semesters]);

  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  const results = useMemo<PaletteResult[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteResult[] = [];

    for (const sem of semesters) {
      if (
        !q ||
        sem.name.toLowerCase().includes(q) ||
        sem.title.toLowerCase().includes(q)
      ) {
        list.push({
          id: `sem:${sem.id}`,
          kind: "semester",
          title: sem.name,
          subtitle: sem.title || "Ciclo Semestral",
          badge: "CICLO",
          onSelect: () => {
            onSelectSemester(sem.id);
            onClose();
          },
        });
      }
    }

    for (const fld of folders) {
      const semName = semesterMap.get(fld.semesterId)?.name || "";
      const membersStr = (fld.members || []).join(" ").toLowerCase();
      if (
        !q ||
        fld.name.toLowerCase().includes(q) ||
        semName.toLowerCase().includes(q) ||
        membersStr.includes(q)
      ) {
        list.push({
          id: `fld:${fld.id}`,
          kind: "folder",
          title: fld.name,
          subtitle: semName ? `${semName} › Pasta de Projeto` : "Pasta de Projeto",
          badge: "PASTA",
          onSelect: () => {
            onSelectFolder(fld);
            onClose();
          },
        });
      }
    }

    for (const file of files) {
      const semName = semesterMap.get(file.semesterId)?.name || "";
      const fldName = file.folderId ? folderMap.get(file.folderId)?.name : "";
      const pathStr = [semName, fldName].filter(Boolean).join(" › ");

      if (
        !q ||
        file.name.toLowerCase().includes(q) ||
        file.extension.toLowerCase().includes(q) ||
        pathStr.toLowerCase().includes(q)
      ) {
        list.push({
          id: `file:${file.id}`,
          kind: "file",
          title: file.name,
          subtitle: `${pathStr ? `${pathStr} · ` : ""}${formatBytes(file.size)}`,
          badge: file.extension.toUpperCase() || "ARQUIVO",
          onSelect: () => {
            onSelectFile(file);
            onClose();
          },
        });
      }
    }

    return list.slice(0, 24);
  }, [
    query,
    semesters,
    folders,
    files,
    semesterMap,
    folderMap,
    onSelectSemester,
    onSelectFolder,
    onSelectFile,
    onClose,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((idx) => (results.length ? (idx + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((idx) =>
        results.length ? (idx - 1 + results.length) % results.length : 0
      );
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      results[activeIndex].onSelect();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-4 pt-16 sm:pt-24 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            transition={motionTokens.spring.snappy}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#1a1614]/15 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-[#201c19]/95"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Input de busca global */}
            <div className="flex items-center gap-3 border-b border-dashed border-[#1a1614]/15 px-4 py-3.5 dark:border-white/10">
              <Search className="h-4 w-4 shrink-0 text-[#c96726] dark:text-[#d77435]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar em todo o acervo (semestres, pastas, arquivos, autores)..."
                className="min-w-0 flex-1 bg-transparent font-mono text-xs sm:text-sm text-[#1a1614] outline-none placeholder:text-[#736d67]/60 dark:text-[#fafbf7] dark:placeholder:text-[#9c968f]/60"
              />
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-[#736d67] hover:bg-[#1a1614]/5 dark:text-[#9c968f] dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Resultados */}
            <div className="max-h-[55dvh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="py-10 text-center font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
                  Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {results.map((item, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={item.onSelect}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition ${
                          isActive
                            ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                            : "text-[#1a1614] hover:bg-[#1a1614]/5 dark:text-[#fafbf7] dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                              isActive
                                ? "bg-[#c96726] text-white dark:bg-[#d77435]"
                                : "bg-[#1a1614]/6 text-[#c96726] dark:bg-white/10 dark:text-[#d77435]"
                            }`}
                          >
                            {item.kind === "semester" ? (
                              <Layers className="h-3.5 w-3.5" />
                            ) : item.kind === "folder" ? (
                              <FolderIcon className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-medium">
                              {item.title}
                            </p>
                            <p
                              className={`truncate font-mono text-[10px] ${
                                isActive
                                  ? "opacity-75"
                                  : "text-[#736d67] dark:text-[#9c968f]"
                              }`}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                              isActive
                                ? "bg-white/15 text-white dark:bg-black/15 dark:text-[#1a1614]"
                                : "bg-[#6d8352]/12 text-[#55693e] dark:text-[#8ea573]"
                            }`}
                          >
                            {item.badge}
                          </span>
                          {isActive && <ArrowRight className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé com atalhos */}
            <div className="flex items-center justify-between border-t border-dashed border-[#1a1614]/15 bg-[#f5f6f1]/80 px-4 py-2 font-mono text-[10px] text-[#736d67] dark:border-white/10 dark:bg-[#161311]/80 dark:text-[#9c968f]">
              <span>↑↓ navegar · Enter abrir</span>
              <span>ESC fechar · Ctrl+K busca global</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
