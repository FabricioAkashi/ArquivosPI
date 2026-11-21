"use client";

import React, { useEffect, useState } from "react";
import { Link2, Plus, Trash2, Users, X } from "lucide-react";
import { Folder, ProjectLink } from "@/lib/types";

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
  const [advisor, setAdvisor] = useState("");
  const [membersText, setMembersText] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [showMeta, setShowMeta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name);
      setAdvisor(editingFolder.advisor || "");
      setMembersText((editingFolder.members || []).join(", "));
      setDescription(editingFolder.description || "");
      setLinks(editingFolder.links || []);
      setShowMeta(
        Boolean(
          editingFolder.advisor ||
            editingFolder.members?.length ||
            editingFolder.description ||
            editingFolder.links?.length
        )
      );
    } else {
      setName("");
      setAdvisor("");
      setMembersText("");
      setDescription("");
      setLinks([]);
      setShowMeta(false);
    }
    setError(null);
  }, [editingFolder, open]);

  if (!open) return null;

  const handleAddLink = () => {
    setLinks((prev) => [...prev, { label: "", url: "https://" }]);
  };

  const handleLinkChange = (
    idx: number,
    field: "label" | "url",
    val: string
  ) => {
    setLinks((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleRemoveLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const parsedMembers = membersText
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const cleanedLinks = links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter(
        (l) =>
          l.label.length > 0 &&
          (l.url.startsWith("https://") || l.url.startsWith("http://"))
      );

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
          advisor: advisor.trim(),
          description: description.trim(),
          members: parsedMembers,
          links: cleanedLinks,
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
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#1a1614]/15 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-[#201c19]/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dashed border-[#1a1614]/15 pb-3 dark:border-white/10">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
              02 / PASTA &amp; PROJETO
            </span>
            <h3 className="font-serif text-lg font-normal text-[#1a1614] dark:text-[#fafbf7]">
              {editingFolder ? "Editar Pasta" : "Nova Pasta"}
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
              placeholder="Ex: Grupo 01 - Smart Campus, Relatórios..."
              className="w-full rounded-2xl border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-2 text-sm text-[#1a1614] outline-none transition focus:border-[#c96726] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:focus:border-[#d77435]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMeta((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#1a1614]/20 px-3 py-1 font-mono text-[11px] font-medium text-[#736d67] transition hover:border-[#c96726]/50 hover:text-[#1a1614] dark:border-white/15 dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
          >
            <Users className="h-3 w-3 text-[#c96726] dark:text-[#d77435]" />
            <span>
              {showMeta
                ? "Ocultar Ficha Técnica do Projeto"
                : "+ Ficha Técnica (Integrantes, Orientador, Links)"}
            </span>
          </button>

          {showMeta && (
            <div className="space-y-3 rounded-2xl border border-dashed border-[#1a1614]/15 bg-[#f5f6f1]/70 p-3.5 dark:border-white/10 dark:bg-[#161311]/70">
              <div>
                <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                  Integrantes do Grupo (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={membersText}
                  onChange={(e) => setMembersText(e.target.value)}
                  placeholder="Ex: Ana Silva, Bruno Costa, Fabrício Akashi"
                  className="w-full rounded-xl border border-[#1a1614]/15 bg-white px-3 py-1.5 text-xs text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                  Professor / Orientador
                </label>
                <input
                  type="text"
                  value={advisor}
                  onChange={(e) => setAdvisor(e.target.value)}
                  placeholder="Ex: Prof. Dr. Marcos Oliveira"
                  className="w-full rounded-xl border border-[#1a1614]/15 bg-white px-3 py-1.5 text-xs text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                  Resumo do Projeto (para a banca)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Breve descrição da proposta, problema resolvido e arquitetura..."
                  className="w-full resize-none rounded-xl border border-[#1a1614]/15 bg-white px-3 py-1.5 text-xs text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                    <Link2 className="h-3 w-3" />
                    <span>Links Externos (GitHub, Figma, Site)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1a1614]/8 px-2 py-0.5 font-mono text-[10px] font-medium text-[#1a1614] hover:bg-[#1a1614]/15 dark:bg-white/10 dark:text-[#fafbf7]"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {links.length > 0 && (
                  <div className="space-y-1.5">
                    {links.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            handleLinkChange(idx, "label", e.target.value)
                          }
                          placeholder="Título (ex: GitHub)"
                          className="w-28 rounded-xl border border-[#1a1614]/15 bg-white px-2.5 py-1 text-xs text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                        />
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) =>
                            handleLinkChange(idx, "url", e.target.value)
                          }
                          placeholder="https://..."
                          className="min-w-0 flex-1 rounded-xl border border-[#1a1614]/15 bg-white px-2.5 py-1 font-mono text-[11px] text-[#1a1614] outline-none focus:border-[#c96726] dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="rounded-full p-1 text-rose-500 hover:bg-rose-500/10"
                          title="Remover link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
