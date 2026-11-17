"use client";

import React, { useEffect, useRef, useState } from "react";
import { Globe, FileText, Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface DocxViewerProps {
  url: string;
  name: string;
}

function fixDataUrlMime(src: string): string {
  if (!src.startsWith("data:") || src.startsWith("data:image/")) {
    return src;
  }
  const commaIdx = src.indexOf(",");
  if (commaIdx === -1) return src;

  const base64Data = src.slice(commaIdx + 1, commaIdx + 30);
  let mime = "image/png";

  if (base64Data.startsWith("/9j/")) {
    mime = "image/jpeg";
  } else if (base64Data.startsWith("iVBORw")) {
    mime = "image/png";
  } else if (base64Data.startsWith("R0lGOD")) {
    mime = "image/gif";
  } else if (base64Data.startsWith("UklGR")) {
    mime = "image/webp";
  } else if (base64Data.startsWith("PHN2Zy") || base64Data.startsWith("PD94bWw")) {
    mime = "image/svg+xml";
  }

  return `data:${mime};base64,${src.slice(commaIdx + 1)}`;
}

export default function DocxViewer({ url, name }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
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

        // Usamos useBase64URL: false para o browser usar Blob URLs com auto-detecção de MIME
        await docxPreview.renderAsync(buffer, containerRef.current, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: false,
        });

        // Pós-processamento para garantir que qualquer imagem com data URL sem MIME seja corrigida
        if (containerRef.current) {
          const imgs = containerRef.current.querySelectorAll("img");
          imgs.forEach((img) => {
            if (img.src) {
              const fixed = fixDataUrlMime(img.src);
              if (fixed !== img.src) {
                img.src = fixed;
              }
            }
          });
        }

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
  }, [url, officeMode]);

  const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    absoluteUrl
  )}`;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 text-xs dark:border-neutral-800">
        {!officeMode ? (
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
            title="Alternar entre renderização integrada e Office Online"
          >
            {officeMode ? (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>Modo integrado</span>
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

      {/* Document body */}
      <div className="relative flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950/70">
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
                Renderizando {name}...
              </div>
            )}

            {error ? (
              <div className="flex max-w-md flex-col items-center gap-3 p-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
                <p className="text-red-500">{error}</p>
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
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                }}
                className="docx-host min-h-full w-full transition-transform duration-150"
                ref={containerRef}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
