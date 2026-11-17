"use client";

import React from "react";
import { FileCategory } from "@/lib/types";

interface MediaViewerProps {
  url: string;
  name: string;
  category: FileCategory;
}

export default function MediaViewer({ url, name, category }: MediaViewerProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950/60">
      {category === "video" ? (
        <video
          key={url}
          src={url}
          controls
          playsInline
          className="max-h-full max-w-full rounded-lg border border-neutral-200 bg-black shadow-sm dark:border-neutral-800"
        >
          Seu navegador não suporta reprodução de vídeo.
        </video>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {name}
          </p>
          <audio key={url} src={url} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
