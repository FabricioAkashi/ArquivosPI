"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface DocxViewerProps {
  url: string;
  name: string;
}

export default function DocxViewer({ url, name }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function loadDocx() {
      try {
        const [res, docxPreview] = await Promise.all([
          fetch(url),
          import("docx-preview"),
        ]);

        if (!res.ok) throw new Error("Falha ao baixar o arquivo DOCX.");
        const buffer = await res.arrayBuffer();

        if (!active || !containerRef.current) return;
        containerRef.current.innerHTML = "";

        await docxPreview.renderAsync(buffer, containerRef.current, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });

        if (active) setLoading(false);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível renderizar o documento Word."
          );
          setLoading(false);
        }
      }
    }

    loadDocx();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 text-xs dark:border-neutral-800">
        <span className="text-neutral-500 dark:text-neutral-400">
          Documento Word (.docx)
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[46px] text-center font-mono text-neutral-600 dark:text-neutral-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="ml-1 rounded-md px-2 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            100%
          </button>
        </div>
      </div>

      {/* Document body */}
      <div className="relative flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950/70">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100/80 text-sm text-neutral-600 dark:bg-neutral-950/80 dark:text-neutral-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Renderizando {name}...
          </div>
        )}

        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-500">
            {error}
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
            className="docx-host min-h-full w-full transition-transform duration-150"
            ref={containerRef}
          />
        )}
      </div>
    </div>
  );
}
