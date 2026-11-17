"use client";

import React, { useState } from "react";
import { Lock, X } from "lucide-react";

interface PinModalProps {
  open: boolean;
  usingDefaultPin: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export default function PinModal({
  open,
  usingDefaultPin,
  onClose,
  onUnlocked,
}: PinModalProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "PIN inválido.");
        setLoading(false);
        return;
      }

      setPin("");
      setLoading(false);
      onUnlocked();
      onClose();
    } catch {
      setError("Erro de conexão ao verificar PIN.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-[#1a1614]/15 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-[#201c19]/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c96726]/10 text-[#c96726] dark:bg-[#d77435]/15 dark:text-[#d77435]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                SEGURANÇA
              </span>
              <h3 className="font-serif text-lg font-normal text-[#1a1614] dark:text-[#fafbf7]">
                Desbloquear Edição
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 dark:text-[#9c968f] dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#736d67] dark:text-[#9c968f]">
          Digite o PIN de administrador para enviar, organizar ou excluir arquivos.
        </p>

        {usingDefaultPin && (
          <p className="mt-2.5 rounded-xl border border-dashed border-[#1a1614]/15 bg-[#f5f6f1] px-3 py-2 font-mono text-[11px] text-[#736d67] dark:border-white/10 dark:bg-[#161311] dark:text-[#9c968f]">
            PIN padrão ativo: <span className="font-bold text-[#c96726] dark:text-[#d77435]">1234</span>{" "}
            (defina <code>ADMIN_PIN</code> no deploy).
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN de acesso..."
            className="w-full rounded-full border border-[#1a1614]/15 bg-[#f5f6f1] px-4 py-2.5 font-mono text-sm text-[#1a1614] outline-none transition focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:focus:border-[#d77435]"
          />

          {error && (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-full bg-[#1a1614] py-2.5 font-mono text-xs font-medium text-[#fafbf7] shadow-xs transition hover:opacity-90 disabled:opacity-50 dark:bg-[#fafbf7] dark:text-[#1a1614]"
          >
            {loading ? "VERIFICANDO..." : "ENTRAR NO MODO EDIÇÃO"}
          </button>
        </form>
      </div>
    </div>
  );
}
