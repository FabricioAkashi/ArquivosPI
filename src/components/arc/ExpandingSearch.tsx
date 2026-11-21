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
        className="relative flex h-9 max-w-[calc(100vw-2rem)] items-center overflow-hidden rounded-full border border-[#1a1614]/15 bg-white/90 shadow-2xs backdrop-blur-xs dark:border-white/15 dark:bg-[#201c19]/90"
      >
        {/* Botão / Ícone de busca */}
        <button
          type="button"
          onClick={handleOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
          title="Buscar"
        >
          <Search className="h-3.5 w-3.5" />
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
          className="h-full flex-1 bg-transparent pr-8 font-mono text-xs text-[#1a1614] outline-none placeholder:text-[#736d67]/60 dark:text-[#fafbf7] dark:placeholder:text-[#9c968f]/60"
        />

        {/* Botão de limpar busca */}
        {query && (
          <button
            type="button"
            onClick={() => {
              handleQueryChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1a1614]/10 text-[#736d67] hover:bg-[#1a1614]/20 hover:text-[#1a1614] dark:bg-white/10 dark:text-[#9c968f] dark:hover:bg-white/20 dark:hover:text-[#fafbf7]"
            title="Limpar busca"
          >
            <X className="h-2.5 w-2.5" />
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
            className="absolute left-0 top-full z-40 mt-1.5 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#1a1614]/15 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-[#201c19]/95"
          >
            <div className="px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#736d67] dark:text-[#9c968f]">
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
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition hover:bg-[#1a1614]/5 dark:hover:bg-white/5"
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
