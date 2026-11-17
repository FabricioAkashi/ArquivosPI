"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Edit3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Film,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Presentation,
  QrCode,
  Search,
  Trash2,
  Unlock,
  UploadCloud,
  X,
} from "lucide-react";
import { upload as blobUpload } from "@vercel/blob/client";
import { FileCategory, FileItem, Folder, Semester } from "@/lib/types";
import { formatBytes } from "@/lib/file-utils";
import FileViewer from "./viewers/FileViewer";
import QrCodeModal from "./QrCodeModal";
import PinModal from "./PinModal";
import SemesterModal from "./SemesterModal";
import FolderModal from "./FolderModal";
import ThemeToggle from "./ThemeToggle";
import DocumentPreview from "./DocumentPreview";
import FolderCarousel from "./FolderCarousel";
import ConfirmModal, { ConfirmDialogState } from "./ConfirmModal";

interface ShowcaseAppProps {
  initialSemesters: Semester[];
  initialFolders: Folder[];
  initialFiles: FileItem[];
  initialSemesterId?: string;
  initialFolderId?: string;
  initialFileId?: string;
  initialScope?: "all" | "semester" | "folder" | "file";
  initialAuthenticated: boolean;
  usingDefaultPin: boolean;
  storageMode: "cloud" | "local";
  blobAccess: "private" | "public";
}

function FileCategoryIcon({ category, className = "h-5 w-5" }: { category: FileCategory; className?: string }) {
  const cls = `${className} shrink-0`;
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
  initialFolders,
  initialFiles,
  initialSemesterId,
  initialFolderId,
  initialFileId,
  initialScope,
  initialAuthenticated,
  usingDefaultPin,
  storageMode,
  blobAccess,
}: ShowcaseAppProps) {
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [isAdmin, setIsAdmin] = useState(initialAuthenticated);

  // Controle de Acesso Restrito via Link/QR Code
  const [isLockedScope, setIsLockedScope] = useState<boolean>(() => {
    return initialScope === "folder" || initialScope === "semester";
  });

  // Sidebar recolhida por padrão como solicitado
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navegação no estilo gerenciador de arquivos (Início -> Semestre -> Pasta)
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(() => {
    if (initialSemesterId && initialSemesters.some((s) => s.id === initialSemesterId)) {
      return initialSemesterId;
    }
    if (initialFileId) {
      const match = initialFiles.find((f) => f.id === initialFileId);
      if (match) return match.semesterId;
    }
    return null;
  });

  const [activeFolderId, setActiveFolderId] = useState<string | null>(() => {
    if (initialFolderId && initialFolders.some((f) => f.id === initialFolderId)) {
      return initialFolderId;
    }
    if (initialFileId) {
      const match = initialFiles.find((f) => f.id === initialFileId);
      if (match?.folderId) return match.folderId;
    }
    return null;
  });

  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialFileId || null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modais
  const [qrOpen, setQrOpen] = useState(false);
  const [qrScope, setQrScope] = useState<"all" | "semester" | "folder" | "file">("all");
  const [pinOpen, setPinOpen] = useState(false);
  const [semesterModalOpen, setSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Popup de confirmação customizado (substitui window.confirm e alert)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    variant: "danger",
  });

  const showConfirm = ({
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm,
    });
  };

  const showAlert = (title: string, message: string, variant: "warning" | "info" = "warning") => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmText: "Entendi",
      variant,
      onConfirm: undefined,
    });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);

  // Sincronização limpa de URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (activeSemesterId) params.set("s", activeSemesterId);
    if (activeFolderId) params.set("d", activeFolderId);
    if (selectedFileId) params.set("f", selectedFileId);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [activeSemesterId, activeFolderId, selectedFileId]);

  const activeSemester = useMemo(
    () => semesters.find((s) => s.id === activeSemesterId) || null,
    [semesters, activeSemesterId]
  );

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) || null,
    [folders, activeFolderId]
  );

  // Subpastas no nível atual
  const currentSubfolders = useMemo(() => {
    if (!activeSemesterId) return [];
    return folders.filter((f) => {
      if (f.semesterId !== activeSemesterId) return false;
      if (activeFolderId) return f.parentId === activeFolderId;
      return !f.parentId;
    });
  }, [folders, activeSemesterId, activeFolderId]);

  // Arquivos no nível atual
  const currentLevelFiles = useMemo(() => {
    if (!activeSemesterId) return [];
    return files.filter((f) => {
      if (f.semesterId !== activeSemesterId) return false;
      if (activeFolderId) return f.folderId === activeFolderId;
      return !f.folderId;
    });
  }, [files, activeSemesterId, activeFolderId]);

  // Arquivos filtrados pela busca
  const filteredFiles = useMemo(() => {
    if (!search.trim()) return currentLevelFiles;
    const q = search.toLowerCase();
    return currentLevelFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.extension.toLowerCase().includes(q)
    );
  }, [currentLevelFiles, search]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  // Navegação entre arquivos
  const fileListForNavigation = useMemo(() => {
    if (!selectedFile) return currentLevelFiles;
    // Se o arquivo selecionado pertence à mesma pasta, navega nela
    const sameFolderFiles = files.filter(
      (f) => f.semesterId === selectedFile.semesterId && f.folderId === selectedFile.folderId
    );
    return sameFolderFiles.length > 0 ? sameFolderFiles : files;
  }, [selectedFile, currentLevelFiles, files]);

  const selectedIndex = fileListForNavigation.findIndex((f) => f.id === selectedFileId);

  const handlePrevFile = () => {
    if (selectedIndex > 0) {
      setSelectedFileId(fileListForNavigation[selectedIndex - 1].id);
    }
  };

  const handleNextFile = () => {
    if (selectedIndex >= 0 && selectedIndex < fileListForNavigation.length - 1) {
      setSelectedFileId(fileListForNavigation[selectedIndex + 1].id);
    }
  };

  // Upload
  const uploadSingleFile = useCallback(
    async (rawFile: File) => {
      if (!activeSemesterId) {
        throw new Error("Selecione um semestre para enviar arquivos.");
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
              folderId: activeFolderId,
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
          const formData = new FormData();
          formData.append("file", rawFile);
          formData.append("semesterId", activeSemesterId);
          if (activeFolderId) formData.append("folderId", activeFolderId);

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
      if (activeFolderId) formData.append("folderId", activeFolderId);

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
    [activeSemesterId, activeFolderId, storageMode, blobAccess]
  );

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const items = Array.from(fileList);
      if (items.length === 0) return;

      if (!isAdmin) {
        setPinOpen(true);
        return;
      }

      if (!activeSemesterId) {
        showAlert(
          "Selecione um Semestre",
          "Abra um semestre antes de enviar arquivos para que eles fiquem devidamente organizados.",
          "warning"
        );
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
    [isAdmin, activeSemesterId, uploadSingleFile]
  );

  const handleDeleteFile = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    showConfirm({
      title: "Excluir arquivo",
      message: `Tem certeza que deseja remover o arquivo "${file.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      variant: "danger",
      onConfirm: async () => {
        const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
        if (res.ok) {
          setFiles((prev) => prev.filter((f) => f.id !== file.id));
          if (selectedFileId === file.id) {
            setSelectedFileId(null);
          }
        }
      },
    });
  };

  const handleDeleteFolder = (e: React.MouseEvent, fld: Folder) => {
    e.stopPropagation();
    showConfirm({
      title: "Excluir pasta",
      message: `Tem certeza que deseja excluir a pasta "${fld.name}" e todos os seus arquivos e subpastas?`,
      confirmText: "Excluir pasta",
      variant: "danger",
      onConfirm: async () => {
        const res = await fetch(`/api/folders/${fld.id}`, { method: "DELETE" });
        if (res.ok) {
          setFolders((prev) => prev.filter((f) => f.id !== fld.id && f.parentId !== fld.id));
          setFiles((prev) => prev.filter((file) => file.folderId !== fld.id));
          if (activeFolderId === fld.id) {
            setActiveFolderId(null);
          }
        }
      },
    });
  };

  const handleDeleteSemester = (e: React.MouseEvent, sem: Semester) => {
    e.stopPropagation();
    showConfirm({
      title: "Excluir semestre",
      message: `Tem certeza que deseja excluir o semestre "${sem.name}" e todo o seu conteúdo (pastas e arquivos)?`,
      confirmText: "Excluir semestre",
      variant: "danger",
      onConfirm: async () => {
        const res = await fetch(`/api/semesters/${sem.id}`, { method: "DELETE" });
        if (res.ok) {
          const remaining = semesters.filter((s) => s.id !== sem.id);
          setSemesters(remaining);
          setFolders((prev) => prev.filter((f) => f.semesterId !== sem.id));
          setFiles((prev) => prev.filter((f) => f.semesterId !== sem.id));
          if (activeSemesterId === sem.id) {
            setActiveSemesterId(null);
            setActiveFolderId(null);
            setSelectedFileId(null);
          }
        }
      },
    });
  };

  const handleLockToggle = async () => {
    if (isAdmin) {
      await fetch("/api/auth", { method: "DELETE" });
      setIsAdmin(false);
    } else {
      setPinOpen(true);
    }
  };

  // Drag and drop global
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
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/80 bg-neutral-900/90 px-10 py-8 text-white shadow-2xl">
            <UploadCloud className="h-10 w-10 text-emerald-400" />
            <p className="text-base font-semibold">
              Solte os arquivos para enviar para {activeFolder?.name || activeSemester?.name || "a pasta atual"}
            </p>
            <p className="text-xs text-neutral-300">
              PDF, Imagens, DOCX, PPTX, Vídeos e mais
            </p>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-3 sm:px-4 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Botão de abrir/fechar a barra lateral com animação */}
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            title={sidebarOpen ? "Recolher painel lateral" : "Abrir painel lateral"}
            aria-label="Alternar painel lateral"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>

          {/* Breadcrumbs de Navegação estilo Explorador */}
          <nav className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
            {isLockedScope && !isAdmin ? (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                <Lock className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {initialScope === "folder" && activeFolder
                    ? `Pasta autorizada: ${activeFolder.name}`
                    : initialScope === "semester" && activeSemester
                    ? `Semestre autorizado: ${activeSemester.name}`
                    : "Acesso Restrito"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveSemesterId(null);
                  setActiveFolderId(null);
                  setSelectedFileId(null);
                }}
                className="flex items-center gap-1 font-semibold text-neutral-900 transition hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Início</span>
              </button>
            )}

            {(!isLockedScope || isAdmin || initialScope !== "folder") && activeSemester && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => {
                    if (isLockedScope && !isAdmin && initialScope === "folder") return;
                    setActiveFolderId(null);
                    setSelectedFileId(null);
                  }}
                  className={`truncate font-medium transition ${
                    !activeFolder && !selectedFile
                      ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {activeSemester.name}
                </button>
              </>
            )}

            {activeFolder && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setSelectedFileId(null)}
                  className={`truncate font-medium transition ${
                    !selectedFile
                      ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {activeFolder.name}
                </button>
              </>
            )}

            {selectedFile && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedFile.name}
                </span>
              </>
            )}

            {isLockedScope && isAdmin && (
              <button
                type="button"
                onClick={() => setIsLockedScope(false)}
                className="ml-2 hidden sm:inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                title="Você é admin: clique para liberar a visualização de todo o acervo"
              >
                <span>Desbloquear tudo</span>
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setQrScope(selectedFile ? "file" : activeFolder ? "folder" : activeSemester ? "semester" : "all");
              setQrOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            title="Gerar QR Code de acesso"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          <button
            type="button"
            onClick={handleLockToggle}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
              isAdmin
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
            title={
              isAdmin
                ? "Modo edição ativo (clique para bloquear)"
                : "Desbloquear uploads e pastas"
            }
          >
            {isAdmin ? (
              <>
                <Unlock className="h-4 w-4" />
                <span className="hidden sm:inline">Editando</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Gerenciar</span>
              </>
            )}
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Body */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Backdrop escuro no mobile quando o sidebar está aberto */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar com animação suave de recolher/expandir */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-neutral-200 bg-neutral-50/95 backdrop-blur-md transition-all duration-300 ease-in-out lg:static lg:bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-950/95 lg:dark:bg-neutral-950 ${
            sidebarOpen
              ? "translate-x-0 w-72 sm:w-80 opacity-100"
              : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0"
          }`}
        >
          {/* Header do Sidebar */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Navegação
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
              title="Recolher painel lateral"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Links e Pastas Rápidas no Sidebar */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {(!isLockedScope || isAdmin) && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSemesterId(null);
                    setActiveFolderId(null);
                    setSelectedFileId(null);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    !activeSemesterId
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-900"
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Início (Todos os Semestres)</span>
                </button>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  {isLockedScope && !isAdmin ? "Semestre Autorizado" : `Semestres (${semesters.length})`}
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

              <div className="space-y-1">
                {semesters
                  .filter((sem) => !isLockedScope || isAdmin || sem.id === activeSemesterId)
                  .map((sem) => {
                  const active = sem.id === activeSemesterId;
                  const semFilesCount = files.filter((f) => f.semesterId === sem.id).length;
                  const semFoldersCount = folders.filter((f) => f.semesterId === sem.id).length;

                  return (
                    <div
                      key={sem.id}
                      onClick={() => {
                        setActiveSemesterId(sem.id);
                        setActiveFolderId(null);
                        setSelectedFileId(null);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                        active
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
                          : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderIcon className={`h-4 w-4 shrink-0 ${active ? "text-white dark:text-neutral-900" : "text-amber-500"}`} />
                        <span className="truncate">{sem.name}</span>
                      </div>
                      <span className={`text-[10px] ${active ? "opacity-80" : "text-neutral-400"}`}>
                        {semFoldersCount}p · {semFilesCount}a
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Área Central: Visualizador OU Explorador de Arquivos */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50/30 dark:bg-neutral-950">
          {selectedFile ? (
            /* Modo 1: Visualizador de Arquivo em Tela Cheia */
            <div className="flex h-full flex-col">
              {/* Botão de retorno superior */}
              <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-950">
                <button
                  type="button"
                  onClick={() => setSelectedFileId(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar para arquivos</span>
                </button>
                <span className="truncate text-neutral-500 text-[11px]">
                  {activeSemester?.name} {activeFolder ? `› ${activeFolder.name}` : ""}
                </span>
              </div>

              <div className="min-h-0 flex-1">
                <FileViewer
                  key={selectedFile.id}
                  file={selectedFile}
                  hasPrev={selectedIndex > 0}
                  hasNext={selectedIndex >= 0 && selectedIndex < fileListForNavigation.length - 1}
                  onPrev={handlePrevFile}
                  onNext={handleNextFile}
                  onOpenQr={() => {
                    setQrScope("file");
                    setQrOpen(true);
                  }}
                  onCloseViewer={() => setSelectedFileId(null)}
                />
              </div>
            </div>
          ) : (
            /* Modo 2: Explorador de Pastas e Arquivos */
            <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
              {/* Toolbar e Ações do Explorador */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Botão de Voltar ao nível anterior */}
                  {(
                    (activeFolderId && (!isLockedScope || isAdmin || initialScope !== "folder" || activeFolderId !== initialFolderId)) ||
                    (activeSemesterId && (!isLockedScope || isAdmin || initialScope !== "semester"))
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeFolderId) {
                          const currentFld = folders.find((f) => f.id === activeFolderId);
                          if (currentFld?.parentId) {
                            setActiveFolderId(currentFld.parentId);
                          } else if (!isLockedScope || isAdmin || initialScope !== "folder") {
                            setActiveFolderId(null);
                          }
                        } else if (!isLockedScope || isAdmin || initialScope !== "semester") {
                          setActiveSemesterId(null);
                        }
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      title="Subir de nível"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Voltar</span>
                    </button>
                  )}

                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {activeFolder
                      ? activeFolder.name
                      : activeSemester
                      ? `${activeSemester.name} — ${activeSemester.title}`
                      : "Gerenciador de Projetos"}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {/* Busca */}
                  {activeSemesterId && currentLevelFiles.length > 2 && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                      <Search className="h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="w-24 sm:w-36 bg-transparent text-xs outline-none placeholder:text-neutral-400"
                      />
                    </div>
                  )}

                  {/* Alternar Grid / Lista */}
                  <div className="hidden sm:flex items-center rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`rounded p-1.5 transition ${viewMode === "grid" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" : "text-neutral-400 hover:text-neutral-700"}`}
                      title="Visualização em grade"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`rounded p-1.5 transition ${viewMode === "list" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" : "text-neutral-400 hover:text-neutral-700"}`}
                      title="Visualização em lista"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Ações Administrativas */}
                  {isAdmin && (
                    <>
                      {activeSemesterId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolder(null);
                            setFolderModalOpen(true);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          title="Criar nova pasta neste semestre"
                        >
                          <FolderPlus className="h-4 w-4 text-amber-500" />
                          <span>Nova Pasta</span>
                        </button>
                      )}

                      {!activeSemesterId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSemester(null);
                            setSemesterModalOpen(true);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 text-xs font-medium text-white shadow-xs transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Novo Semestre</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 text-xs font-medium text-white shadow-xs transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                          <UploadCloud className="h-4 w-4" />
                          <span>Enviar Arquivo</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Input escondido de upload de arquivos */}
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

              {/* NÍVEL 0: Exibição dos Semestres como Pastas Principais */}
              {!activeSemesterId && (
                <div>
                  <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                    Selecione um semestre para acessar as pastas de projetos, relatórios e apresentações.
                  </p>

                  <div className="space-y-4">
                    {semesters.map((sem) => {
                      const semFiles = files.filter((f) => f.semesterId === sem.id);
                      const semFoldersCount = folders.filter((f) => f.semesterId === sem.id).length;

                      return (
                        <div
                          key={sem.id}
                          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              onClick={() => {
                                setActiveSemesterId(sem.id);
                                setActiveFolderId(null);
                              }}
                              className="group flex cursor-pointer items-center gap-3 min-w-0"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition group-hover:scale-105 dark:bg-amber-400/10 dark:text-amber-400">
                                <FolderIcon className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="truncate text-base font-bold text-neutral-900 transition group-hover:text-amber-600 dark:text-neutral-100 dark:group-hover:text-amber-400">
                                    {sem.name}
                                  </h3>
                                  <span className="text-xs text-neutral-400">—</span>
                                  <p className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                    {sem.title || "Projeto Integrador"}
                                  </p>
                                </div>
                                <p className="text-[11px] text-neutral-400">
                                  {semFoldersCount} pasta(s) · {semFiles.length} arquivo(s)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSemesterId(sem.id);
                                  setActiveFolderId(null);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/70 dark:text-neutral-200 dark:hover:bg-neutral-800"
                              >
                                <span>Abrir Semestre</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>

                              {isAdmin && (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSemester(sem);
                                      setSemesterModalOpen(true);
                                    }}
                                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                    title="Editar semestre"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSemester(e, sem)}
                                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                    title="Excluir semestre"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Carrossel de Pré-visualização dos Arquivos deste Semestre (se não houver arquivos, não aparece) */}
                          <FolderCarousel
                            files={semFiles}
                            onSelectFile={(id) => setSelectedFileId(id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NÍVEL 1+: Dentro de um Semestre ou Subpasta */}
              {activeSemesterId && (
                <div className="space-y-6">
                  {/* Seção de Subpastas */}
                  {currentSubfolders.length > 0 && (
                    <div>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Pastas ({currentSubfolders.length})
                      </h2>
                      <div className="space-y-3.5">
                        {currentSubfolders.map((fld) => {
                          const subFiles = files.filter((f) => f.folderId === fld.id);
                          return (
                            <div
                              key={fld.id}
                              className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                            >
                              <div className="flex items-center justify-between">
                                <div
                                  onClick={() => setActiveFolderId(fld.id)}
                                  className="group flex cursor-pointer items-center gap-3 min-w-0"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition group-hover:scale-105 dark:bg-amber-400/10 dark:text-amber-400">
                                    <FolderIcon className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate text-sm font-semibold text-neutral-900 transition group-hover:text-amber-600 dark:text-neutral-100 dark:group-hover:text-amber-400">
                                        {fld.name}
                                      </p>
                                      <ChevronRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
                                    </div>
                                    <p className="text-[11px] text-neutral-400">
                                      {subFiles.length} arquivo(s)
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveFolderId(fld.id)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                  >
                                    <span>Abrir</span>
                                    <ChevronRight className="h-3 w-3" />
                                  </button>

                                  {isAdmin && (
                                    <div
                                      className="flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingFolder(fld);
                                          setFolderModalOpen(true);
                                        }}
                                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                        title="Renomear pasta"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteFolder(e, fld)}
                                        className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                        title="Excluir pasta"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Carrossel de Pré-visualização de Arquivos da Subpasta (se não houver arquivos, não aparece) */}
                              <FolderCarousel
                                files={subFiles}
                                onSelectFile={(id) => setSelectedFileId(id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Carrossel de Pré-visualização da Pasta Aberta (se não houver arquivos, não aparece) */}
                  {currentLevelFiles.length > 0 && (
                    <div className="rounded-2xl border border-neutral-200/90 bg-white/80 p-4 shadow-xs backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900/60">
                      <FolderCarousel
                        files={currentLevelFiles}
                        onSelectFile={(id) => setSelectedFileId(id)}
                        title={`Carrossel de Arquivos — ${activeFolder ? activeFolder.name : activeSemester?.name}`}
                      />
                    </div>
                  )}

                  {/* Seção de Arquivos */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Arquivos ({filteredFiles.length})
                      </h2>
                      {uploadingCount > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Enviando {uploadingCount}...
                        </span>
                      )}
                    </div>

                    {filteredFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white/50 p-10 text-center dark:border-neutral-800 dark:bg-neutral-900/30">
                        <FolderOpen className="h-10 w-10 text-neutral-300 dark:text-neutral-700" />
                        <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {search ? "Nenhum arquivo corresponde à busca." : "Nenhum arquivo nesta pasta."}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400 max-w-sm">
                          Arraste arquivos PDF, imagens, DOCX ou PPTX diretamente para cá para começar.
                        </p>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                          >
                            <UploadCloud className="h-4 w-4" />
                            Enviar arquivo
                          </button>
                        )}
                      </div>
                    ) : viewMode === "grid" ? (
                      /* Grade de Arquivos com Preview de Documento */
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {filteredFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFileId(file.id)}
                            className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                          >
                            <div>
                              {/* Preview do Documento no Card */}
                              <div className="relative mb-3 h-36 sm:h-40 w-full overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-100/70 dark:border-neutral-800 dark:bg-neutral-950">
                                <DocumentPreview file={file} />

                                {/* Badge com a extensão */}
                                <span className="absolute left-2 top-2 rounded bg-neutral-900/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs backdrop-blur-xs dark:bg-neutral-100/90 dark:text-neutral-900">
                                  {file.extension.toUpperCase() || "ARQ"}
                                </span>

                                {/* Ações no hover */}
                                <div
                                  className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/90 p-1 opacity-0 shadow-xs backdrop-blur-xs transition group-hover:opacity-100 dark:bg-neutral-900/90"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <a
                                    href={file.url}
                                    download={file.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded p-1 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                                    title="Baixar arquivo"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteFile(e, file)}
                                      className="rounded p-1 text-neutral-600 hover:bg-red-50 hover:text-red-600 dark:text-neutral-300 dark:hover:bg-red-950/40"
                                      title="Excluir arquivo"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <FileCategoryIcon category={file.category} className="h-4 w-4 shrink-0" />
                                <p className="truncate text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100" title={file.name}>
                                  {file.name}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-400 dark:border-neutral-800/60">
                              <span className="font-mono uppercase font-semibold text-neutral-500 dark:text-neutral-400">
                                {file.extension || "ARQ"}
                              </span>
                              <span>{formatBytes(file.size)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Lista de Arquivos */
                      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                        {filteredFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFileId(file.id)}
                            className="group flex cursor-pointer items-center justify-between p-3 text-xs transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileCategoryIcon category={file.category} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  {file.extension.toUpperCase()} · {formatBytes(file.size)}
                                </p>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={file.url}
                                download={file.name}
                                className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                title="Baixar"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteFile(e, file)}
                                  className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modais */}
      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        semesters={semesters}
        folders={folders}
        activeSemester={activeSemester}
        activeFolder={activeFolder}
        file={selectedFile}
        initialScope={qrScope}
      />

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
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
            setActiveFolderId(null);
            setSelectedFileId(null);
          } else {
            setSemesters((prev) =>
              prev.map((s) => (s.id === semester.id ? semester : s))
            );
          }
        }}
      />

      <FolderModal
        open={folderModalOpen}
        semesterId={activeSemesterId || ""}
        parentId={activeFolderId}
        editingFolder={editingFolder}
        onClose={() => setFolderModalOpen(false)}
        onSaved={(folder, isNew) => {
          if (isNew) {
            setFolders((prev) => [...prev, folder]);
          } else {
            setFolders((prev) =>
              prev.map((f) => (f.id === folder.id ? folder : f))
            );
          }
        }}
      />
    </div>
  );
}
