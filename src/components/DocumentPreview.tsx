"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Play,
  Presentation,
} from "lucide-react";
import { FileItem } from "@/lib/types";

interface DocumentPreviewProps {
  file: FileItem;
  className?: string;
}

function PdfThumbnail({ file }: { file: FileItem }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadThumbnail() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({
          url: file.url,
          withCredentials: false,
        });
        const doc = await loadingTask.promise;
        if (!active) return;

        const page = await doc.getPage(1);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 240;
        const scale = targetWidth / Math.max(unscaledViewport.width, 1);
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        if (active) {
          setRendered(true);
        }
      } catch (err) {
        if (active) {
          setFailed(true);
        }
      }
    }

    loadThumbnail();

    return () => {
      active = false;
    };
  }, [file.url]);

  return (
    <div className="relative flex h-full w-full items-center justify-center p-2">
      {/* Canvas com a primeira página real do PDF */}
      <canvas
        ref={canvasRef}
        className={`max-h-full max-w-full rounded shadow-xs object-contain transition-opacity duration-300 ${
          rendered ? "opacity-100 block" : "opacity-0 hidden"
        }`}
      />

      {/* Mockup estilizado de folha PDF (enquanto carrega ou se falhar) */}
      {(!rendered || failed) && (
        <div className="flex h-full w-4/5 max-w-[140px] flex-col justify-between rounded-md border border-neutral-200 bg-white p-2.5 shadow-xs dark:border-neutral-700/60 dark:bg-neutral-900">
          <div>
            <div className="flex items-center justify-between border-b border-rose-100 pb-1.5 dark:border-rose-950/50">
              <span className="rounded bg-rose-500 px-1 py-0.5 text-[9px] font-bold text-white">
                PDF
              </span>
              <FileText className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="mt-1.5 truncate text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
              {file.name}
            </p>
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-1 w-5/6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-1 w-4/6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-1 w-5/6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-[8px] text-neutral-400">
            <span>Página 1</span>
            <div className="h-1 w-6 rounded bg-rose-200 dark:bg-rose-900/60" />
          </div>
        </div>
      )}
    </div>
  );
}

function DocxThumbnail({ file }: { file: FileItem }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div className="flex h-full w-4/5 max-w-[140px] flex-col justify-between rounded-md border border-blue-200 bg-white p-2.5 shadow-xs dark:border-blue-900/50 dark:bg-neutral-900">
        <div>
          <div className="flex items-center justify-between border-b border-blue-100 pb-1.5 dark:border-blue-950/50">
            <span className="rounded bg-blue-600 px-1 py-0.5 text-[9px] font-bold text-white">
              DOCX
            </span>
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-1.5 truncate text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
            {file.name}
          </p>
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded-full bg-blue-100 dark:bg-blue-950/60" />
            <div className="h-1 w-11/12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-1 w-4/5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-1 w-3/4 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-1 w-5/6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 text-[8px] text-neutral-400">
          <span>Microsoft Word</span>
          <div className="h-1 w-6 rounded bg-blue-200 dark:bg-blue-900/60" />
        </div>
      </div>
    </div>
  );
}

function PptxThumbnail({ file }: { file: FileItem }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div className="flex aspect-16/10 w-full max-w-[160px] flex-col justify-between rounded-md border border-amber-200 bg-white p-2.5 shadow-xs dark:border-amber-900/50 dark:bg-neutral-900">
        <div>
          <div className="flex items-center justify-between border-b border-amber-100 pb-1 dark:border-amber-950/50">
            <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">
              SLIDE
            </span>
            <Presentation className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-1.5 truncate text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
            {file.name}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="h-6 rounded bg-amber-50/80 p-1 dark:bg-amber-950/30">
              <div className="h-1 w-3/4 rounded bg-amber-200 dark:bg-amber-800" />
            </div>
            <div className="h-6 rounded bg-neutral-100 p-1 dark:bg-neutral-800">
              <div className="h-1 w-2/3 rounded bg-neutral-300 dark:bg-neutral-700" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[8px] text-neutral-400">
          <span>Apresentação</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">1 / 1</span>
        </div>
      </div>
    </div>
  );
}

function VideoThumbnail({ file }: { file: FileItem }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-900">
      <video
        src={file.url}
        preload="metadata"
        className="h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur-xs transition group-hover:scale-110">
          <Play className="h-4 w-4 fill-neutral-900 translate-x-0.5" />
        </div>
      </div>
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
        VÍDEO
      </span>
    </div>
  );
}

function AudioThumbnail({ file }: { file: FileItem }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400">
        <Music className="h-5 w-5" />
      </div>

      {/* Visualizador de ondas sonoras estilizado */}
      <div className="mt-3 flex items-center gap-1">
        <span className="h-3 w-1 rounded-full bg-emerald-400 animate-pulse" />
        <span className="h-5 w-1 rounded-full bg-emerald-500" />
        <span className="h-7 w-1 rounded-full bg-emerald-600 animate-pulse" />
        <span className="h-4 w-1 rounded-full bg-emerald-500" />
        <span className="h-6 w-1 rounded-full bg-emerald-400" />
        <span className="h-3 w-1 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <span className="absolute bottom-1.5 right-1.5 rounded bg-emerald-600/80 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
        ÁUDIO
      </span>
    </div>
  );
}

function CodeThumbnail({ file }: { file: FileItem }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div className="flex h-full w-full flex-col justify-between rounded-md border border-neutral-700/60 bg-neutral-950 p-2 text-neutral-300 shadow-xs">
        <div>
          <div className="flex items-center gap-1 border-b border-neutral-800 pb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="ml-1 truncate font-mono text-[9px] text-neutral-400">
              {file.name}
            </span>
          </div>
          <div className="mt-2 space-y-1 font-mono text-[9px]">
            <p className="text-purple-400">
              &lt;<span className="text-sky-400">code</span>&gt;
            </p>
            <p className="pl-2 text-emerald-400">// Projeto Integrador</p>
            <p className="pl-2 text-neutral-400">const PI = true;</p>
            <p className="text-purple-400">
              &lt;/<span className="text-sky-400">code</span>&gt;
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[8px] text-neutral-500">
          <span>{file.extension.toUpperCase()}</span>
          <FileCode2 className="h-3 w-3 text-neutral-400" />
        </div>
      </div>
    </div>
  );
}

function ImageThumbnail({ file }: { file: FileItem }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
        <ImageIcon className="h-8 w-8" />
        <span className="mt-1 text-[10px]">Imagem</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
      <img
        src={file.url}
        alt={file.name}
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}

export default function DocumentPreview({ file, className = "h-full w-full" }: DocumentPreviewProps) {
  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      {file.category === "image" && <ImageThumbnail file={file} />}
      {file.category === "pdf" && <PdfThumbnail file={file} />}
      {file.category === "docx" && <DocxThumbnail file={file} />}
      {file.category === "pptx" && <PptxThumbnail file={file} />}
      {file.category === "video" && <VideoThumbnail file={file} />}
      {file.category === "audio" && <AudioThumbnail file={file} />}
      {file.category === "text" && <CodeThumbnail file={file} />}
      {file.category === "other" &&
        (file.extension.toLowerCase() === "zip" ||
        file.mimeType.toLowerCase().includes("zip") ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#f5f6f1] text-[#c96726] dark:bg-[#1a1614] dark:text-[#d77435]">
            <FileArchive className="h-8 w-8" />
            <span className="mt-1 rounded bg-[#c96726]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
              ZIP ARCHIVE
            </span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
            <FileText className="h-8 w-8" />
            <span className="mt-1 text-[10px] font-mono uppercase">{file.extension}</span>
          </div>
        ))}
    </div>
  );
}
