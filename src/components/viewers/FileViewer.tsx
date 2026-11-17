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
}

export default function FileViewer({
  file,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenQr,
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

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      await wrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
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
      className="flex h-full flex-col overflow-hidden bg-white dark:bg-neutral-950"
    >
      {/* Top File Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-35 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              title="Arquivo anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-35 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              title="Próximo arquivo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {file.name}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {file.extension.toUpperCase() || "ARQUIVO"} · {formatBytes(file.size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${
              showTimer
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
            title="Cronômetro de apresentação"
          >
            <Timer className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Tempo</span>
          </button>

          <button
            type="button"
            onClick={onOpenQr}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            title="Gerar QR Code deste arquivo"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">QR</span>
          </button>

          <a
            href={downloadHref}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            title="Baixar arquivo"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Baixar</span>
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
            title="Modo apresentação / Tela cheia (F)"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Apresentar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Viewer */}
      <div className="min-h-0 flex-1">
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
              <Download className="h-3.5 w-3.5" />
              Baixar {file.name}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
