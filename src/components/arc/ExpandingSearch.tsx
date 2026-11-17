"use client";

import React, { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, X } from "lucide-react";
import { motionTokens } from "./motion-tokens";

export interface ExpandingSearchItem {
  id: string;
  title: string;
  meta?: string;
  icon?: React.ReactNode;
}

export interface ExpandingSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  items?: ExpandingSearchItem[];
  onSelect?: (item: ExpandingSearchItem) => void;
  className?: string;
}

export default function ExpandingSearch({
  placeholder = "Buscar arquivos...",
  value = "",
  onChange,
  items = [],
  onSelect,
  className = "",
}: ExpandingSearchProps) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [internalQuery, setInternalQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const query = onChange ? value : internalQuery;

  useEffect(() => {
    setInternalQuery(value);
  }, [value]);

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    if (onChange) onChange(val);
  };

  const handleOpen = () => {
    setExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleClose = () => {
    if (!query) {
      setExpanded(false);
    }
  };

  // Fecha se clicar fora e estiver vazio
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (!query) {
          setExpanded(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query]);

  // Filtra itens
  const filteredItems = items
    .filter((item) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.meta && item.meta.toLowerCase().includes(q))
      );
    })
    .slice(0, 5);

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      <motion.div
        layout
        initial={false}
        animate={{
          width: expanded || query ? 240 : 36,
        }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: 450,
                damping: 35,
              }
        }
        className="relative flex h-9 items-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Botão / Ícone de busca */}
        <button
          type="button"
          onClick={handleOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          title="Buscar"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Input que aparece quando expandido */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={handleClose}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleQueryChange("");
              setExpanded(false);
              inputRef.current?.blur();
            }
          }}
          className="h-full flex-1 bg-transparent pr-8 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
        />

        {/* Botão de limpar busca */}
        {query && (
          <button
            type="button"
            onClick={() => {
              handleQueryChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Limpar busca"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </motion.div>

      {/* Resultados rápidos em dropdown (se fornecidos) */}
      <AnimatePresence>
        {expanded && query.trim() && filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Resultados ({filteredItems.length})
            </div>
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onSelect) onSelect(item);
                  setExpanded(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                {item.icon}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  {item.meta && (
                    <p className="truncate text-[10px] text-neutral-400">
                      {item.meta}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
