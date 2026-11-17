"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

interface TextViewerProps {
  url: string;
  name: string;
}

export default function TextViewer({ url, name }: TextViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar o texto.");
        return res.text();
      })
      .then((text) => {
        if (active) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao abrir arquivo.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando {name}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 text-xs dark:border-neutral-800">
        <span className="font-mono text-neutral-500 dark:text-neutral-400">
          {content.split("\n").length} linhas
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar texto</span>
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-50 p-4 sm:p-6 dark:bg-neutral-950/60">
        <pre className="mx-auto max-w-4xl whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-white p-5 font-mono text-xs sm:text-sm leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
          {content}
        </pre>
      </div>
    </div>
  );
}
