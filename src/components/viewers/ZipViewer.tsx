"use client";

import React, { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  Download,
  Eye,
  FileArchive,
  FileCode2,
  FileText,
  Folder as FolderIcon,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { formatBytes, getExtension, getFileCategory } from "@/lib/file-utils";
import { tokenizeCodeLines, TokenType } from "@/lib/code-formatter";

interface ZipViewerProps {
  url: string;
  name: string;
}

interface ZipEntryInfo {
  path: string;
  fileName: string;
  dir: string;
  extension: string;
  size: number;
  entry: JSZip.JSZipObject;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  plain: "text-[#1a1614] dark:text-[#fafbf7]",
  comment: "text-[#6d8352] dark:text-[#7f9564] italic",
  string: "text-emerald-700 dark:text-emerald-400",
  number: "text-purple-700 dark:text-purple-400",
  keyword: "text-[#c96726] dark:text-[#d77435] font-medium",
  type: "text-blue-700 dark:text-sky-400",
  property: "text-teal-700 dark:text-teal-300",
  function: "text-amber-700 dark:text-amber-300",
  tag: "text-rose-700 dark:text-rose-400 font-medium",
  punctuation: "text-[#736d67] dark:text-[#9c968f]",
};

export default function ZipViewer({ url, name }: ZipViewerProps) {
  const [entries, setEntries] = useState<ZipEntryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [previewEntry, setPreviewEntry] = useState<{
    info: ZipEntryInfo;
    text?: string;
    imageUrl?: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPreviewEntry(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar o pacote ZIP.");
        return res.arrayBuffer();
      })
      .then(async (buf) => {
        const zip = await JSZip.loadAsync(buf);
        if (!active) return;

        const list: ZipEntryInfo[] = [];
        zip.forEach((relativePath, zipObj) => {
          if (zipObj.dir) return;
          const parts = relativePath.split("/");
          const fileName = parts.pop() || relativePath;
          const dir = parts.join("/");
          // JSZip guarda tamanho descomprimido em _data quando disponível
          const internalData = (zipObj as unknown as { _data?: { uncompressedSize?: number } })._data;
          list.push({
            path: relativePath,
            fileName,
            dir,
            extension: getExtension(fileName),
            size: internalData?.uncompressedSize || 0,
            entry: zipObj,
          });
        });

        list.sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
        setEntries(list);
        setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Não foi possível abrir o ZIP.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    return () => {
      if (previewEntry?.imageUrl) {
        URL.revokeObjectURL(previewEntry.imageUrl);
      }
    };
  }, [previewEntry]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.path.toLowerCase().includes(q));
  }, [entries, search]);

  const handleDownloadInner = async (info: ZipEntryInfo) => {
    const blob = await info.entry.async("blob");
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = info.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handlePreviewInner = async (info: ZipEntryInfo) => {
    const cat = getFileCategory(info.fileName);
    if (cat !== "text" && cat !== "image") return;

    setLoadingPreview(true);
    try {
      if (cat === "image") {
        const blob = await info.entry.async("blob");
        const imageUrl = URL.createObjectURL(blob);
        setPreviewEntry({ info, imageUrl });
      } else {
        const text = await info.entry.async("string");
        setPreviewEntry({ info, text });
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#c96726]" />
        Lendo conteúdo de {name}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-rose-600 dark:text-rose-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {/* Cabeçalho e Busca dentro do ZIP */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a1614]/12 bg-white/85 px-4 py-3 backdrop-blur-xs dark:border-white/10 dark:bg-[#1b1815]/85">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c96726]/10 text-[#c96726] dark:bg-[#d77435]/15 dark:text-[#d77435]">
              <FileArchive className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                EXPLORADOR DE PACOTE ZIP
              </span>
              <p className="font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
                {entries.length} {entries.length === 1 ? "arquivo empacotado" : "arquivos empacotados"}
              </p>
            </div>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#736d67] dark:text-[#9c968f]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar caminho no ZIP..."
              className="w-full rounded-full border border-[#1a1614]/15 bg-[#f5f6f1] py-1.5 pr-3 pl-8 font-mono text-xs text-[#1a1614] outline-none transition focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:focus:border-[#d77435]"
            />
          </div>
        </div>

        {/* Preview inline de arquivo selecionado dentro do ZIP */}
        {previewEntry && (
          <div className="overflow-hidden rounded-2xl border border-[#c96726]/30 bg-white/95 shadow-sm backdrop-blur-xs dark:border-[#d77435]/30 dark:bg-[#1b1815]/95">
            <div className="flex items-center justify-between border-b border-dashed border-[#1a1614]/15 bg-[#f5f6f1]/80 px-4 py-2 dark:border-white/10 dark:bg-[#201c19]/80">
              <span className="truncate font-mono text-xs font-semibold text-[#1a1614] dark:text-[#fafbf7]">
                {previewEntry.info.path}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadInner(previewEntry.info)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#1a1614]/15 bg-white px-2.5 py-1 font-mono text-[10px] font-medium text-[#1a1614] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7]"
                >
                  <Download className="h-3 w-3" />
                  <span>BAIXAR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="rounded-full p-1 text-[#736d67] hover:bg-[#1a1614]/10 dark:text-[#9c968f] dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {previewEntry.imageUrl ? (
              <div className="flex max-h-[380px] items-center justify-center p-4">
                <img
                  src={previewEntry.imageUrl}
                  alt={previewEntry.info.fileName}
                  className="max-h-[340px] max-w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="max-h-[380px] overflow-auto p-4 font-mono text-xs leading-6">
                {tokenizeCodeLines(
                  previewEntry.text || "",
                  previewEntry.info.extension
                ).map((toks, idx) => (
                  <div key={idx} className="whitespace-pre">
                    <span className="mr-4 inline-block w-8 select-none text-right text-[10px] text-[#736d67]/50">
                      {idx + 1}
                    </span>
                    {toks.map((t, tidx) => (
                      <span key={tidx} className={TOKEN_CLASSES[t.type]}>
                        {t.text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loadingPreview && (
          <div className="flex items-center justify-center py-4 font-mono text-xs text-[#736d67]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#c96726]" />
            Extraindo preview...
          </div>
        )}

        {/* Lista de arquivos internos do pacote */}
        <div className="divide-y divide-dashed divide-[#1a1614]/10 overflow-hidden rounded-2xl border border-[#1a1614]/12 bg-white/90 shadow-xs backdrop-blur-xs dark:divide-white/10 dark:border-white/10 dark:bg-[#1b1815]/90">
          {filtered.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
              Nenhum arquivo encontrado neste pacote.
            </div>
          ) : (
            filtered.map((item) => {
              const cat = getFileCategory(item.fileName);
              const canPreview = cat === "text" || cat === "image";

              return (
                <div
                  key={item.path}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-[#1a1614]/[0.03] dark:hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {cat === "image" ? (
                      <ImageIcon className="h-4 w-4 shrink-0 text-sky-500" />
                    ) : cat === "text" ? (
                      <FileCode2 className="h-4 w-4 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-[#736d67]" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium text-[#1a1614] dark:text-[#fafbf7]">
                        {item.fileName}
                      </p>
                      {item.dir && (
                        <p className="flex items-center gap-1 truncate font-mono text-[10px] text-[#736d67] dark:text-[#9c968f]">
                          <FolderIcon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{item.dir}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {item.size > 0 && (
                      <span className="hidden sm:inline font-mono text-[10px] text-[#736d67] dark:text-[#9c968f]">
                        {formatBytes(item.size)}
                      </span>
                    )}
                    {canPreview && (
                      <button
                        type="button"
                        onClick={() => void handlePreviewInner(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#1a1614]/15 bg-[#f5f6f1] px-2.5 py-1 font-mono text-[10px] font-medium text-[#1a1614] transition hover:bg-white dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                        title="Visualizar arquivo interno"
                      >
                        <Eye className="h-3 w-3 text-[#c96726] dark:text-[#d77435]" />
                        <span>VER</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDownloadInner(item)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#1a1614]/15 bg-white px-2.5 py-1 font-mono text-[10px] font-medium text-[#1a1614] transition hover:bg-[#f5f6f1] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7]"
                      title="Extrair e baixar este arquivo"
                    >
                      <Download className="h-3 w-3" />
                      <span className="hidden sm:inline">BAIXAR</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
