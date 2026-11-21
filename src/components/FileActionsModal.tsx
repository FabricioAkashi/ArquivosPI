"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Edit3, FolderInput, X } from "lucide-react";
import { FileItem, Folder, Semester } from "@/lib/types";

export type FileActionMode = "rename" | "move";

interface FileActionsModalProps {
  open: boolean;
  mode: FileActionMode;
  file: FileItem | null;
  semesters: Semester[];
  folders: Folder[];
  onClose: () => void;
  onUpdated: (updated: FileItem) => void;
}

export default function FileActionsModal({
  open,
  mode,
  file,
  semesters,
  folders,
  onClose,
  onUpdated,
}: FileActionsModalProps) {
  const [name, setName] = useState("");
  const [targetSemesterId, setTargetSemesterId] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file && open) {
      setName(file.name);
      setTargetSemesterId(file.semesterId);
      setTargetFolderId(file.folderId || "");
      setError(null);
    }
  }, [file, open, mode]);

  const semesterFolders = useMemo(() => {
    const filtered = folders.filter((f) => f.semesterId === targetSemesterId);
    const map = new Map<string, Folder>();
    filtered.forEach((f) => map.set(f.id, f));

    const getPathLabel = (fld: Folder): string => {
      const parts = [fld.name];
      let curr = fld;
      while (curr.parentId && map.has(curr.parentId)) {
        curr = map.get(curr.parentId)!;
        parts.unshift(curr.name);
      }
      return parts.join(" / ");
    };

    return filtered
      .map((f) => ({ id: f.id, label: getPathLabel(f) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [folders, targetSemesterId]);

  if (!open || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "rename" && !name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "rename"
          ? { name: name.trim() }
          : {
              semesterId: targetSemesterId,
              folderId: targetFolderId || null,
            };

      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { file?: FileItem; error?: string };
      if (!res.ok || !data.file) {
        setError(data.error || "Não foi possível atualizar o arquivo.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onUpdated(data.file);
      onClose();
    } catch {
      setError("Erro de conexão ao salvar alteração.");
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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c96726]/10 text-[#c96726] dark:bg-[#d77435]/15 dark:text-[#d77435]">
              {mode === "rename" ? (
                <Edit3 className="h-4 w-4" />
              ) : (
                <FolderInput className="h-4 w-4" />
              )}
            </div>
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                ARQUIVO
              </span>
              <h3 className="font-serif text-lg font-normal text-[#1a1614] dark:text-[#fafbf7]">
                {mode === "rename" ? "Renomear Arquivo" : "Mover Arquivo"}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === "rename" ? (
            <div>
              <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                Novo Nome (mantenha a extensão .{file.extension || "ext"})
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-2 font-mono text-xs text-[#1a1614] outline-none transition focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:focus:border-[#d77435]"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                  Semestre de Destino
                </label>
                <select
                  value={targetSemesterId}
                  onChange={(e) => {
                    setTargetSemesterId(e.target.value);
                    setTargetFolderId("");
                  }}
                  className="w-full rounded-2xl border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-2 font-mono text-xs text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7]"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                  Pasta de Destino
                </label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full rounded-2xl border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-2 font-mono text-xs text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7]"
                >
                  <option value="">Raiz do semestre (sem pasta)</option>
                  {semesterFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="font-mono text-xs text-rose-500">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-dashed border-[#1a1614]/15 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#1a1614]/15 bg-white/80 px-4 py-1.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#161311]/80 dark:text-[#fafbf7] dark:hover:bg-[#161311]"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading || (mode === "rename" && !name.trim())}
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
