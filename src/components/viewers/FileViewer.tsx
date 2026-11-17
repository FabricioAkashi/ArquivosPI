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
      className={`flex flex-col bg-[#f5f6f1] text-[#1a1614] dark:bg-[#161311] dark:text-[#fafbf7] ${
        isFullscreen
          ? "fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden"
          : "relative h-full overflow-hidden"
      }`}
    >
      {/* Top File Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#1a1614]/10 bg-white/80 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-[#201c19]/80">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Main Navigation Arrows (Enlarged & accessible for mobile + desktop) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              className="inline-flex h-9 w-9 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full border border-[#1a1614]/15 bg-white/70 text-[#1a1614] shadow-2xs transition hover:bg-white disabled:opacity-30 dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
              title="Arquivo anterior (←)"
              aria-label="Arquivo anterior"
            >
              <ChevronLeft className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="inline-flex h-9 w-9 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full border border-[#1a1614]/15 bg-white/70 text-[#1a1614] shadow-2xs transition hover:bg-white disabled:opacity-30 dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
              title="Próximo arquivo (→)"
              aria-label="Próximo arquivo"
            >
              <ChevronRight className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-sans text-xs sm:text-sm font-semibold text-[#1a1614] dark:text-[#fafbf7]">
              {file.name}
            </h2>
            <p className="font-mono text-[10px] sm:text-[11px] text-[#736d67] dark:text-[#9c968f]">
              <span className="font-bold text-[#c96726] dark:text-[#d77435]">{file.extension.toUpperCase() || "ARQUIVO"}</span> · {formatBytes(file.size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Timer widget */}
          {showTimer && (
            <div className="mr-1 flex items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-[#f5f6f1] px-3 py-1 font-mono text-xs dark:border-white/15 dark:bg-[#161311]">
              <span className="font-bold text-[#1a1614] dark:text-[#fafbf7]">
                {formattedTime}
              </span>
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="rounded-full p-0.5 text-[#736d67] hover:bg-[#1a1614]/10 dark:text-[#9c968f] dark:hover:bg-white/10"
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
                className="rounded-full p-0.5 text-[#736d67] hover:bg-[#1a1614]/10 dark:text-[#9c968f] dark:hover:bg-white/10"
                title="Zerar cronômetro"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowTimer((t) => !t)}
            className={`inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-full px-3 font-mono text-xs font-medium transition ${
              showTimer
                ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                : "border border-[#1a1614]/15 bg-white/70 text-[#1a1614] hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
            }`}
            title="Cronômetro de apresentação"
          >
            <Timer className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
            <span className="hidden md:inline">TEMPO</span>
          </button>

          <button
            type="button"
            onClick={onOpenQr}
            className="inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
            title="Gerar QR Code deste arquivo"
          >
            <QrCode className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
            <span className="hidden sm:inline">QR</span>
          </button>

          <a
            href={downloadHref}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
            title="Baixar arquivo"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">BAIXAR</span>
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-full px-3.5 font-mono text-xs font-medium transition shadow-xs ${
              isFullscreen
                ? "bg-[#c96726] text-white dark:bg-[#d77435]"
                : "bg-[#1a1614] text-[#fafbf7] hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
            }`}
            title="Modo apresentação / Tela cheia (F)"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="font-medium">SAIR</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">APRESENTAR</span>
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
            className="group absolute left-2 sm:left-4 top-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#1a1614]/15 bg-white/90 text-[#1a1614] shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white active:scale-95 dark:border-white/15 dark:bg-[#201c19]/90 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
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
            className="group absolute right-2 sm:right-4 top-1/2 z-30 flex h-11 w-11 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#1a1614]/15 bg-white/90 text-[#1a1614] shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white active:scale-95 dark:border-white/15 dark:bg-[#201c19]/90 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
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
