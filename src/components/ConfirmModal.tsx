"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import HoldToConfirm from "./arc/HoldToConfirm";

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm?: () => void | Promise<void>;
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isNoticeOnly = !onConfirm;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-[#1a1614]/15 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-[#201c19]/95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                variant === "danger"
                  ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                  : variant === "warning"
                  ? "bg-[#c96726]/10 text-[#c96726] dark:bg-[#d77435]/20 dark:text-[#d77435]"
                  : "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
              }`}
            >
              {variant === "danger" ? (
                <Trash2 className="h-5 w-5" />
              ) : variant === "warning" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg font-normal text-[#1a1614] dark:text-[#fafbf7]">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 dark:text-[#9c968f] dark:hover:bg-white/5"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#736d67] dark:text-[#9c968f]">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          {!isNoticeOnly && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#1a1614]/15 bg-white/80 px-4 py-2 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#161311]/80 dark:text-[#fafbf7] dark:hover:bg-[#161311]"
            >
              {cancelText}
            </button>
          )}

          {variant === "danger" && onConfirm ? (
            <HoldToConfirm
              label={confirmText || "Segure para excluir"}
              confirmedLabel="Excluindo..."
              tone="danger"
              onConfirm={async () => {
                await onConfirm();
                setTimeout(() => onClose(), 450);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (onConfirm) {
                  await onConfirm();
                }
                onClose();
              }}
              className={`rounded-full px-5 py-2 font-mono text-xs font-medium text-white shadow-xs transition ${
                variant === "warning"
                  ? "bg-[#c96726] hover:bg-[#b0581e]"
                  : "bg-[#1a1614] hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
              }`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
