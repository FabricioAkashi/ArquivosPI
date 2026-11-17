"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Presentation,
} from "lucide-react";

interface PptxViewerProps {
  url: string;
  name: string;
}

export default function PptxViewer({ url, name }: PptxViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<{
    nextSlide: () => Promise<unknown>;
    previousSlide: () => Promise<unknown>;
    goToSlide: (idx: number) => Promise<unknown>;
    getSlideCount: () => number;
    getCurrentSlideIndex: () => number;
    destroy: () => void;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [officeMode, setOfficeMode] = useState(false);
  const [canUseOfficeOnline, setCanUseOfficeOnline] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.");
      setCanUseOfficeOnline(!isLocal && window.location.protocol === "https:");
      setAbsoluteUrl(
        url.startsWith("http") ? url : `${window.location.origin}${url}`
      );
    }
  }, [url]);

  useEffect(() => {
    if (officeMode) return;
    let active = true;
    setLoading(true);
    setError(null);
    setSlideIndex(0);
    setSlideCount(0);

    async function loadPptx() {
      try {
        const [{ default: JSZip }, { PPTXViewer }] = await Promise.all([
          import("jszip"),
          import("pptxviewjs"),
        ]);

        if (typeof window !== "undefined") {
          (window as unknown as { JSZip: unknown }).JSZip = JSZip;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Falha ao baixar apresentação PPTX.");
        const buffer = await res.arrayBuffer();

        if (!active || !canvasRef.current) return;

        const viewer = new PPTXViewer({
          canvas: canvasRef.current,
          slideSizeMode: "fit",
        });

        await viewer.loadFile(buffer);
        await viewer.render(canvasRef.current);

        if (!active) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;
        setSlideCount(viewer.getSlideCount());
        setSlideIndex(viewer.getCurrentSlideIndex());
        setLoading(false);
      } catch (err) {
        console.error("PPTX load error:", err);
        if (active) {
          setError(
            "Não foi possível renderizar este PPTX localmente. Se estiver hospedado, experimente o Modo Office Online ou exporte como PDF."
          );
          setLoading(false);
        }
      }
    }

    loadPptx();

    return () => {
      active = false;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [url, officeMode]);

  const goPrev = async () => {
    if (!viewerRef.current || slideIndex <= 0) return;
    await viewerRef.current.previousSlide();
    setSlideIndex(viewerRef.current.getCurrentSlideIndex());
  };

  const goNext = async () => {
    if (!viewerRef.current || slideIndex >= slideCount - 1) return;
    await viewerRef.current.nextSlide();
    setSlideIndex(viewerRef.current.getCurrentSlideIndex());
  };

  useEffect(() => {
    if (officeMode) return;
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
        void goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        void goPrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    absoluteUrl
  )}`;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 text-xs dark:border-neutral-800">
        {!officeMode ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={slideIndex <= 0 || loading}
              onClick={goPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-35 dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Slide anterior (←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[64px] text-center font-mono text-neutral-600 dark:text-neutral-300">
              {slideCount > 0 ? `${slideIndex + 1} / ${slideCount}` : "—"}
            </span>
            <button
              type="button"
              disabled={slideIndex >= slideCount - 1 || loading}
              onClick={goNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-35 dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Próximo slide (→)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">
            Microsoft Office Online Viewer
          </span>
        )}

        {canUseOfficeOnline && (
          <button
            type="button"
            onClick={() => setOfficeMode((m) => !m)}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {officeMode ? (
              <>
                <Presentation className="h-3.5 w-3.5" />
                <span>Visualizador integrado</span>
              </>
            ) : (
              <>
                <Globe className="h-3.5 w-3.5" />
                <span>Modo Office Online</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Slide Area */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-neutral-100 p-4 sm:p-6 dark:bg-neutral-950/70">
        {officeMode ? (
          <iframe
            src={officeEmbedUrl}
            title={name}
            className="h-full min-h-[70vh] w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
          />
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100/80 text-sm text-neutral-600 dark:bg-neutral-950/80 dark:text-neutral-300">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Renderizando slides de {name}...
              </div>
            )}

            {error ? (
              <div className="flex max-w-md flex-col items-center gap-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
                <p>{error}</p>
                {canUseOfficeOnline && (
                  <button
                    type="button"
                    onClick={() => setOfficeMode(true)}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
                  >
                    Abrir com Office Online
                  </button>
                )}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="max-h-full max-w-full rounded-md bg-white shadow-md ring-1 ring-neutral-200 dark:ring-neutral-800"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
