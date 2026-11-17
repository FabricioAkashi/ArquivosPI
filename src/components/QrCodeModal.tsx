"use client";

import React, { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, X } from "lucide-react";
import { FileItem, Semester } from "@/lib/types";

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  semester: Semester | null;
  file: FileItem | null;
  initialScope?: "semester" | "file";
}

export default function QrCodeModal({
  open,
  onClose,
  semester,
  file,
  initialScope = "semester",
}: QrCodeModalProps) {
  const [scope, setScope] = useState<"semester" | "file">(initialScope);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setScope(initialScope);
  }, [initialScope, open]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [open]);

  if (!open) return null;

  const params = new URLSearchParams();
  if (semester) params.set("s", semester.id);
  if (scope === "file" && file) params.set("f", file.id);

  const query = params.toString();
  const cleanOrigin = origin.replace(/\/+$/, "");
  const targetUrl = `${cleanOrigin}/${query ? `?${query}` : ""}`;

  const label =
    scope === "file" && file
      ? file.name
      : semester
      ? `${semester.name} — ${semester.title}`
      : "Acervo PI";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadPng = () => {
    const sourceCanvas = qrWrapRef.current?.querySelector("canvas");
    if (!sourceCanvas) return;

    const padding = 28;
    const footerHeight = 44;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = sourceCanvas.width + padding * 2;
    exportCanvas.height = sourceCanvas.height + padding * 2 + footerHeight;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(sourceCanvas, padding, padding);

    ctx.fillStyle = "#171717";
    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    const truncated = label.length > 34 ? `${label.slice(0, 31)}...` : label;
    ctx.fillText(
      truncated,
      exportCanvas.width / 2,
      sourceCanvas.height + padding + 28
    );

    const link = document.createElement("a");
    link.download = `qrcode-${semester?.id || "acervo"}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            QR Code de Acesso
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {file && (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 p-1 text-xs dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setScope("semester")}
              className={`rounded-md py-1.5 font-medium transition ${
                scope === "semester"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              Semestre inteiro
            </button>
            <button
              type="button"
              onClick={() => setScope("file")}
              className={`rounded-md py-1.5 font-medium transition ${
                scope === "file"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              Este arquivo
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-col items-center">
          <div
            ref={qrWrapRef}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs"
          >
            <QRCodeCanvas
              value={targetUrl}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#111111"
            />
          </div>
          <p className="mt-2.5 max-w-full truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </p>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-[11px] text-neutral-500 dark:text-neutral-400">
            Domínio / URL base
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-800 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
          />
          <p className="mt-1 truncate font-mono text-[11px] text-neutral-400">
            {targetUrl}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar link</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
