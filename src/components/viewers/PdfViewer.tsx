"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileText,
} from "lucide-react";

interface PdfViewerProps {
  url: string;
  name: string;
}

type PdfDocumentProxy = {
  numPages: number;
  getPage: (num: number) => Promise<{
    getViewport: (opts: { scale: number }) => {
      width: number;
      height: number;
    };
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: unknown;
      transform?: number[];
    }) => { promise: Promise<void>; cancel?: () => void };
  }>;
  destroy?: () => Promise<void>;
};

export default function PdfViewer({ url, name }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeMode, setNativeMode] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPageNumber(1);
    setNumPages(0);

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({
          url,
          withCredentials: false,
        });
        const doc = (await loadingTask.promise) as unknown as PdfDocumentProxy;

        if (!active) {
          await doc.destroy?.();
          return;
        }

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (active) {
          console.error("PDF load error:", err);
          setError("Não foi possível carregar o PDF.");
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      active = false;
      renderTaskRef.current?.cancel?.();
      pdfDocRef.current?.destroy?.();
      pdfDocRef.current = null;
    };
  }, [url]);

  const renderPage = useCallback(async () => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!doc || !canvas || !container || loading || nativeMode) return;

    try {
      renderTaskRef.current?.cancel?.();
      setRendering(true);

      const page = await doc.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(container.clientWidth - 20, 260);
      const fitScale = Math.min(availableWidth / unscaledViewport.width, 2.2);
      const scale = fitScale * zoom;
      const viewport = page.getViewport({ scale });

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const task = page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== "RenderingCancelledException") {
        console.error("PDF render page error:", err);
      }
    } finally {
      setRendering(false);
    }
  }, [pageNumber, zoom, loading, nativeMode]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  useEffect(() => {
    const onResize = () => {
      renderPage();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  useEffect(() => {
    if (nativeMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setPageNumber((p) => Math.min(numPages || 1, p + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setPageNumber((p) => Math.max(1, p - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [numPages, nativeMode]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 text-xs dark:border-neutral-800">
        {!nativeMode ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-xs transition hover:bg-neutral-100 disabled:opacity-35 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              title="Página anterior (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[68px] text-center font-mono text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {numPages > 0 ? `${pageNumber} / ${numPages}` : "—"}
            </span>
            <button
              type="button"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-xs transition hover:bg-neutral-100 disabled:opacity-35 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              title="Próxima página (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="mx-1.5 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[44px] text-center font-mono text-neutral-500 dark:text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded-md px-2 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Ajustar
            </button>
          </div>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">
            Visualizador nativo do navegador
          </span>
        )}

        <button
          type="button"
          onClick={() => setNativeMode((m) => !m)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          title="Alternar entre renderização integrada e visualizador nativo"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{nativeMode ? "Modo integrado" : "Modo nativo"}</span>
        </button>
      </div>

      {/* Viewport */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-start justify-center overflow-auto bg-neutral-100 p-4 dark:bg-neutral-950/70"
      >
        {nativeMode ? (
          <iframe
            src={url}
            title={name}
            className="h-full min-h-[70vh] w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
          />
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando PDF...
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-red-500">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setNativeMode(true)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Tentar visualizador nativo
            </button>
          </div>
        ) : (
          <div className="relative my-auto flex flex-col items-center">
            {rendering && (
              <div className="absolute right-2 top-2 rounded-full bg-neutral-900/70 p-1.5 text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="rounded-sm bg-white shadow-md ring-1 ring-neutral-200 dark:ring-neutral-800"
            />
          </div>
        )}
      </div>
    </div>
  );
}
