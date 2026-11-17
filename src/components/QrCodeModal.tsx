"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Folder as FolderIcon,
  Globe,
  Layers,
  Lock,
  Search,
  X,
} from "lucide-react";
import { FileItem, Folder, Semester } from "@/lib/types";

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  semesters: Semester[];
  folders: Folder[];
  activeSemester: Semester | null;
  activeFolder: Folder | null;
  file: FileItem | null;
  initialScope?: "all" | "semester" | "folder" | "file";
}

interface ScopeOption {
  id: string;
  type: "all" | "semester" | "folder" | "file";
  label: string;
  subtitle: string;
  semesterId?: string;
  folderId?: string;
  fileId?: string;
}

export default function QrCodeModal({
  open,
  onClose,
  semesters,
  folders,
  activeSemester,
  activeFolder,
  file,
  initialScope,
}: QrCodeModalProps) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  // Monta a lista completa de opções de escopo
  const allOptions: ScopeOption[] = useMemo(() => {
    const list: ScopeOption[] = [
      {
        id: "all",
        type: "all",
        label: "Acesso Total (Todo o Acervo)",
        subtitle: "Permite navegar livremente por todos os semestres e pastas",
      },
    ];

    // Semestres
    for (const sem of semesters) {
      list.push({
        id: `sem:${sem.id}`,
        type: "semester",
        label: `Semestre ${sem.name}`,
        subtitle: sem.title ? `${sem.title} (Apenas este semestre)` : "Apenas este semestre",
        semesterId: sem.id,
      });
    }

    // Pastas
    for (const fld of folders) {
      const parentSem = semesters.find((s) => s.id === fld.semesterId);
      const semPrefix = parentSem ? `${parentSem.name} › ` : "";
      list.push({
        id: `fld:${fld.id}`,
        type: "folder",
        label: `Pasta: ${fld.name}`,
        subtitle: `${semPrefix}Acesso exclusivo a esta pasta`,
        semesterId: fld.semesterId,
        folderId: fld.id,
      });
    }

    // Arquivo selecionado (se houver)
    if (file) {
      list.push({
        id: `file:${file.id}`,
        type: "file",
        label: `Arquivo: ${file.name}`,
        subtitle: "Abre diretamente este documento no visualizador",
        semesterId: file.semesterId,
        folderId: file.folderId || undefined,
        fileId: file.id,
      });
    }

    return list;
  }, [semesters, folders, file]);

  // Define a opção inicial padrão baseada no contexto atual do usuário
  const defaultOption = useMemo<ScopeOption>(() => {
    if (initialScope === "file" && file) {
      const opt = allOptions.find((o) => o.id === `file:${file.id}`);
      if (opt) return opt;
    }
    if (activeFolder) {
      const opt = allOptions.find((o) => o.id === `fld:${activeFolder.id}`);
      if (opt) return opt;
    }
    if (activeSemester) {
      const opt = allOptions.find((o) => o.id === `sem:${activeSemester.id}`);
      if (opt) return opt;
    }
    return allOptions[0];
  }, [allOptions, initialScope, file, activeFolder, activeSemester]);

  const [selectedOption, setSelectedOption] = useState<ScopeOption>(defaultOption);

  useEffect(() => {
    if (open) {
      setSelectedOption(defaultOption);
      setSearchQuery("");
      setDropdownOpen(false);
    }
  }, [open, defaultOption]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [open]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtra as opções de acordo com o que o usuário digita
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return allOptions;
    const q = searchQuery.toLowerCase();
    return allOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.subtitle.toLowerCase().includes(q)
    );
  }, [allOptions, searchQuery]);

  if (!open) return null;

  // Constrói a URL de acordo com o escopo selecionado
  const cleanOrigin = origin.replace(/\/+$/, "");
  let targetUrl = `${cleanOrigin}/`;
  const params = new URLSearchParams();

  if (selectedOption.type === "semester" && selectedOption.semesterId) {
    params.set("s", selectedOption.semesterId);
    params.set("scope", "semester");
  } else if (selectedOption.type === "folder" && selectedOption.semesterId && selectedOption.folderId) {
    params.set("s", selectedOption.semesterId);
    params.set("d", selectedOption.folderId);
    params.set("scope", "folder");
  } else if (selectedOption.type === "file" && selectedOption.fileId) {
    if (selectedOption.semesterId) params.set("s", selectedOption.semesterId);
    if (selectedOption.folderId) params.set("d", selectedOption.folderId);
    params.set("f", selectedOption.fileId);
    params.set("scope", "file");
  }

  const query = params.toString();
  if (query) {
    targetUrl = `${cleanOrigin}/?${query}`;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    ctx.font = "600 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    const label = selectedOption.label;
    const truncated = label.length > 36 ? `${label.slice(0, 33)}...` : label;
    ctx.fillText(
      truncated,
      exportCanvas.width / 2,
      sourceCanvas.height + padding + 26
    );

    const link = document.createElement("a");
    link.download = `qrcode-${selectedOption.type}-${selectedOption.id.replace(/[^a-zA-Z0-9_-]/g, "")}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#1a1614]/15 bg-white/95 p-5 sm:p-6 shadow-2xl backdrop-blur-md transition-all dark:border-white/15 dark:bg-[#201c19]/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-dashed border-[#1a1614]/15 pb-3 dark:border-white/10">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
              COMPARTILHAMENTO
            </span>
            <h3 className="font-serif text-lg font-normal text-[#1a1614] dark:text-[#fafbf7]">
              Compartilhar Acesso com QR Code
            </h3>
            <p className="text-[11px] text-[#736d67] dark:text-[#9c968f]">
              Defina se o visitante terá acesso a todo o acervo ou apenas a uma pasta específica.
            </p>
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

        {/* Seletor de Escopo com Dropdown Pesquisável */}
        <div className="mt-4" ref={dropdownRef}>
          <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
            Escopo do Acesso (O que o visitante verá)
          </label>

          <div className="relative mt-1.5">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-2.5 text-left text-xs transition hover:border-[#1a1614]/30 dark:border-white/15 dark:bg-[#161311] dark:hover:border-white/30"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedOption.type === "all" ? (
                  <Globe className="h-4 w-4 shrink-0 text-sky-500" />
                ) : selectedOption.type === "semester" ? (
                  <Layers className="h-4 w-4 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                ) : selectedOption.type === "folder" ? (
                  <FolderIcon className="h-4 w-4 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#1a1614] dark:text-[#fafbf7]">
                    {selectedOption.label}
                  </p>
                  <p className="truncate font-mono text-[10px] text-[#736d67] dark:text-[#9c968f]">
                    {selectedOption.subtitle}
                  </p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#736d67] dark:text-[#9c968f]" />
            </button>

            {/* Menu Dropdown com Campo de Busca e Sugestões */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-hidden rounded-2xl border border-[#1a1614]/15 bg-white shadow-xl dark:border-white/15 dark:bg-[#201c19]">
                {/* Campo de pesquisa dentro do dropdown */}
                <div className="flex items-center gap-2 border-b border-[#1a1614]/10 bg-[#f5f6f1] px-3 py-2 dark:border-white/10 dark:bg-[#161311]">
                  <Search className="h-3.5 w-3.5 text-[#736d67] dark:text-[#9c968f]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite para filtrar pastas ou semestres..."
                    className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-[#736d67]/60 dark:text-[#fafbf7] dark:placeholder:text-[#9c968f]/60"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Lista de Sugestões */}
                <div className="max-h-52 overflow-y-auto p-1 text-xs divide-y divide-[#1a1614]/8 dark:divide-white/8">
                  {filteredOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-neutral-400">
                      Nenhuma pasta ou semestre corresponde a &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = opt.id === selectedOption.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedOption(opt);
                            setDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                            isSelected
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          }`}
                        >
                          {opt.type === "all" ? (
                            <Globe className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-neutral-900" : "text-sky-500"}`} />
                          ) : opt.type === "semester" ? (
                            <Layers className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-neutral-900" : "text-amber-500"}`} />
                          ) : opt.type === "folder" ? (
                            <FolderIcon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-neutral-900" : "text-amber-600 dark:text-amber-400"}`} />
                          ) : (
                            <FileText className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-neutral-900" : "text-blue-500"}`} />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{opt.label}</p>
                            <p className={`truncate text-[10px] ${isSelected ? "opacity-80" : "text-neutral-400"}`}>
                              {opt.subtitle}
                            </p>
                          </div>
                          {isSelected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Aviso de Proteção de Escopo */}
          {selectedOption.type !== "all" && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Acesso restrito:</strong> O visitante só poderá visualizar arquivos desta pasta. O restante do acervo ficará oculto.
              </span>
            </div>
          )}
        </div>

        {/* Área do QR Code com Borda e Sombra */}
        <div className="mt-4 flex flex-col items-center">
          <div
            ref={qrWrapRef}
            className="flex items-center justify-center rounded-2xl border border-[#1a1614]/15 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-white"
          >
            <QRCodeCanvas
              value={targetUrl}
              size={190}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1a1614"
            />
          </div>

          <p className="mt-2.5 text-center font-mono text-xs font-semibold text-[#1a1614] dark:text-[#fafbf7]">
            {selectedOption.label}
          </p>
        </div>

        {/* Link e Ações */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-[#f5f6f1] px-3.5 py-1.5 text-xs text-[#1a1614] dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7]">
            <span className="truncate flex-1 font-mono text-[11px] text-[#736d67] dark:text-[#9c968f]">
              {targetUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-full bg-[#1a1614] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#fafbf7] transition hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>COPIADO</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>COPIAR</span>
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#1a1614]/15 bg-white py-2 font-mono text-xs font-semibold text-[#1a1614] shadow-2xs transition hover:bg-black/5 dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7] dark:hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
              <span>BAIXAR PNG</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#1a1614] px-5 py-2 font-mono text-xs font-semibold text-[#fafbf7] shadow-xs transition hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
            >
              CONCLUÍDO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
