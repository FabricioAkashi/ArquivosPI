"use client";

import React, { useEffect, useState } from "react";
import { FolderPlus, X } from "lucide-react";
import { Folder } from "@/lib/types";

interface FolderModalProps {
  open: boolean;
  semesterId: string;
  parentId?: string | null;
  editingFolder?: Folder | null;
  onClose: () => void;
  onSaved: (folder: Folder, isNew: boolean) => void;
}

export default function FolderModal({
  open,
  semesterId,
  parentId,
  editingFolder,
  onClose,
  onSaved,
}: FolderModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name);
    } else {
      setName("");
    }
    setError(null);
  }, [editingFolder, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const url = editingFolder
        ? `/api/folders/${editingFolder.id}`
        : "/api/folders";
      const method = editingFolder ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterId,
          parentId: parentId || null,
          name: name.trim(),
        }),
      });

      const data = (await res.json()) as { folder?: Folder; error?: string };
      if (!res.ok || !data.folder) {
        setError(data.error || "Não foi possível salvar a pasta.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onSaved(data.folder, !editingFolder);
      onClose();
    } catch {
      setError("Erro de conexão ao salvar pasta.");
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
        <div className="flex items-center justify-between border-b border-dashed border-[#1a1614]/15 pb-3 dark:border-white/10">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
              02 / PASTA
            </span>
            <h3 className="font-serif text-lg font-normal text-[#1a1614] dark:text-[#fafbf7]">
              {editingFolder ? "Renomear Pasta" : "Nova Pasta"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 dark:text-[#9c968f] dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
              Nome da Pasta *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Relatórios, Slides, Documentação..."
              className="w-full rounded-2xl border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-2 text-sm text-[#1a1614] outline-none transition focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:focus:border-[#d77435]"
            />
          </div>

          {error && <p className="font-mono text-xs text-rose-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-[#1a1614]/15 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#1a1614]/15 bg-white/80 px-4 py-1.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#161311]/80 dark:text-[#fafbf7] dark:hover:bg-[#161311]"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-full bg-[#1a1614] px-5 py-1.5 font-mono text-xs font-medium text-[#fafbf7] shadow-xs transition hover:opacity-90 disabled:opacity-50 dark:bg-[#fafbf7] dark:text-[#1a1614]"
            >
              {loading ? "SALVANDO..." : "SALVAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
