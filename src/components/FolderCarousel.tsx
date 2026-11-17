"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Eye, Sparkles } from "lucide-react";
import { FileItem } from "@/lib/types";
import { formatBytes } from "@/lib/file-utils";
import DocumentPreview from "./DocumentPreview";

interface FolderCarouselProps {
  files: FileItem[];
  onSelectFile: (fileId: string) => void;
  title?: string;
  className?: string;
}

export default function FolderCarousel({
  files,
  onSelectFile,
  title,
  className = "",
}: FolderCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Se não houver arquivos, o carrossel NÃO aparece
  if (!files || files.length === 0) {
    return null;
  }

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    // Permite que o DOM calcule clientWidth e scrollWidth
    const timer = setTimeout(updateScrollButtons, 100);
    const el = scrollRef.current;
    if (!el) return () => clearTimeout(timer);

    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [files]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = 260;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  return (
    <div className={`relative mt-3 group/carousel ${className}`}>
      {/* Título opcional da seção do carrossel */}
      {title && (
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{title}</span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {files.length} {files.length === 1 ? "arquivo" : "arquivos"}
          </span>
        </div>
      )}

      <div className="relative">
        {/* Botão de rolagem para a esquerda */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scroll("left");
            }}
            className="absolute -left-2.5 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md backdrop-blur-xs transition hover:scale-110 active:scale-95 dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-200"
            title="Ver arquivos anteriores"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Botão de rolagem para a direita */}
        {canScrollRight && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scroll("right");
            }}
            className="absolute -right-2.5 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md backdrop-blur-xs transition hover:scale-110 active:scale-95 dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-200"
            title="Ver próximos arquivos"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Contêiner de rolagem horizontal com snap */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1.5 pt-0.5 scroll-smooth snap-x scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {files.map((file) => (
            <div
              key={file.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFile(file.id);
              }}
              className="group/card relative w-36 sm:w-44 shrink-0 snap-start cursor-pointer rounded-xl border border-neutral-200/90 bg-neutral-50/70 p-2.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {/* Área de Preview do Documento */}
              <div className="relative h-24 sm:h-28 w-full overflow-hidden rounded-lg bg-white/80 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/80">
                <DocumentPreview file={file} />

                {/* Overlay hover com botão de ver */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-2xs transition group-hover/card:opacity-100">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-neutral-900 shadow-xs dark:bg-neutral-900/90 dark:text-white">
                    <Eye className="h-3 w-3" />
                    Abrir
                  </span>
                </div>
              </div>

              {/* Informações do Arquivo */}
              <div className="mt-2 min-w-0">
                <p
                  className="truncate text-xs font-semibold text-neutral-800 transition group-hover/card:text-amber-600 dark:text-neutral-200 dark:group-hover/card:text-amber-400"
                  title={file.name}
                >
                  {file.name}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="font-mono uppercase font-bold text-neutral-500 dark:text-neutral-400">
                    {file.extension || "ARQ"}
                  </span>
                  <span>{formatBytes(file.size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
