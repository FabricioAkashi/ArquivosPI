"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";

interface ImageViewerProps {
  url: string;
  name: string;
}

export default function ImageViewer({ url, name }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [darkBackdrop, setDarkBackdrop] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const reset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 text-xs dark:border-neutral-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
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
            onClick={zoomIn}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={reset}
            className="ml-1 rounded-md px-2 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Ajustar
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="Girar 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Girar</span>
          </button>
          <button
            type="button"
            onClick={() => setDarkBackdrop((d) => !d)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${
              darkBackdrop
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
            title="Fundo de contraste"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Contraste</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className={`flex flex-1 items-center justify-center overflow-auto p-4 sm:p-8 transition-colors ${
          darkBackdrop
            ? "bg-neutral-950"
            : "bg-neutral-50 dark:bg-neutral-950/60"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
          }}
          className="max-h-full max-w-full rounded-sm object-contain shadow-sm transition-transform duration-150"
        />
      </div>
    </div>
  );
}
