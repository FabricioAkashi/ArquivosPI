"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Sparkles, WrapText } from "lucide-react";
import {
  formatCodeWithPrettier,
  getCodeLanguageInfo,
  tokenizeCodeLines,
  TokenType,
} from "@/lib/code-formatter";

interface TextViewerProps {
  url: string;
  name: string;
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

export default function TextViewer({ url, name }: TextViewerProps) {
  const [rawContent, setRawContent] = useState<string>("");
  const [formattedContent, setFormattedContent] = useState<string | null>(null);
  const [didFormat, setDidFormat] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [usePrettier, setUsePrettier] = useState(true);

  const langInfo = useMemo(() => getCodeLanguageInfo(name), [name]);
  const [wordWrap, setWordWrap] = useState<boolean>(() => !langInfo.isCode);
  const [loading, setLoading] = useState(true);
  const [formatting, setFormatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWordWrap(!langInfo.isCode);
  }, [langInfo.isCode]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setFormattedContent(null);
    setDidFormat(false);
    setFormatError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar o arquivo.");
        return res.text();
      })
      .then(async (text) => {
        if (!active) return;
        setRawContent(text);
        setLoading(false);

        if (langInfo.parser) {
          setFormatting(true);
          const result = await formatCodeWithPrettier(text, name);
          if (!active) return;
          setFormattedContent(result.formatted);
          setDidFormat(result.didFormat);
          setFormatError(result.error || null);
          setFormatting(false);
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
  }, [url, name, langInfo.parser]);

  const activeContent =
    usePrettier && didFormat && formattedContent !== null
      ? formattedContent
      : rawContent;

  const tokenizedLines = useMemo(() => {
    if (!langInfo.isCode && !langInfo.parser) {
      return activeContent
        .split("\n")
        .map((line) => (line ? [{ type: "plain" as TokenType, text: line }] : []));
    }
    return tokenizeCodeLines(activeContent, langInfo.extension);
  }, [activeContent, langInfo]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#c96726]" />
        Carregando {name}...
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
    <div className="flex h-full flex-col bg-transparent">
      {/* Barra Técnica Superior do Visualizador de Código */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[#1a1614]/15 bg-white/75 px-3 sm:px-4 py-2 text-xs backdrop-blur-xs dark:border-white/10 dark:bg-[#201c19]/75">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#6d8352]/12 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#55693e] dark:text-[#8ea573]">
            {langInfo.languageLabel}
          </span>
          <span className="font-mono text-[11px] text-[#736d67] dark:text-[#9c968f]">
            {tokenizedLines.length} {tokenizedLines.length === 1 ? "linha" : "linhas"}
          </span>

          {langInfo.parser && (
            <>
              <span className="text-[#1a1614]/20 dark:text-white/20">·</span>
              {formatting ? (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#736d67] dark:text-[#9c968f]">
                  <Loader2 className="h-3 w-3 animate-spin text-[#c96726]" />
                  Formatando...
                </span>
              ) : didFormat ? (
                <button
                  type="button"
                  onClick={() => setUsePrettier((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium transition ${
                    usePrettier
                      ? "border-[#c96726]/40 bg-[#c96726]/12 text-[#c96726] dark:border-[#d77435]/40 dark:bg-[#d77435]/15 dark:text-[#d77435]"
                      : "border-[#1a1614]/15 bg-white text-[#736d67] hover:text-[#1a1614] dark:border-white/15 dark:bg-[#161311] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
                  }`}
                  title={
                    usePrettier
                      ? "Formatado com Prettier (clique para ver original)"
                      : "Código original (clique para formatar com Prettier)"
                  }
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>{usePrettier ? "PRETTIER" : "ORIGINAL"}</span>
                </button>
              ) : formatError ? (
                <span
                  className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-400"
                  title={formatError}
                >
                  ORIGINAL
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWordWrap((w) => !w)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition ${
              wordWrap
                ? "border-[#1a1614]/20 bg-[#1a1614] text-[#fafbf7] dark:border-white/20 dark:bg-[#fafbf7] dark:text-[#1a1614]"
                : "border-[#1a1614]/15 bg-white/80 text-[#736d67] hover:text-[#1a1614] dark:border-white/15 dark:bg-[#161311]/80 dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
            }`}
            title="Alternar quebra automática de linha"
          >
            <WrapText className="h-3 w-3" />
            <span className="hidden sm:inline">QUEBRA</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/80 px-3 py-1 font-mono text-[11px] font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#161311]/80 dark:text-[#fafbf7] dark:hover:bg-[#161311]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>COPIADO</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
                <span>COPIAR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área do Código com Números de Linha e Realce de Sintaxe */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#1a1614]/12 bg-white/95 shadow-xs backdrop-blur-xs dark:border-white/10 dark:bg-[#1b1815]/95">
          {/* Sub-barra estilo Prettier / Blueprint */}
          <div className="flex items-center justify-between border-b border-dashed border-[#1a1614]/10 bg-[#f5f6f1]/70 px-4 py-2 font-mono text-[10px] text-[#736d67] dark:border-white/10 dark:bg-[#201c19]/80 dark:text-[#9c968f]">
            <span className="truncate font-medium text-[#1a1614] dark:text-[#fafbf7]">
              {name}
            </span>
            <span className="shrink-0">
              {usePrettier && didFormat
                ? "prettier · 2 spaces · 80 cols"
                : "raw view"}
            </span>
          </div>

          <div className="overflow-x-auto py-3">
            <table className="w-full border-collapse font-mono text-xs sm:text-[13px] leading-6">
              <tbody>
                {tokenizedLines.map((tokens, lineIdx) => (
                  <tr
                    key={lineIdx}
                    className="group transition-colors hover:bg-[#c96726]/[0.04] dark:hover:bg-[#d77435]/[0.06]"
                  >
                    <td
                      aria-hidden="true"
                      className="w-10 sm:w-12 select-none border-r border-dashed border-[#1a1614]/10 px-2.5 sm:px-3 text-right align-top text-[11px] text-[#736d67]/50 group-hover:text-[#c96726] dark:border-white/10 dark:text-[#9c968f]/45 dark:group-hover:text-[#d77435]"
                    >
                      {lineIdx + 1}
                    </td>
                    <td
                      className={`px-3 sm:px-4 align-top ${
                        wordWrap
                          ? "whitespace-pre-wrap break-words"
                          : "whitespace-pre"
                      }`}
                    >
                      {tokens.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : (
                        tokens.map((tok, tokIdx) => (
                          <span key={tokIdx} className={TOKEN_CLASSES[tok.type]}>
                            {tok.text}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
