"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Film,
  Folder as FolderIcon,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Music,
  Pin,
  PinOff,
  Plus,
  Presentation,
  QrCode,
  Search,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { upload as blobUpload } from "@vercel/blob/client";
import { FileCategory, FileItem, Folder, Semester } from "@/lib/types";
import { formatBytes } from "@/lib/file-utils";
import { downloadFolderAsZip } from "@/lib/folder-zip";
import FileViewer from "./viewers/FileViewer";
import QrCodeModal from "./QrCodeModal";
import PinModal from "./PinModal";
import SemesterModal from "./SemesterModal";
import FolderModal from "./FolderModal";
import FileActionsModal, { FileActionMode } from "./FileActionsModal";
import CommandPalette from "./CommandPalette";
import ThemeToggle from "./ThemeToggle";
import DocumentPreview from "./DocumentPreview";
import AmbientOrbs from "./AmbientOrbs";
import ConfirmModal, { ConfirmDialogState } from "./ConfirmModal";
import ExpandingSearch, { ExpandingSearchItem } from "./arc/ExpandingSearch";
import ExpandingButtonGroup from "./arc/ExpandingButtonGroup";
import DropdownMenu, { DropdownMenuItem } from "./arc/DropdownMenu";
import ContextMenu, { ContextMenuItem } from "./arc/ContextMenu";
import SiteHeader, { SiteHeaderBreadcrumb, SiteHeaderQuickLink } from "./arc/SiteHeader";

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

function FileCategoryIcon({
  category,
  extension,
  className = "h-5 w-5",
}: {
  category: FileCategory;
  extension?: string;
  className?: string;
}) {
  const cls = `${className} shrink-0`;
  if (category === "other" && extension?.toLowerCase() === "zip") {
    return <FileArchive className={`${cls} text-[#c96726] dark:text-[#d77435]`} />;
  }
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

function DotMatrixIcon({ className = "h-4 w-4 text-[#c96726] dark:text-[#d77435]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="8" cy="2" r="1.3" />
      <circle cx="5" cy="5" r="1.3" />
      <circle cx="11" cy="5" r="1.3" />
      <circle cx="3" cy="9" r="1.3" />
      <circle cx="8" cy="9" r="1.3" />
      <circle cx="13" cy="9" r="1.3" />
      <circle cx="2" cy="14" r="1.3" />
      <circle cx="8" cy="14" r="1.3" />
      <circle cx="14" cy="14" r="1.3" />
    </svg>
  );
}

interface SidebarFolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  allFiles: FileItem[];
  activeSemesterId: string | null;
  activeFolderId: string | null;
  selectedFileId: string | null;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (folderId: string) => void;
  onSelectFolder: (folder: Folder) => void;
  onSelectFile: (file: FileItem) => void;
  buildFolderMenuItems: (
    folder: Folder,
    opts?: { isExpanded?: boolean; onToggle?: () => void }
  ) => ContextMenuItem[];
  buildFileMenuItems: (file: FileItem) => ContextMenuItem[];
  depth?: number;
}

function SidebarFolderNode({
  folder,
  allFolders,
  allFiles,
  activeSemesterId,
  activeFolderId,
  selectedFileId,
  expandedFolders,
  onToggleFolder,
  onSelectFolder,
  onSelectFile,
  buildFolderMenuItems,
  buildFileMenuItems,
  depth = 0,
}: SidebarFolderNodeProps) {
  // Uma pasta é considerada aberta se explicitamente expandida ou se for a pasta ativa no momento
  const isExpanded = expandedFolders[folder.id] !== undefined
    ? expandedFolders[folder.id]
    : activeFolderId === folder.id;

  const isActive = activeFolderId === folder.id;
  const childFolders = allFolders.filter((f) => f.parentId === folder.id);
  const folderFiles = allFiles.filter((f) => f.folderId === folder.id);
  const hasItems = childFolders.length > 0 || folderFiles.length > 0;

  const folderContextMenuItems = buildFolderMenuItems(folder, {
    isExpanded,
    onToggle: () => onToggleFolder(folder.id),
  });

  return (
    <div className="select-none">
      {/* Linha da Pasta no Sidebar com Menu de Clique Direito */}
      <ContextMenu items={folderContextMenuItems}>
        <div
          className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 font-mono text-xs transition ${
            isActive
              ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614] font-medium shadow-2xs"
              : "text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
          }`}
          onClick={() => onSelectFolder(folder)}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFolder(folder.id);
              }}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition ${
                isActive
                  ? "text-[#fafbf7]/80 hover:text-white dark:text-[#1a1614]/80 dark:hover:text-[#1a1614]"
                  : "text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
              }`}
              title={isExpanded ? "Recolher pasta" : "Expandir pasta"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
            </button>

            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#c96726] dark:text-[#d77435]" />
            ) : (
              <FolderIcon
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive
                    ? "text-[#fafbf7] dark:text-[#1a1614]"
                    : "text-[#c96726] dark:text-[#d77435]"
                }`}
              />
            )}

            <span className="truncate">{folder.name}</span>
          </div>

          <span
            className={`ml-1 shrink-0 font-mono text-[10px] ${
              isActive
                ? "text-[#fafbf7]/70 dark:text-[#1a1614]/70"
                : "text-[#736d67]/60 dark:text-[#9c968f]/60"
            }`}
          >
            {folderFiles.length}
          </span>
        </div>
      </ContextMenu>

      {/* Conteúdo da Pasta Aberta (Subpastas + Arquivos) - Estilo VS Code Explorer */}
      {isExpanded && (
        <div className="relative ml-2.5 mt-0.5 space-y-0.5 border-l border-dashed border-[#1a1614]/15 pl-2 dark:border-white/10">
          {/* Subpastas dentro desta pasta */}
          {childFolders.map((subFld) => (
            <SidebarFolderNode
              key={subFld.id}
              folder={subFld}
              allFolders={allFolders}
              allFiles={allFiles}
              activeSemesterId={activeSemesterId}
              activeFolderId={activeFolderId}
              selectedFileId={selectedFileId}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFolder={onSelectFolder}
              onSelectFile={onSelectFile}
              buildFolderMenuItems={buildFolderMenuItems}
              buildFileMenuItems={buildFileMenuItems}
              depth={depth + 1}
            />
          ))}

          {/* Arquivos dentro desta pasta aberta com Menu de Clique Direito */}
          {folderFiles.map((file) => {
            const isFileActive = selectedFileId === file.id;
            const fileContextMenuItems = buildFileMenuItems(file);

            return (
              <ContextMenu key={file.id} items={fileContextMenuItems}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFile(file);
                  }}
                  className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 font-mono text-xs transition ${
                    isFileActive
                      ? "bg-[#c96726]/15 text-[#1a1614] dark:text-[#fafbf7] font-semibold border-l-2 border-[#c96726]"
                      : "text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                  }`}
                  title={`${file.name} (${formatBytes(file.size)})`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <FileCategoryIcon
                      category={file.category}
                      extension={file.extension}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 pl-1.5">
                    {file.pinned && (
                      <Pin className="h-2.5 w-2.5 text-[#c96726] dark:text-[#d77435]" />
                    )}
                    {isFileActive ? (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-[#c96726] dark:bg-[#d77435]"
                        title="Arquivo aberto no visualizador"
                      />
                    ) : (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#736d67]/50 dark:text-[#9c968f]/50">
                        {file.extension}
                      </span>
                    )}
                  </div>
                </div>
              </ContextMenu>
            );
          })}

          {!hasItems && (
            <div className="px-2 py-1 text-[10px] font-mono italic text-[#736d67]/50 dark:text-[#9c968f]/50">
              (pasta vazia)
            </div>
          )}
        </div>
      )}
    </div>
  );
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

  // Estados de expansão do explorer da sidebar (estilo VS Code)
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>(() => {
    if (initialSemesterId) return { [initialSemesterId]: true };
    return {};
  });

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    if (initialFolderId) return { [initialFolderId]: true };
    return {};
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "docs" | "slides" | "code" | "media"
  >("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "size">("recent");
  const [zippingFolderId, setZippingFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modais
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrScope, setQrScope] = useState<"all" | "semester" | "folder" | "file">("all");
  const [pinOpen, setPinOpen] = useState(false);
  const [semesterModalOpen, setSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [fileActionModal, setFileActionModal] = useState<{
    open: boolean;
    mode: FileActionMode;
    file: FileItem | null;
  }>({ open: false, mode: "rename", file: null });

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
  const explorerScrollRef = useRef<HTMLDivElement | null>(null);
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

  // Auto-expande o semestre ativo na sidebar
  useEffect(() => {
    if (activeSemesterId) {
      setExpandedSemesters((prev) => ({ ...prev, [activeSemesterId]: true }));
    }
  }, [activeSemesterId]);

  // Auto-expande a pasta ativa (e todas as suas pastas pai se aninhadas) na sidebar
  useEffect(() => {
    if (activeFolderId) {
      setExpandedFolders((prev) => {
        const next = { ...prev, [activeFolderId]: true };
        let current = folders.find((f) => f.id === activeFolderId);
        while (current?.parentId) {
          next[current.parentId] = true;
          current = folders.find((f) => f.id === current?.parentId);
        }
        return next;
      });
    }
  }, [activeFolderId, folders]);

  // Auto-expande a pasta e semestre do arquivo ativo
  useEffect(() => {
    if (selectedFileId) {
      const file = files.find((f) => f.id === selectedFileId);
      if (file) {
        if (file.folderId) {
          setExpandedFolders((prev) => {
            const next = { ...prev, [file.folderId!]: true };
            let current = folders.find((f) => f.id === file.folderId);
            while (current?.parentId) {
              next[current.parentId] = true;
              current = folders.find((f) => f.id === current?.parentId);
            }
            return next;
          });
        }
        if (file.semesterId) {
          setExpandedSemesters((prev) => ({ ...prev, [file.semesterId]: true }));
        }
      }
    }
  }, [selectedFileId, files, folders]);

  // Ações de navegação do Sidebar (estilo VS Code)
  const toggleSemesterExpansion = (semId: string) => {
    setExpandedSemesters((prev) => {
      const isCurrentlyOpen = prev[semId] !== undefined ? prev[semId] : semId === activeSemesterId;
      return { ...prev, [semId]: !isCurrentlyOpen };
    });
  };

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders((prev) => {
      const isCurrentlyOpen = prev[folderId] !== undefined ? prev[folderId] : folderId === activeFolderId;
      return { ...prev, [folderId]: !isCurrentlyOpen };
    });
  };

  const handleSidebarSelectSemester = (semId: string) => {
    setActiveSemesterId(semId);
    setActiveFolderId(null);
    setSelectedFileId(null);
    setExpandedSemesters((prev) => ({ ...prev, [semId]: true }));
  };

  const handleSidebarSelectFolder = (folder: Folder) => {
    setActiveSemesterId(folder.semesterId);
    setActiveFolderId(folder.id);
    setSelectedFileId(null);
    setExpandedFolders((prev) => ({ ...prev, [folder.id]: true }));
  };

  const handleSidebarSelectFile = (file: FileItem) => {
    setActiveSemesterId(file.semesterId);
    if (file.folderId) {
      setActiveFolderId(file.folderId);
      setExpandedFolders((prev) => ({ ...prev, [file.folderId!]: true }));
    } else {
      setActiveFolderId(null);
    }
    setSelectedFileId(file.id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Estados e manipuladores para criação e ações contextuais via clique direito (sidebar)
  const [targetFolderSemesterId, setTargetFolderSemesterId] = useState<string | null>(null);
  const [targetFolderParentId, setTargetFolderParentId] = useState<string | null | undefined>(undefined);

  const handleDownloadFile = (file: FileItem) => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyFileLink = (file: FileItem) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/?s=${file.semesterId}${file.folderId ? `&d=${file.folderId}` : ""}&f=${file.id}`;
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
      showAlert("Link copiado!", `O link direto para "${file.name}" foi copiado para a área de transferência.`, "info");
    }
  };

  const handleOpenQrFolder = (folder: Folder) => {
    setActiveSemesterId(folder.semesterId);
    setActiveFolderId(folder.id);
    setQrScope("folder");
    setQrOpen(true);
  };

  const handleOpenQrFile = (file: FileItem) => {
    setSelectedFileId(file.id);
    setActiveSemesterId(file.semesterId);
    if (file.folderId) setActiveFolderId(file.folderId);
    setQrScope("file");
    setQrOpen(true);
  };

  const handleNewSubfolder = (folder: Folder) => {
    setTargetFolderSemesterId(folder.semesterId);
    setTargetFolderParentId(folder.id);
    setEditingFolder(null);
    setFolderModalOpen(true);
  };

  const handleUploadToFolder = (folder: Folder) => {
    setActiveSemesterId(folder.semesterId);
    setActiveFolderId(folder.id);
    fileInputRef.current?.click();
  };

  const handleEditFolder = (folder: Folder) => {
    setTargetFolderSemesterId(folder.semesterId);
    setTargetFolderParentId(folder.parentId);
    setEditingFolder(folder);
    setFolderModalOpen(true);
  };

  const handleDownloadFolderZip = async (folder: Folder) => {
    if (zippingFolderId) return;
    setZippingFolderId(folder.id);
    try {
      const count = await downloadFolderAsZip(folder, folders, files);
      if (count === 0) {
        showAlert(
          "Pasta vazia",
          `A pasta "${folder.name}" não possui arquivos para compactar em .zip.`,
          "info"
        );
      }
    } catch {
      showAlert(
        "Erro ao compactar",
        "Não foi possível gerar o pacote .zip desta pasta.",
        "warning"
      );
    } finally {
      setZippingFolderId(null);
    }
  };

  const handleTogglePinFile = async (file: FileItem) => {
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !file.pinned }),
      });
      if (res.ok) {
        const data = (await res.json()) as { file?: FileItem };
        if (data.file) {
          setFiles((prev) =>
            prev.map((f) => (f.id === data.file!.id ? data.file! : f))
          );
        }
      }
    } catch {
      // ignore transient network errors
    }
  };

  // Atalho global Ctrl+K / ⌘K para Command Palette
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  // Limpa filtro de categoria ao trocar de pasta/semestre
  useEffect(() => {
    setCategoryFilter("all");
    setSearch("");
  }, [activeSemesterId, activeFolderId]);

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

  // Arquivos filtrados por busca, categoria e ordenados (fixados no topo)
  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = currentLevelFiles.filter((f) => {
      if (
        q &&
        !f.name.toLowerCase().includes(q) &&
        !f.extension.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (categoryFilter === "docs") {
        return f.category === "pdf" || f.category === "docx";
      }
      if (categoryFilter === "slides") {
        return f.category === "pptx";
      }
      if (categoryFilter === "code") {
        return (
          f.category === "text" ||
          f.extension.toLowerCase() === "zip"
        );
      }
      if (categoryFilter === "media") {
        return (
          f.category === "image" ||
          f.category === "video" ||
          f.category === "audio"
        );
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;

      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "pt-BR", { numeric: true });
      }
      if (sortBy === "size") {
        return b.size - a.size;
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [currentLevelFiles, search, categoryFilter, sortBy]);

  // Sugestões para o Arc ExpandingSearch
  const searchItems: ExpandingSearchItem[] = useMemo(() => {
    return currentLevelFiles.map((f) => ({
      id: f.id,
      title: f.name,
      meta: `${f.extension.toUpperCase()} · ${formatBytes(f.size)}`,
      icon: <FileCategoryIcon category={f.category} className="h-4 w-4" />,
    }));
  }, [currentLevelFiles]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  // Dados estruturados para o SiteHeader (@uiarc/site-header)
  const lockedScopeLabel = useMemo(() => {
    if (initialScope === "folder" && activeFolder) return `PASTA: ${activeFolder.name}`;
    if (initialScope === "semester" && activeSemester) return `SEMESTRE: ${activeSemester.name}`;
    return "ACESSO RESTRITO";
  }, [initialScope, activeFolder, activeSemester]);

  const headerBreadcrumbs: SiteHeaderBreadcrumb[] = useMemo(() => {
    const list: SiteHeaderBreadcrumb[] = [];

    if (!isLockedScope || isAdmin) {
      list.push({
        id: "home",
        label: "INÍCIO",
        active: !activeSemester && !selectedFile,
        onClick: () => {
          setActiveSemesterId(null);
          setActiveFolderId(null);
          setSelectedFileId(null);
        },
      });
    }

    if ((!isLockedScope || isAdmin || initialScope !== "folder") && activeSemester) {
      const canClickSemester = !(isLockedScope && !isAdmin && initialScope === "folder");
      list.push({
        id: `sem-${activeSemester.id}`,
        label: activeSemester.name.toUpperCase(),
        active: !activeFolder && !selectedFile,
        onClick: canClickSemester
          ? () => {
              setActiveFolderId(null);
              setSelectedFileId(null);
            }
          : undefined,
      });
    }

    if (activeFolder) {
      list.push({
        id: `fld-${activeFolder.id}`,
        label: activeFolder.name.toUpperCase(),
        active: !selectedFile,
        onClick: () => setSelectedFileId(null),
      });
    }

    if (selectedFile) {
      list.push({
        id: `file-${selectedFile.id}`,
        label: selectedFile.name,
        active: true,
      });
    }

    return list;
  }, [isLockedScope, isAdmin, initialScope, activeSemester, activeFolder, selectedFile]);

  const headerQuickLinks: SiteHeaderQuickLink[] = useMemo(() => {
    if (isLockedScope && !isAdmin) return [];
    return semesters.map((sem) => ({
      id: sem.id,
      label: sem.name,
      active: sem.id === activeSemesterId,
      onSelect: () => {
        setActiveSemesterId(sem.id);
        setActiveFolderId(null);
        setSelectedFileId(null);
      },
    }));
  }, [semesters, activeSemesterId, isLockedScope, isAdmin]);

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

  // Builders compartilhados para menus de contexto e dropdown (sidebar, cards e lista)
  const buildFolderMenuItems = (
    fld: Folder,
    opts?: { isExpanded?: boolean; onToggle?: () => void }
  ): ContextMenuItem[] => [
    {
      id: "open",
      label: "Abrir pasta",
      icon: <FolderOpen className="h-4 w-4 text-[#c96726]" />,
      onSelect: () => handleSidebarSelectFolder(fld),
    },
    ...(opts?.onToggle
      ? [
          {
            id: "toggle",
            label: opts.isExpanded ? "Recolher pasta" : "Expandir pasta",
            icon: opts.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[#736d67]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#736d67]" />
            ),
            onSelect: opts.onToggle,
          },
        ]
      : []),
    {
      id: "download-zip",
      label:
        zippingFolderId === fld.id ? "Compactando .zip..." : "Baixar pasta (.zip)",
      icon: <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      disabled: zippingFolderId === fld.id,
      onSelect: () => {
        void handleDownloadFolderZip(fld);
      },
    },
    {
      id: "qr",
      label: "Gerar QR Code da pasta",
      icon: <QrCode className="h-4 w-4 text-[#736d67]" />,
      onSelect: () => handleOpenQrFolder(fld),
    },
    ...(isAdmin
      ? [
          {
            id: "new-subfolder",
            label: "Nova subpasta",
            icon: <FolderPlus className="h-4 w-4 text-[#736d67]" />,
            separatorBefore: true,
            onSelect: () => handleNewSubfolder(fld),
          },
          {
            id: "upload",
            label: "Enviar arquivo para esta pasta",
            icon: <UploadCloud className="h-4 w-4 text-[#736d67]" />,
            onSelect: () => handleUploadToFolder(fld),
          },
          {
            id: "edit",
            label: "Editar pasta & Ficha Técnica",
            icon: <Edit3 className="h-4 w-4 text-[#736d67]" />,
            separatorBefore: true,
            onSelect: () => handleEditFolder(fld),
          },
          {
            id: "delete",
            label: "Excluir pasta",
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true,
            onSelect: () =>
              handleDeleteFolder({ stopPropagation: () => {} } as React.MouseEvent, fld),
          },
        ]
      : []),
  ];

  const buildFileMenuItems = (file: FileItem): ContextMenuItem[] => [
    {
      id: "view",
      label: "Visualizar documento",
      icon: <FileCategoryIcon category={file.category} extension={file.extension} className="h-4 w-4" />,
      onSelect: () => handleSidebarSelectFile(file),
    },
    {
      id: "download",
      label: "Baixar arquivo",
      icon: <Download className="h-4 w-4 text-sky-500" />,
      onSelect: () => handleDownloadFile(file),
    },
    {
      id: "qr",
      label: "Gerar QR Code",
      icon: <QrCode className="h-4 w-4 text-[#736d67]" />,
      onSelect: () => handleOpenQrFile(file),
    },
    {
      id: "copy-link",
      label: "Copiar link do arquivo",
      icon: <Copy className="h-4 w-4 text-[#736d67]" />,
      onSelect: () => handleCopyFileLink(file),
    },
    ...(isAdmin
      ? [
          {
            id: "pin",
            label: file.pinned ? "Desafixar do topo" : "Fixar no topo",
            icon: file.pinned ? (
              <PinOff className="h-4 w-4 text-[#736d67]" />
            ) : (
              <Pin className="h-4 w-4 text-[#c96726]" />
            ),
            separatorBefore: true,
            onSelect: () => {
              void handleTogglePinFile(file);
            },
          },
          {
            id: "rename",
            label: "Renomear arquivo",
            icon: <Edit3 className="h-4 w-4 text-[#736d67]" />,
            onSelect: () =>
              setFileActionModal({ open: true, mode: "rename", file }),
          },
          {
            id: "move",
            label: "Mover para pasta...",
            icon: <FolderInput className="h-4 w-4 text-[#736d67]" />,
            onSelect: () =>
              setFileActionModal({ open: true, mode: "move", file }),
          },
          {
            id: "delete",
            label: "Excluir arquivo",
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true,
            separatorBefore: true,
            onSelect: () =>
              handleDeleteFile({ stopPropagation: () => {} } as React.MouseEvent, file),
          },
        ]
      : []),
  ];

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
      className="relative flex h-dvh flex-col overflow-hidden bg-[#f5f6f1] text-[#1a1614] antialiased dark:bg-[#161311] dark:text-[#fafbf7]"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Background Animado Ultra-Sutil com Gradient Orbs (Paleta Antimetal) */}
      <AmbientOrbs />

      {/* Fullscreen Drag Overlay */}
      {isDragging && isAdmin && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-[#c96726] bg-[#1a1614]/95 px-10 py-8 text-[#fafbf7] shadow-2xl">
            <UploadCloud className="h-10 w-10 text-[#c96726] animate-bounce" />
            <p className="font-serif text-lg font-normal">
              Solte os arquivos para enviar para {activeFolder?.name || activeSemester?.name || "a pasta atual"}
            </p>
            <p className="font-mono text-xs text-[#9c968f]">
              PDF, Imagens, DOCX, PPTX, Vídeos e mais
            </p>
          </div>
        </div>
      )}

      {/* Top Navbar (@uiarc/site-header + Antimetal Aesthetic) */}
      <SiteHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onGoHome={() => {
          if (isLockedScope && !isAdmin) return;
          setActiveSemesterId(null);
          setActiveFolderId(null);
          setSelectedFileId(null);
        }}
        breadcrumbs={headerBreadcrumbs}
        quickLinks={headerQuickLinks}
        isLockedScope={isLockedScope}
        lockedLabel={lockedScopeLabel}
        isAdmin={isAdmin}
        onUnlockAllScope={() => setIsLockedScope(false)}
        onOpenGlobalSearch={() => setPaletteOpen(true)}
        onOpenQr={() => {
          setQrScope(
            selectedFile
              ? "file"
              : activeFolder
              ? "folder"
              : activeSemester
              ? "semester"
              : "all"
          );
          setQrOpen(true);
        }}
        onToggleAdmin={handleLockToggle}
        themeToggle={<ThemeToggle />}
        brandMark={
          <DotMatrixIcon className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
        }
        scrollContainer={explorerScrollRef}
      />

      {/* Main Body */}
      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        {/* Backdrop escuro no mobile quando o sidebar está aberto */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Antimetal Blueprint */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-dashed border-[#1a1614]/15 bg-[#f0f1eb]/95 backdrop-blur-md transition-all duration-300 ease-in-out lg:static lg:bg-[#f0f1eb]/60 dark:border-white/10 dark:bg-[#1a1614]/95 lg:dark:bg-[#1a1614]/60 ${
            sidebarOpen
              ? "translate-x-0 w-72 sm:w-80 opacity-100"
              : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0"
          }`}
        >
          {/* Header do Sidebar */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-dashed border-[#1a1614]/15 px-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <DotMatrixIcon className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                01 / EXPLORER
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 dark:text-[#9c968f] dark:hover:bg-white/5"
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
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-medium transition ${
                    !activeSemesterId
                      ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                      : "text-[#736d67] hover:bg-[#1a1614]/5 dark:text-[#9c968f] dark:hover:bg-white/5"
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>INÍCIO (TODOS OS SEMESTRES)</span>
                </button>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                  {isLockedScope && !isAdmin ? "02 / ÁRVORE AUTORIZADA" : `02 / PROJETOS & ARQUIVOS (${semesters.length})`}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSemester(null);
                      setSemesterModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#1a1614]/15 bg-white/70 px-2 py-0.5 font-mono text-[10px] font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
                    title="Novo semestre"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>NOVO</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {semesters
                  .filter((sem) => !isLockedScope || isAdmin || sem.id === activeSemesterId)
                  .map((sem, idx) => {
                    const isSemActive = sem.id === activeSemesterId;
                    const isSemOpen = expandedSemesters[sem.id] !== undefined
                      ? expandedSemesters[sem.id]
                      : isSemActive;
                    const semFolders = folders.filter(
                      (f) => f.semesterId === sem.id && !f.parentId
                    );
                    const semRootFiles = files.filter(
                      (f) => f.semesterId === sem.id && !f.folderId
                    );
                    const totalSemFiles = files.filter((f) => f.semesterId === sem.id).length;
                    const totalSemFolders = folders.filter((f) => f.semesterId === sem.id).length;

                    const sidebarSemesterContextMenuItems: ContextMenuItem[] = [
                      {
                        id: "open",
                        label: "Abrir ciclo",
                        icon: <FolderOpen className="h-4 w-4 text-[#c96726]" />,
                        onSelect: () => handleSidebarSelectSemester(sem.id),
                      },
                      {
                        id: "toggle",
                        label: isSemOpen ? "Recolher ciclo" : "Expandir ciclo",
                        icon: isSemOpen ? (
                          <ChevronDown className="h-4 w-4 text-[#736d67]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#736d67]" />
                        ),
                        onSelect: () => toggleSemesterExpansion(sem.id),
                      },
                      {
                        id: "qr",
                        label: "Gerar QR Code do ciclo",
                        icon: <QrCode className="h-4 w-4 text-[#736d67]" />,
                        onSelect: () => {
                          setActiveSemesterId(sem.id);
                          setActiveFolderId(null);
                          setQrScope("semester");
                          setQrOpen(true);
                        },
                      },
                      ...(isAdmin
                        ? [
                            {
                              id: "new-folder",
                              label: "Nova pasta neste ciclo",
                              icon: <FolderPlus className="h-4 w-4 text-[#736d67]" />,
                              separatorBefore: true,
                              onSelect: () => {
                                setTargetFolderSemesterId(sem.id);
                                setTargetFolderParentId(null);
                                setEditingFolder(null);
                                setFolderModalOpen(true);
                              },
                            },
                            {
                              id: "upload",
                              label: "Enviar arquivo para este ciclo",
                              icon: <UploadCloud className="h-4 w-4 text-[#736d67]" />,
                              onSelect: () => {
                                setActiveSemesterId(sem.id);
                                setActiveFolderId(null);
                                fileInputRef.current?.click();
                              },
                            },
                            {
                              id: "edit",
                              label: "Editar ciclo",
                              icon: <Edit3 className="h-4 w-4 text-[#736d67]" />,
                              separatorBefore: true,
                              onSelect: () => {
                                setEditingSemester(sem);
                                setSemesterModalOpen(true);
                              },
                            },
                            {
                              id: "delete",
                              label: "Excluir ciclo",
                              icon: <Trash2 className="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => {
                                handleDeleteSemester(
                                  { stopPropagation: () => {} } as React.MouseEvent,
                                  sem
                                );
                              },
                            },
                          ]
                        : []),
                    ];

                    return (
                      <div key={sem.id} className="select-none">
                        {/* Linha do Semestre com Menu de Clique Direito */}
                        <ContextMenu items={sidebarSemesterContextMenuItems}>
                          <div
                            onClick={() => handleSidebarSelectSemester(sem.id)}
                            className={`group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 font-mono text-xs transition ${
                              isSemActive && !activeFolderId && !selectedFileId
                                ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614] font-medium shadow-2xs"
                                : isSemActive
                                ? "bg-[#1a1614]/5 text-[#1a1614] dark:bg-white/5 dark:text-[#fafbf7] font-medium"
                                : "text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSemesterExpansion(sem.id);
                                }}
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
                                title={isSemOpen ? "Recolher ciclo" : "Expandir ciclo"}
                              >
                                {isSemOpen ? (
                                  <ChevronDown className="h-3 w-3 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 shrink-0" />
                                )}
                              </button>

                              <span
                                className={`text-[10px] ${
                                  isSemActive
                                    ? "text-[#c96726] dark:text-[#d77435]"
                                    : "text-[#736d67]/60 dark:text-[#9c968f]/60"
                                }`}
                              >
                                {String(idx + 1).padStart(2, "0")}
                              </span>

                              {isSemOpen ? (
                                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                              ) : (
                                <FolderIcon className="h-3.5 w-3.5 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                              )}

                              <span className="truncate">{sem.name}</span>
                            </div>

                            <span
                              className={`text-[10px] ${
                                isSemActive
                                  ? "opacity-75"
                                  : "text-[#736d67]/60 dark:text-[#9c968f]/60"
                              }`}
                            >
                              {totalSemFolders}p · {totalSemFiles}a
                            </span>
                          </div>
                        </ContextMenu>

                        {/* Conteúdo do Semestre Expandido */}
                        {isSemOpen && (
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-dashed border-[#1a1614]/15 pl-2 dark:border-white/10">
                            {/* Pastas de primeiro nível do semestre */}
                            {semFolders.map((fld) => (
                              <SidebarFolderNode
                                key={fld.id}
                                folder={fld}
                                allFolders={folders}
                                allFiles={files}
                                activeSemesterId={activeSemesterId}
                                activeFolderId={activeFolderId}
                                selectedFileId={selectedFileId}
                                expandedFolders={expandedFolders}
                                onToggleFolder={toggleFolderExpansion}
                                onSelectFolder={handleSidebarSelectFolder}
                                onSelectFile={handleSidebarSelectFile}
                                buildFolderMenuItems={buildFolderMenuItems}
                                buildFileMenuItems={buildFileMenuItems}
                                depth={0}
                              />
                            ))}

                            {/* Arquivos na raiz do semestre com Menu de Clique Direito */}
                            {semRootFiles.map((file) => {
                              const isFileActive = selectedFileId === file.id;
                              const rootFileContextMenuItems = buildFileMenuItems(file);

                              return (
                                <ContextMenu key={file.id} items={rootFileContextMenuItems}>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSidebarSelectFile(file);
                                    }}
                                    className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 font-mono text-xs transition ${
                                      isFileActive
                                        ? "bg-[#c96726]/15 text-[#1a1614] dark:text-[#fafbf7] font-semibold border-l-2 border-[#c96726]"
                                        : "text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                    }`}
                                    title={`${file.name} (${formatBytes(file.size)})`}
                                  >
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <FileCategoryIcon
                                        category={file.category}
                                        extension={file.extension}
                                        className="h-3.5 w-3.5 shrink-0"
                                      />
                                      <span className="truncate">{file.name}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 pl-1.5">
                                      {file.pinned && (
                                        <Pin className="h-2.5 w-2.5 text-[#c96726] dark:text-[#d77435]" />
                                      )}
                                      {isFileActive ? (
                                        <span
                                          className="inline-block h-1.5 w-1.5 rounded-full bg-[#c96726] dark:bg-[#d77435]"
                                          title="Arquivo aberto no visualizador"
                                        />
                                      ) : (
                                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#736d67]/50 dark:text-[#9c968f]/50">
                                          {file.extension}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </ContextMenu>
                              );
                            })}

                            {semFolders.length === 0 && semRootFiles.length === 0 && (
                              <div className="px-2 py-1 text-[10px] font-mono italic text-[#736d67]/50 dark:text-[#9c968f]/50">
                                (semestre vazio)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </aside>

        {/* Área Central: Visualizador OU Explorador de Arquivos */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
          {selectedFile ? (
            /* Modo 1: Visualizador de Arquivo em Tela Cheia */
            <div className="flex h-full flex-col">
              {/* Botão de retorno superior */}
              <div className="flex items-center justify-between gap-3 border-b border-[#1a1614]/10 bg-white/70 px-3 sm:px-4 py-2.5 text-xs backdrop-blur-md dark:border-white/10 dark:bg-[#201c19]/70">
                <button
                  type="button"
                  onClick={() => setSelectedFileId(null)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/80 px-3 sm:px-3.5 py-1.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/80 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="sm:hidden">VOLTAR</span>
                  <span className="hidden sm:inline">VOLTAR PARA ARQUIVOS</span>
                </button>
                <span className="truncate font-mono text-[11px] sm:text-xs text-[#736d67] dark:text-[#9c968f]">
                  {activeSemester?.name.toUpperCase()} {activeFolder ? `› ${activeFolder.name.toUpperCase()}` : ""}
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
            <div ref={explorerScrollRef} className="flex h-full flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
              {/* Toolbar e Ações do Explorador */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
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
                      className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
                      title="Subir de nível"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>VOLTAR</span>
                    </button>
                  )}

                  <div>
                    {activeSemester && (
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                        {activeFolder ? `02 / PASTA DE PROJETO` : `01 / CICLO SEMESTRAL`}
                      </p>
                    )}
                    <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#1a1614] dark:text-[#fafbf7]">
                      {activeFolder
                        ? activeFolder.name
                        : activeSemester
                        ? `${activeSemester.name} — ${activeSemester.title}`
                        : "Gerenciador de Projetos"}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Busca Expansível Arc */}
                  {activeSemesterId && currentLevelFiles.length > 0 && (
                    <ExpandingSearch
                      value={search}
                      onChange={setSearch}
                      items={searchItems}
                      onSelect={(item) => setSelectedFileId(item.id)}
                      placeholder="Buscar nesta pasta..."
                    />
                  )}

                  {/* Alternar Grid / Lista com ExpandingButtonGroup Arc */}
                  {activeSemesterId && currentLevelFiles.length > 0 && (
                    <ExpandingButtonGroup
                      className="hidden sm:inline-flex"
                      items={[
                        {
                          id: "grid",
                          label: "Grade",
                          icon: <LayoutGrid className="h-3.5 w-3.5" />,
                          active: viewMode === "grid",
                          onClick: () => setViewMode("grid"),
                        },
                        {
                          id: "list",
                          label: "Lista",
                          icon: <List className="h-3.5 w-3.5" />,
                          active: viewMode === "list",
                          onClick: () => setViewMode("list"),
                        },
                      ]}
                    />
                  )}

                  {/* Baixar Pasta Completa (.zip) */}
                  {activeFolder && (currentLevelFiles.length > 0 || currentSubfolders.length > 0) && (
                    <button
                      type="button"
                      disabled={zippingFolderId === activeFolder.id}
                      onClick={() => void handleDownloadFolderZip(activeFolder)}
                      className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white disabled:opacity-50 dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
                      title="Compactar e baixar todos os arquivos desta pasta"
                    >
                      {zippingFolderId === activeFolder.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c96726]" />
                      ) : (
                        <Archive className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span className="hidden sm:inline">
                        {zippingFolderId === activeFolder.id ? "COMPACTANDO..." : "BAIXAR .ZIP"}
                      </span>
                    </button>
                  )}

                  {/* Ações Administrativas */}
                  {isAdmin && (
                    <>
                      {activeFolder && (
                        <button
                          type="button"
                          onClick={() => handleEditFolder(activeFolder)}
                          className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
                          title="Editar nome ou Ficha Técnica (Integrantes, Links, Resumo)"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[#736d67] dark:text-[#9c968f]" />
                          <span className="hidden md:inline">FICHA</span>
                        </button>
                      )}

                      {activeSemesterId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolder(null);
                            setFolderModalOpen(true);
                          }}
                          className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
                          title="Criar nova pasta neste semestre"
                        >
                          <FolderPlus className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
                          <span>NOVA PASTA</span>
                        </button>
                      )}

                      {!activeSemesterId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSemester(null);
                            setSemesterModalOpen(true);
                          }}
                          className="inline-flex h-8.5 items-center gap-1.5 rounded-full bg-[#1a1614] px-4 font-mono text-xs font-medium text-[#fafbf7] shadow-xs transition hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>NOVO SEMESTRE</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex h-8.5 items-center gap-1.5 rounded-full bg-[#1a1614] px-4 font-mono text-xs font-medium text-[#fafbf7] shadow-xs transition hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          <span>ENVIAR ARQUIVO</span>
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
                  {/* Antimetal-style Editorial Hero */}
                  <div className="relative mb-8 rounded-3xl border border-[#1a1614]/10 bg-white/70 p-6 sm:p-10 shadow-xs backdrop-blur-xs antimetal-dots dark:border-white/10 dark:bg-[#201c19]/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#6d8352]/30 bg-[#6d8352]/10 px-3 py-1 font-mono text-[11px] font-medium tracking-wide text-[#55693e] dark:text-[#8ea573]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#6d8352] animate-pulse" />
                        <span>01 / ARQUIVO DIGITAL · PROJETO INTEGRADOR</span>
                      </div>
                      <div className="inline-flex items-center gap-2 font-mono text-[11px] text-[#736d67] dark:text-[#9c968f]">
                        <span>● SISTEMA VERIFICADO</span>
                        <span>·</span>
                        <span>BUILT WITH PRECISION</span>
                      </div>
                    </div>

                    <h1 className="max-w-3xl font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#1a1614] dark:text-[#fafbf7] leading-tight">
                      O acervo acadêmico que documenta a sua trajetória.
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm sm:text-base text-[#736d67] dark:text-[#9c968f] leading-relaxed">
                      Relatórios técnicos, apresentações de banca, código-fonte e documentações organizados por ciclo semestral com visualização instantânea.
                    </p>

                    {/* Quick metrics in Antimetal monospace chip row */}
                    <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-dashed border-[#1a1614]/15 pt-5 dark:border-white/10">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a1614]/10 bg-white/80 px-2.5 py-1 font-mono text-xs font-medium text-[#1a1614] dark:border-white/10 dark:bg-[#161311]/80 dark:text-[#fafbf7]">
                        <span className="text-[#c96726] dark:text-[#d77435] font-bold">{String(semesters.length).padStart(2, "0")}</span>
                        <span className="text-[#736d67] dark:text-[#9c968f]">SEMESTRES</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a1614]/10 bg-white/80 px-2.5 py-1 font-mono text-xs font-medium text-[#1a1614] dark:border-white/10 dark:bg-[#161311]/80 dark:text-[#fafbf7]">
                        <span className="text-[#c96726] dark:text-[#d77435] font-bold">{String(folders.length).padStart(2, "0")}</span>
                        <span className="text-[#736d67] dark:text-[#9c968f]">PASTAS</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a1614]/10 bg-white/80 px-2.5 py-1 font-mono text-xs font-medium text-[#1a1614] dark:border-white/10 dark:bg-[#161311]/80 dark:text-[#fafbf7]">
                        <span className="text-[#c96726] dark:text-[#d77435] font-bold">{String(files.length).padStart(2, "0")}</span>
                        <span className="text-[#736d67] dark:text-[#9c968f]">DOCUMENTOS</span>
                      </div>
                    </div>
                  </div>

                  {/* Section Title */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                      01 / SELEÇÃO DE SEMESTRES ({semesters.length})
                    </span>
                    <span className="font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
                      Clique para explorar as pastas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {semesters.map((sem, idx) => {
                      const semFilesCount = files.filter((f) => f.semesterId === sem.id).length;
                      const semFoldersCount = folders.filter((f) => f.semesterId === sem.id).length;

                      const semesterMenuItems: ContextMenuItem[] = [
                        {
                          id: "open",
                          label: "Abrir semestre",
                          icon: <FolderOpen className="h-4 w-4 text-[#c96726]" />,
                          onSelect: () => {
                            setActiveSemesterId(sem.id);
                            setActiveFolderId(null);
                          },
                        },
                        {
                          id: "qr",
                          label: "Gerar QR Code",
                          icon: <QrCode className="h-4 w-4 text-[#736d67]" />,
                          onSelect: () => {
                            setActiveSemesterId(sem.id);
                            setActiveFolderId(null);
                            setQrScope("semester");
                            setQrOpen(true);
                          },
                        },
                        ...(isAdmin
                          ? [
                              {
                                id: "edit",
                                label: "Editar semestre",
                                icon: <Edit3 className="h-4 w-4 text-[#736d67]" />,
                                separatorBefore: true,
                                onSelect: () => {
                                  setEditingSemester(sem);
                                  setSemesterModalOpen(true);
                                },
                              },
                              {
                                id: "delete",
                                label: "Excluir semestre",
                                icon: <Trash2 className="h-4 w-4" />,
                                destructive: true,
                                onSelect: () => {
                                  handleDeleteSemester({ stopPropagation: () => {} } as React.MouseEvent, sem);
                                },
                              },
                            ]
                          : []),
                      ];

                      return (
                        <ContextMenu key={sem.id} items={semesterMenuItems}>
                          <div
                            onClick={() => {
                              setActiveSemesterId(sem.id);
                              setActiveFolderId(null);
                            }}
                            className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-[#1a1614]/10 bg-white/80 p-5 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:border-[#c96726]/40 hover:shadow-md dark:border-white/10 dark:bg-[#201c19]/80 dark:hover:border-[#d77435]/40"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c96726]/10 text-[#c96726] transition group-hover:scale-105 dark:bg-[#d77435]/15 dark:text-[#d77435]">
                                    <FolderIcon className="h-5 w-5" />
                                  </div>
                                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                                    {String(idx + 1).padStart(2, "0")} / CICLO
                                  </span>
                                </div>

                                <div
                                  className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DropdownMenu
                                    items={semesterMenuItems}
                                    trigger={
                                      <button
                                        type="button"
                                        className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                        title="Opções do semestre"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </button>
                                    }
                                  />
                                </div>
                              </div>

                              <h3 className="mt-4 font-serif text-2xl font-normal text-[#1a1614] dark:text-[#fafbf7] tracking-tight">
                                {sem.name}
                              </h3>
                              <p className="mt-1 font-sans text-xs text-[#736d67] dark:text-[#9c968f] line-clamp-1">
                                {sem.title || "Projeto Integrador · Engenharia & Computação"}
                              </p>
                            </div>

                            <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#1a1614]/10 pt-3 font-mono text-[11px] text-[#736d67] dark:border-white/10 dark:text-[#9c968f]">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#6d8352] dark:bg-[#7f9564]" />
                                {semFoldersCount} {semFoldersCount === 1 ? "PASTA" : "PASTAS"}
                              </span>
                              <span>{semFilesCount} {semFilesCount === 1 ? "ARQUIVO" : "ARQUIVOS"}</span>
                            </div>
                          </div>
                        </ContextMenu>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NÍVEL 1+: Dentro de um Semestre ou Subpasta */}
              {activeSemesterId && (
                <div className="space-y-6">
                  {/* Ficha Técnica do Projeto Integrador (quando preenchida na pasta ativa) */}
                  {activeFolder &&
                    (activeFolder.description ||
                      activeFolder.advisor ||
                      (activeFolder.members && activeFolder.members.length > 0) ||
                      (activeFolder.links && activeFolder.links.length > 0)) && (
                      <div className="rounded-3xl border border-[#1a1614]/12 bg-white/85 p-5 sm:p-6 shadow-2xs backdrop-blur-xs antimetal-dots dark:border-white/10 dark:bg-[#201c19]/85">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6d8352]/30 bg-[#6d8352]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#55693e] dark:text-[#8ea573]">
                              FICHA TÉCNICA · PROJETO INTEGRADOR
                            </span>
                            {activeFolder.description && (
                              <p className="pt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-[#736d67] dark:text-[#d5cfc9]">
                                {activeFolder.description}
                              </p>
                            )}
                          </div>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleEditFolder(activeFolder)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#1a1614]/15 bg-white px-3 py-1 font-mono text-[10px] font-medium text-[#1a1614] transition hover:border-[#c96726]/40 dark:border-white/15 dark:bg-[#161311] dark:text-[#fafbf7]"
                            >
                              <Edit3 className="h-3 w-3 text-[#c96726] dark:text-[#d77435]" />
                              <span>EDITAR FICHA</span>
                            </button>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-[#1a1614]/12 pt-3.5 dark:border-white/10">
                          {activeFolder.advisor && (
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a1614]/10 bg-[#f5f6f1] px-2.5 py-1 font-mono text-[11px] text-[#1a1614] dark:border-white/10 dark:bg-[#161311] dark:text-[#fafbf7]">
                              <GraduationCap className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
                              <span className="text-[#736d67] dark:text-[#9c968f]">Orientador:</span>
                              <span className="font-medium">{activeFolder.advisor}</span>
                            </div>
                          )}

                          {activeFolder.members && activeFolder.members.length > 0 && (
                            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-[#1a1614]/10 bg-[#f5f6f1] px-2.5 py-1 font-mono text-[11px] text-[#1a1614] dark:border-white/10 dark:bg-[#161311] dark:text-[#fafbf7]">
                              <Users className="h-3.5 w-3.5 text-[#6d8352] dark:text-[#7f9564]" />
                              <span className="text-[#736d67] dark:text-[#9c968f]">Grupo:</span>
                              <span className="font-medium">
                                {activeFolder.members.join(" · ")}
                              </span>
                            </div>
                          )}

                          {activeFolder.links &&
                            activeFolder.links.map((lnk, lIdx) => (
                              <a
                                key={lIdx}
                                href={lnk.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#c96726]/30 bg-[#c96726]/10 px-3 py-1 font-mono text-[11px] font-medium text-[#c96726] transition hover:bg-[#c96726]/18 dark:border-[#d77435]/30 dark:bg-[#d77435]/15 dark:text-[#d77435]"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>{lnk.label}</span>
                              </a>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Seção de Subpastas */}
                  {currentSubfolders.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                          02 / PASTAS DISPONÍVEIS ({currentSubfolders.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {currentSubfolders.map((fld) => {
                          const subFilesCount = files.filter((f) => f.folderId === fld.id).length;
                          const folderMenuItems = buildFolderMenuItems(fld);

                          return (
                            <ContextMenu key={fld.id} items={folderMenuItems}>
                              <div
                                onClick={() => setActiveFolderId(fld.id)}
                                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-[#1a1614]/10 bg-white/80 p-4 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:border-[#c96726]/40 hover:shadow-sm dark:border-white/10 dark:bg-[#201c19]/80 dark:hover:border-[#d77435]/40"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c96726]/10 text-[#c96726] transition group-hover:scale-105 dark:bg-[#d77435]/15 dark:text-[#d77435]">
                                    <FolderIcon className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-sans text-sm font-semibold text-[#1a1614] transition group-hover:text-[#c96726] dark:text-[#fafbf7] dark:group-hover:text-[#d77435]">
                                      {fld.name}
                                    </p>
                                    <p className="font-mono text-[11px] text-[#736d67] dark:text-[#9c968f]">
                                      {subFilesCount} {subFilesCount === 1 ? "ARQUIVO" : "ARQUIVOS"}
                                    </p>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DropdownMenu
                                    items={folderMenuItems}
                                    trigger={
                                      <button
                                        type="button"
                                        className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                        title="Opções da pasta"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </button>
                                    }
                                  />
                                </div>
                              </div>
                            </ContextMenu>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Seção de Arquivos */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                        03 / DOCUMENTOS &amp; ARQUIVOS ({filteredFiles.length})
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {currentLevelFiles.length > 0 && (
                          <>
                            <div className="flex flex-wrap items-center gap-1 rounded-full border border-[#1a1614]/10 bg-white/70 p-0.5 dark:border-white/10 dark:bg-[#201c19]/70">
                              {(
                                [
                                  { id: "all", label: "Todos" },
                                  { id: "docs", label: "Docs" },
                                  { id: "slides", label: "Slides" },
                                  { id: "code", label: "Código" },
                                  { id: "media", label: "Mídia" },
                                ] as const
                              ).map((chip) => (
                                <button
                                  key={chip.id}
                                  type="button"
                                  onClick={() => setCategoryFilter(chip.id)}
                                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-medium transition ${
                                    categoryFilter === chip.id
                                      ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                                      : "text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
                                  }`}
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>

                            <select
                              value={sortBy}
                              onChange={(e) =>
                                setSortBy(e.target.value as "recent" | "name" | "size")
                              }
                              aria-label="Ordenar arquivos"
                              className="h-7.5 rounded-full border border-[#1a1614]/15 bg-white/80 px-2.5 font-mono text-[10px] font-medium text-[#1a1614] outline-none dark:border-white/15 dark:bg-[#201c19]/80 dark:text-[#fafbf7]"
                            >
                              <option value="recent">Mais recentes</option>
                              <option value="name">Nome (A–Z)</option>
                              <option value="size">Maior tamanho</option>
                            </select>
                          </>
                        )}

                        {uploadingCount > 0 && (
                          <span className="flex items-center gap-1.5 font-mono text-xs text-[#c96726] dark:text-[#d77435]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ENVIANDO {uploadingCount}...
                          </span>
                        )}
                      </div>
                    </div>

                    {filteredFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#1a1614]/15 bg-white/60 p-12 text-center antimetal-dots dark:border-white/10 dark:bg-[#201c19]/60">
                        <FolderOpen className="h-10 w-10 text-[#736d67]/50 dark:text-[#9c968f]/50" />
                        <p className="mt-3 font-serif text-lg text-[#1a1614] dark:text-[#fafbf7]">
                          {search || categoryFilter !== "all"
                            ? "Nenhum arquivo corresponde ao filtro atual."
                            : "Nenhum documento nesta pasta."}
                        </p>
                        <p className="mt-1 max-w-sm font-mono text-xs text-[#736d67] dark:text-[#9c968f]">
                          Arraste arquivos PDF, imagens, DOCX ou PPTX diretamente para cá para começar.
                        </p>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1614] px-4 py-2 font-mono text-xs font-medium text-[#fafbf7] shadow-xs transition hover:opacity-90 dark:bg-[#fafbf7] dark:text-[#1a1614]"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                            <span>ENVIAR ARQUIVO</span>
                          </button>
                        )}
                      </div>
                    ) : viewMode === "grid" ? (
                      /* Grade de Arquivos com Preview de Documento */
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {filteredFiles.map((file) => {
                          const fileMenuItems = buildFileMenuItems(file);

                          return (
                            <ContextMenu key={file.id} items={fileMenuItems}>
                              <div
                                onClick={() => setSelectedFileId(file.id)}
                                className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border bg-white/90 p-3.5 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:border-[#c96726]/40 hover:shadow-md dark:bg-[#201c19]/90 dark:hover:border-[#d77435]/40 ${
                                  file.pinned
                                    ? "border-[#c96726]/40 dark:border-[#d77435]/40"
                                    : "border-[#1a1614]/10 dark:border-white/10"
                                }`}
                              >
                                <div>
                                  {/* Preview do Documento no Card */}
                                  <div className="relative mb-3 h-36 sm:h-40 w-full overflow-hidden rounded-xl border border-[#1a1614]/8 bg-[#f5f6f1] dark:border-white/8 dark:bg-[#161311]">
                                    <DocumentPreview file={file} />

                                    {/* Badge com a extensão + Fixado */}
                                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
                                      <span className="rounded-md bg-[#1a1614] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#fafbf7] shadow-xs dark:bg-[#fafbf7] dark:text-[#1a1614]">
                                        {file.extension.toUpperCase() || "ARQ"}
                                      </span>
                                      {file.pinned && (
                                        <span
                                          className="inline-flex items-center gap-0.5 rounded-md bg-[#c96726] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs dark:bg-[#d77435]"
                                          title="Arquivo fixado no topo"
                                        >
                                          <Pin className="h-2.5 w-2.5" />
                                        </span>
                                      )}
                                    </div>

                                    {/* Ações no hover / mobile */}
                                    <div
                                      className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full border border-[#1a1614]/10 bg-white/90 p-1 opacity-90 sm:opacity-0 shadow-xs backdrop-blur-xs transition sm:group-hover:opacity-100 dark:border-white/10 dark:bg-[#1a1614]/90"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <a
                                        href={file.url}
                                        download={file.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full p-1 text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                        title="Baixar arquivo"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                      <DropdownMenu
                                        items={fileMenuItems}
                                        trigger={
                                          <button
                                            type="button"
                                            className="rounded-full p-1 text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                            title="Mais opções"
                                          >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                          </button>
                                        }
                                      />
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteFile(e, file)}
                                          className="rounded-full p-1 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                                          title="Excluir arquivo"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <FileCategoryIcon
                                      category={file.category}
                                      extension={file.extension}
                                      className="h-4 w-4 shrink-0"
                                    />
                                    <p className="truncate font-sans text-xs sm:text-sm font-medium text-[#1a1614] dark:text-[#fafbf7]" title={file.name}>
                                      {file.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#1a1614]/10 pt-2 font-mono text-[11px] text-[#736d67] dark:border-white/10 dark:text-[#9c968f]">
                                  <span className="uppercase font-semibold text-[#c96726] dark:text-[#d77435]">
                                    {file.extension || "ARQ"}
                                  </span>
                                  <span>{formatBytes(file.size)}</span>
                                </div>
                              </div>
                            </ContextMenu>
                          );
                        })}
                      </div>
                    ) : (
                      /* Lista de Arquivos */
                      <div className="divide-y divide-[#1a1614]/8 overflow-hidden rounded-2xl border border-[#1a1614]/10 bg-white/90 shadow-2xs dark:divide-white/8 dark:border-white/10 dark:bg-[#201c19]/90">
                        {filteredFiles.map((file) => {
                          const fileMenuItems = buildFileMenuItems(file);

                          return (
                            <ContextMenu key={file.id} items={fileMenuItems}>
                              <div
                                onClick={() => setSelectedFileId(file.id)}
                                className="group flex cursor-pointer items-center justify-between p-3 text-xs transition hover:bg-[#1a1614]/3 dark:hover:bg-white/3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileCategoryIcon
                                    category={file.category}
                                    extension={file.extension}
                                  />
                                  <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 truncate font-sans font-medium text-[#1a1614] dark:text-[#fafbf7]">
                                      {file.pinned && (
                                        <Pin className="h-3 w-3 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                                      )}
                                      <span className="truncate">{file.name}</span>
                                    </p>
                                    <p className="font-mono text-[10px] text-[#736d67] dark:text-[#9c968f]">
                                      {file.extension.toUpperCase()} · {formatBytes(file.size)}
                                    </p>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-1 opacity-90 sm:opacity-70 transition sm:group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <a
                                    href={file.url}
                                    download={file.name}
                                    className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                    title="Baixar"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                  <DropdownMenu
                                    items={fileMenuItems}
                                    trigger={
                                      <button
                                        type="button"
                                        className="rounded-full p-1.5 text-[#736d67] hover:bg-[#1a1614]/5 hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:bg-white/5 dark:hover:text-[#fafbf7]"
                                        title="Mais opções"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                    }
                                  />
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteFile(e, file)}
                                      className="rounded-full p-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </ContextMenu>
                          );
                        })}
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
        semesterId={targetFolderSemesterId || activeSemesterId || ""}
        parentId={targetFolderParentId !== undefined ? targetFolderParentId : activeFolderId}
        editingFolder={editingFolder}
        onClose={() => {
          setFolderModalOpen(false);
          setTargetFolderSemesterId(null);
          setTargetFolderParentId(undefined);
        }}
        onSaved={(folder, isNew) => {
          if (isNew) {
            setFolders((prev) => [...prev, folder]);
            if (folder.parentId) {
              setExpandedFolders((prev) => ({ ...prev, [folder.parentId!]: true }));
            }
            if (folder.semesterId) {
              setExpandedSemesters((prev) => ({ ...prev, [folder.semesterId]: true }));
            }
          } else {
            setFolders((prev) =>
              prev.map((f) => (f.id === folder.id ? folder : f))
            );
          }
        }}
      />

      <FileActionsModal
        open={fileActionModal.open}
        mode={fileActionModal.mode}
        file={fileActionModal.file}
        semesters={semesters}
        folders={folders}
        onClose={() =>
          setFileActionModal((prev) => ({ ...prev, open: false }))
        }
        onUpdated={(updated) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f))
          );
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        semesters={semesters}
        folders={folders}
        files={files}
        onSelectSemester={(semId) => handleSidebarSelectSemester(semId)}
        onSelectFolder={(fld) => handleSidebarSelectFolder(fld)}
        onSelectFile={(file) => handleSidebarSelectFile(file)}
      />
    </div>
  );
}
