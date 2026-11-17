"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileQuestion,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Timer,
} from "lucide-react";
import { FileItem } from "@/lib/types";
import { formatBytes } from "@/lib/file-utils";
import ImageViewer from "./ImageViewer";
import TextViewer from "./TextViewer";
import MediaViewer from "./MediaViewer";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });
const DocxViewer = dynamic(() => import("./DocxViewer"), { ssr: false });
const PptxViewer = dynamic(() => import("./PptxViewer"), { ssr: false });

interface FileViewerProps {
  file: FileItem;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenQr: () => void;
  onCloseViewer?: () => void;
}

export default function FileViewer({
  file,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenQr,
  onCloseViewer,
}: FileViewerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Subtle presentation timer
  const [showTimer, setShowTimer] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Lock body scroll when in fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);

    try {
      if (nextState) {
        if (wrapperRef.current && wrapperRef.current.requestFullscreen) {
          await wrapperRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // Ignora erro em navegadores mobile que não suportam requestFullscreen em divs
    }
  };

  useEffect(() => {
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
      if (e.key.toLowerCase() === "f") {
        void toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(seconds % 60).padStart(2, "0")}`;

  const downloadHref = file.url.startsWith("/api/files/")
    ? `${file.url}?download=1`
    : file.url;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col bg-white dark:bg-neutral-950 ${
        isFullscreen
          ? "fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden"
          : "relative h-full overflow-hidden"
      }`}
    >
      {/* Top File Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2 sm:px-4 sm:py-2.5 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Main Navigation Arrows (Enlarged & accessible for mobile + desktop) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-xs transition hover:bg-neutral-100 disabled:opacity-30 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              title="Arquivo anterior (←)"
              aria-label="Arquivo anterior"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-xs transition hover:bg-neutral-100 disabled:opacity-30 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              title="Próximo arquivo (→)"
              aria-label="Próximo arquivo"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {file.name}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400">
              {file.extension.toUpperCase() || "ARQUIVO"} · {formatBytes(file.size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Timer widget */}
          {showTimer && (
            <div className="mr-1 flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-mono dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-neutral-800 dark:text-neutral-200">
                {formattedTime}
              </span>
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="rounded p-0.5 text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title={timerRunning ? "Pausar" : "Iniciar"}
              >
                {timerRunning ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setSeconds(0);
                }}
                className="rounded p-0.5 text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="Zerar cronômetro"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowTimer((t) => !t)}
            className={`inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg px-2 sm:px-2.5 text-xs font-medium transition ${
              showTimer
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
            title="Cronômetro de apresentação"
          >
            <Timer className="h-4 w-4" />
            <span className="hidden md:inline">Tempo</span>
          </button>

          <button
            type="button"
            onClick={onOpenQr}
            className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-2 sm:px-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            title="Gerar QR Code deste arquivo"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR</span>
          </button>

          <a
            href={downloadHref}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-2 sm:px-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            title="Baixar arquivo"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Baixar</span>
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border px-2 sm:px-3 text-xs font-medium transition ${
              isFullscreen
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-neutral-200 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
            }`}
            title="Modo apresentação / Tela cheia (F)"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="font-medium">Sair</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Apresentar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Viewer Body with Floating Side Arrows */}
      <div className="relative min-h-0 flex-1">
        {/* Floating Left Arrow (Fast click on mobile / desktop edges) */}
        {hasPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="group absolute left-2 sm:left-4 top-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/85 text-neutral-700 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white active:scale-95 dark:border-neutral-800/80 dark:bg-neutral-900/85 dark:text-neutral-200 dark:hover:bg-neutral-900"
            title="Arquivo anterior"
            aria-label="Arquivo anterior"
          >
            <ChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}

        {/* Floating Right Arrow (Fast click on mobile / desktop edges) */}
        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            className="group absolute right-2 sm:right-4 top-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/85 text-neutral-700 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white active:scale-95 dark:border-neutral-800/80 dark:bg-neutral-900/85 dark:text-neutral-200 dark:hover:bg-neutral-900"
            title="Próximo arquivo"
            aria-label="Próximo arquivo"
          >
            <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {file.category === "image" && (
          <ImageViewer url={file.url} name={file.name} />
        )}
        {file.category === "pdf" && (
          <PdfViewer url={file.url} name={file.name} />
        )}
        {file.category === "docx" && (
          <DocxViewer url={file.url} name={file.name} />
        )}
        {file.category === "pptx" && (
          <PptxViewer url={file.url} name={file.name} />
        )}
        {file.category === "text" && (
          <TextViewer url={file.url} name={file.name} />
        )}
        {(file.category === "video" || file.category === "audio") && (
          <MediaViewer
            url={file.url}
            name={file.name}
            category={file.category}
          />
        )}
        {file.category === "other" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
              <FileQuestion className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Pré-visualização indisponível para .{file.extension || "arquivo"}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Você pode baixar o arquivo diretamente para abri-lo no seu dispositivo.
              </p>
            </div>
            <a
              href={downloadHref}
              download={file.name}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Download className="h-4 w-4" />
              Baixar {file.name}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
