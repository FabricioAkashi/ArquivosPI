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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Desbloquear Edição
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Digite o PIN de administrador para enviar, organizar ou excluir arquivos.
        </p>

        {usingDefaultPin && (
          <p className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
            PIN padrão ativo: <span className="font-mono font-semibold">1234</span>{" "}
            (defina <code className="font-mono">ADMIN_PIN</code> no deploy).
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN de acesso"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-400"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-lg bg-neutral-900 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {loading ? "Verificando..." : "Entrar no modo edição"}
          </button>
        </form>
      </div>
    </div>
  );
}
