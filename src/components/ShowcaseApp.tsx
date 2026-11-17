"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Lock,
  Music,
  Plus,
  Presentation,
  QrCode,
  Search,
  Trash2,
  Unlock,
  UploadCloud,
} from "lucide-react";
import { upload as blobUpload } from "@vercel/blob/client";
import { FileCategory, FileItem, Semester } from "@/lib/types";
import { formatBytes } from "@/lib/file-utils";
import FileViewer from "./viewers/FileViewer";
import QrCodeModal from "./QrCodeModal";
import PinModal from "./PinModal";
import SemesterModal from "./SemesterModal";
import ThemeToggle from "./ThemeToggle";

interface ShowcaseAppProps {
  initialSemesters: Semester[];
  initialFiles: FileItem[];
  initialSemesterId?: string;
  initialFileId?: string;
  initialAuthenticated: boolean;
  usingDefaultPin: boolean;
  storageMode: "cloud" | "local";
  blobAccess: "private" | "public";
}

function FileCategoryIcon({ category }: { category: FileCategory }) {
  const cls = "h-4 w-4 shrink-0";
  switch (category) {
    case "pdf":
      return <FileText className={`${cls} text-rose-500`} />;
    case "image":
      return <ImageIcon className={`${cls} text-sky-500`} />;
    case "docx":
      return <FileSpreadsheet className={`${cls} text-blue-600 dark:text-blue-400`} />;
    case "pptx":
      return <Presentation className={`${cls} text-amber-500`} />;
    case "video":
      return <Film className={`${cls} text-purple-500`} />;
    case "audio":
      return <Music className={`${cls} text-emerald-500`} />;
    case "text":
      return <FileCode2 className={`${cls} text-neutral-500`} />;
    default:
      return <FileText className={`${cls} text-neutral-400`} />;
  }
}

export default function ShowcaseApp({
  initialSemesters,
  initialFiles,
  initialSemesterId,
  initialFileId,
  initialAuthenticated,
  usingDefaultPin,
  storageMode,
  blobAccess,
}: ShowcaseAppProps) {
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [isAdmin, setIsAdmin] = useState(initialAuthenticated);

  const resolvedInitialSemester =
    semesters.find((s) => s.id === initialSemesterId)?.id ||
    semesters[0]?.id ||
    "";

  const [activeSemesterId, setActiveSemesterId] = useState<string>(
    resolvedInitialSemester
  );

  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => {
    if (initialFileId && initialFiles.some((f) => f.id === initialFileId)) {
      return initialFileId;
    }
    return null;
  });

  // On desktop, auto-select first file if none selected via URL
  const [mobileShowViewer, setMobileShowViewer] = useState<boolean>(
    Boolean(initialFileId)
  );
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals
  const [qrOpen, setQrOpen] = useState(false);
  const [qrScope, setQrScope] = useState<"semester" | "file">("semester");
  const [pinOpen, setPinOpen] = useState(false);
  const [semesterModalOpen, setSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);

  const activeSemester = useMemo(
    () => semesters.find((s) => s.id === activeSemesterId) || null,
    [semesters, activeSemesterId]
  );

  const semesterFiles = useMemo(() => {
    const list = files.filter((f) => f.semesterId === activeSemesterId);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.extension.toLowerCase().includes(q)
    );
  }, [files, activeSemesterId, search]);

  const selectedFile = useMemo(
    () => semesterFiles.find((f) => f.id === selectedFileId) || null,
    [semesterFiles, selectedFileId]
  );

  // Sync URL query params cleanly without page reload
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (activeSemesterId) params.set("s", activeSemesterId);
    if (selectedFileId) params.set("f", selectedFileId);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [activeSemesterId, selectedFileId]);

  // Desktop convenience: if no file is selected on desktop and semester has files, select first
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop && !selectedFileId && semesterFiles.length > 0) {
      setSelectedFileId(semesterFiles[0].id);
    }
  }, [activeSemesterId, semesterFiles, selectedFileId]);

  const handleSelectSemester = (id: string) => {
    setActiveSemesterId(id);
    setSearch("");
    const firstFile = files.find((f) => f.semesterId === id);
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    setSelectedFileId(isDesktop && firstFile ? firstFile.id : null);
    setMobileShowViewer(false);
  };

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setMobileShowViewer(true);
  };

  const selectedIndex = semesterFiles.findIndex((f) => f.id === selectedFileId);

  const handlePrevFile = () => {
    if (selectedIndex > 0) {
      setSelectedFileId(semesterFiles[selectedIndex - 1].id);
    }
  };

  const handleNextFile = () => {
    if (selectedIndex >= 0 && selectedIndex < semesterFiles.length - 1) {
      setSelectedFileId(semesterFiles[selectedIndex + 1].id);
    }
  };

  const uploadSingleFile = useCallback(
    async (rawFile: File) => {
      if (!activeSemesterId) {
        throw new Error("Crie ou selecione um semestre primeiro.");
      }

      if (storageMode === "cloud") {
        const safeName = rawFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `uploads/${activeSemesterId}/${Date.now()}-${safeName}`;

        try {
          const blob = await blobUpload(pathname, rawFile, {
            access: blobAccess,
            handleUploadUrl: "/api/blob-upload",
          });

          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              semesterId: activeSemesterId,
              name: rawFile.name,
              mimeType: rawFile.type,
              size: rawFile.size,
              url: blob.url,
            }),
          });

          const data = (await res.json()) as { file?: FileItem; error?: string };
          if (!res.ok || !data.file) {
            throw new Error(data.error || "Erro ao registrar arquivo.");
          }
          return data.file;
        } catch (clientErr) {
          console.warn("Client blob upload failed, falling back to server upload:", clientErr);
          // Fallback automático para upload via servidor
          const formData = new FormData();
          formData.append("file", rawFile);
          formData.append("semesterId", activeSemesterId);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = (await res.json()) as { file?: FileItem; error?: string };
          if (!res.ok || !data.file) {
            throw new Error(data.error || `Erro ao enviar ${rawFile.name}`);
          }
          return data.file;
        }
      }

      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("semesterId", activeSemesterId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { file?: FileItem; error?: string };
      if (!res.ok || !data.file) {
        throw new Error(data.error || `Erro ao enviar ${rawFile.name}`);
      }
      return data.file;
    },
    [activeSemesterId, storageMode]
  );

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const items = Array.from(fileList);
      if (items.length === 0) return;

      if (!isAdmin) {
        setPinOpen(true);
        return;
      }

      setUploadError(null);
      setUploadingCount((c) => c + items.length);

      let lastUploaded: FileItem | null = null;
      for (const item of items) {
        try {
          const saved = await uploadSingleFile(item);
          setFiles((prev) => [saved, ...prev]);
          lastUploaded = saved;
        } catch (err) {
          setUploadError(
            err instanceof Error ? err.message : "Erro ao enviar arquivo."
          );
        } finally {
          setUploadingCount((c) => Math.max(0, c - 1));
        }
      }

      if (lastUploaded) {
        setSelectedFileId(lastUploaded.id);
      }
    },
    [isAdmin, uploadSingleFile]
  );

  const handleDeleteFile = async (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    if (!window.confirm(`Remover "${file.name}"?`)) return;

    const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (selectedFileId === file.id) {
        setSelectedFileId(null);
        setMobileShowViewer(false);
      }
    }
  };

  const handleDeleteSemester = async (sem: Semester) => {
    if (
      !window.confirm(
        `Excluir o semestre "${sem.name}" e todos os seus arquivos?`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/semesters/${sem.id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = semesters.filter((s) => s.id !== sem.id);
      setSemesters(remaining);
      setFiles((prev) => prev.filter((f) => f.semesterId !== sem.id));
      if (activeSemesterId === sem.id) {
        const nextId = remaining[0]?.id || "";
        setActiveSemesterId(nextId);
        setSelectedFileId(null);
      }
    }
  };

  const handleLockToggle = async () => {
    if (isAdmin) {
      await fetch("/api/auth", { method: "DELETE" });
      setIsAdmin(false);
    } else {
      setPinOpen(true);
    }
  };

  // Global drag and drop when in Edit Mode
  const onDragEnter = (e: React.DragEvent) => {
    if (!isAdmin || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!isAdmin || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      void handleUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Fullscreen Drag Overlay */}
      {isDragging && isAdmin && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/70 bg-neutral-900/90 px-10 py-8 text-white shadow-2xl">
            <UploadCloud className="h-9 w-9" />
            <p className="text-sm font-medium">
              Solte os arquivos para enviar para {activeSemester?.name}
            </p>
            <p className="text-xs text-neutral-300">
              PDF, Imagens, DOCX, PPTX, Vídeos e mais
            </p>
          </div>
        </div>
      )}

      {/* Minimalist Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-3">
          {mobileShowViewer && selectedFile ? (
            <button
              type="button"
              onClick={() => setMobileShowViewer(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 lg:hidden dark:border-neutral-800 dark:text-neutral-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Arquivos</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
                PI
              </div>
              <span className="text-sm font-semibold tracking-tight">
                Acervo PI
              </span>
            </div>
          )}

          {activeSemester && (
            <div className="hidden items-center gap-2 border-l border-neutral-200 pl-3 text-xs sm:flex dark:border-neutral-800">
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                {activeSemester.name}
              </span>
              <span className="truncate text-neutral-500 dark:text-neutral-400">
                {activeSemester.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setQrScope("semester");
              setQrOpen(true);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            title="Gerar QR Code para compartilhar"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          <button
            type="button"
            onClick={handleLockToggle}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
              isAdmin
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
            title={
              isAdmin
                ? "Modo edição ativo (clique para bloquear)"
                : "Desbloquear uploads e edição"
            }
          >
            {isAdmin ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editando</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Gerenciar</span>
              </>
            )}
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Left Sidebar: Semesters + Files */}
        <aside
          className={`${
            mobileShowViewer && selectedFile ? "hidden lg:flex" : "flex"
          } w-full shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/50 lg:w-80 dark:border-neutral-800 dark:bg-neutral-950`}
        >
          {/* Semesters Bar */}
          <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Semestres
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSemester(null);
                    setSemesterModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Plus className="h-3 w-3" />
                  Novo
                </button>
              )}
            </div>

            {semesters.length === 0 ? (
              <p className="py-2 text-xs text-neutral-500">
                Nenhum semestre criado.
              </p>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
                {semesters.map((sem) => {
                  const active = sem.id === activeSemesterId;
                  const count = files.filter((f) => f.semesterId === sem.id).length;
                  return (
                    <div
                      key={sem.id}
                      onClick={() => handleSelectSemester(sem.id)}
                      className={`group flex shrink-0 cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        active
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-900"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold">
                            {sem.name}
                          </span>
                          <span
                            className={`text-[10px] ${
                              active
                                ? "text-neutral-300 dark:text-neutral-600"
                                : "text-neutral-400"
                            }`}
                          >
                            ({count})
                          </span>
                        </div>
                        {sem.title && sem.title !== sem.name && (
                          <p
                            className={`truncate text-[11px] ${
                              active
                                ? "text-neutral-300 dark:text-neutral-600"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {sem.title}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <div
                          className="flex items-center gap-0.5 opacity-80 lg:opacity-0 lg:group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSemester(sem);
                              setSemesterModalOpen(true);
                            }}
                            className={`rounded p-1 ${
                              active
                                ? "hover:bg-white/15 dark:hover:bg-black/10"
                                : "hover:bg-neutral-300/60 dark:hover:bg-neutral-800"
                            }`}
                            title="Editar semestre"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSemester(sem)}
                            className={`rounded p-1 ${
                              active
                                ? "hover:bg-white/15 dark:hover:bg-black/10"
                                : "hover:bg-red-500/15 hover:text-red-600"
                            }`}
                            title="Excluir semestre"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Semester Description on Mobile */}
          {activeSemester?.description && (
            <div className="border-b border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              {activeSemester.description}
            </div>
          )}

          {/* Drag & Drop Upload Box (Admin Only) */}
          {isAdmin && activeSemester && (
            <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    void handleUploadFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 bg-white px-3 py-4 text-center transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/60 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
              >
                {uploadingCount > 0 ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                      Enviando {uploadingCount} arquivo(s)...
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-5 w-5 text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                      Arraste arquivos aqui ou clique
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      PDF, PNG, JPG, DOCX, PPTX...
                    </span>
                  </>
                )}
              </button>
              {uploadError && (
                <p className="mt-2 text-[11px] text-red-500">{uploadError}</p>
              )}
            </div>
          )}

          {/* File List Header + Search */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Arquivos ({semesterFiles.length})
            </span>
          </div>

          {files.filter((f) => f.semesterId === activeSemesterId).length > 4 && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                <Search className="h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar arquivos..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>
          )}

          {/* Files List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {semesterFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <FolderOpen className="h-7 w-7 text-neutral-300 dark:text-neutral-700" />
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {search
                    ? "Nenhum arquivo encontrado."
                    : "Nenhum arquivo neste semestre ainda."}
                </p>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => setPinOpen(true)}
                    className="mt-3 text-[11px] font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                  >
                    Desbloquear para enviar arquivos
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-1">
                {semesterFiles.map((file) => {
                  const selected = file.id === selectedFileId;
                  return (
                    <li key={file.id}>
                      <div
                        onClick={() => handleSelectFile(file.id)}
                        className={`group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-xs transition ${
                          selected
                            ? "bg-white font-medium text-neutral-900 shadow-xs ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800"
                            : "text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-neutral-900/70"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FileCategoryIcon category={file.category} />
                          <div className="min-w-0">
                            <p className="truncate">{file.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              {file.extension.toUpperCase() || "ARQ"} ·{" "}
                              {formatBytes(file.size)}
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFile(e, file)}
                            className="rounded p-1 text-neutral-400 opacity-75 transition hover:bg-red-500/10 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100"
                            title="Excluir arquivo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Right Main Viewer Pane */}
        <main
          className={`${
            mobileShowViewer && selectedFile ? "flex" : "hidden lg:flex"
          } min-w-0 flex-1 flex-col`}
        >
          {selectedFile ? (
            <FileViewer
              key={selectedFile.id}
              file={selectedFile}
              hasPrev={selectedIndex > 0}
              hasNext={
                selectedIndex >= 0 && selectedIndex < semesterFiles.length - 1
              }
              onPrev={handlePrevFile}
              onNext={handleNextFile}
              onOpenQr={() => {
                setQrScope("file");
                setQrOpen(true);
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
                <Presentation className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {activeSemester
                  ? `${activeSemester.name} — ${activeSemester.title}`
                  : "Selecione um semestre"}
              </h2>
              <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                {semesterFiles.length > 0
                  ? "Escolha um arquivo na lista ao lado para visualizar em tela cheia."
                  : "Envie seus PDFs, imagens, DOCX ou PPTX para visualizar e apresentar via navegador ou QR Code."}
              </p>
              {!isAdmin && semesterFiles.length === 0 && (
                <button
                  type="button"
                  onClick={() => setPinOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Desbloquear para enviar arquivos
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        semester={activeSemester}
        file={selectedFile}
        initialScope={qrScope}
      />

      <PinModal
        open={pinOpen}
        usingDefaultPin={usingDefaultPin}
        onClose={() => setPinOpen(false)}
        onUnlocked={() => setIsAdmin(true)}
      />

      <SemesterModal
        open={semesterModalOpen}
        editingSemester={editingSemester}
        onClose={() => setSemesterModalOpen(false)}
        onSaved={(semester, isNew) => {
          if (isNew) {
            setSemesters((prev) => [semester, ...prev]);
            setActiveSemesterId(semester.id);
            setSelectedFileId(null);
          } else {
            setSemesters((prev) =>
              prev.map((s) => (s.id === semester.id ? semester : s))
            );
          }
        }}
      />
    </div>
  );
}
