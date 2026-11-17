"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  FolderOpen,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  ShieldCheck,
  Unlock,
  X,
} from "lucide-react";
import { motionTokens } from "./motion-tokens";

export interface SiteHeaderBreadcrumb {
  id: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface SiteHeaderQuickLink {
  id: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
}

export interface SiteHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onGoHome: () => void;
  breadcrumbs: SiteHeaderBreadcrumb[];
  quickLinks?: SiteHeaderQuickLink[];
  isLockedScope?: boolean;
  lockedLabel?: string;
  isAdmin: boolean;
  onUnlockAllScope?: () => void;
  onOpenQr: () => void;
  onToggleAdmin: () => void;
  themeToggle: React.ReactNode;
  brandMark: React.ReactNode;
  scrollContainer?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const SHEET_COLLAPSE_WIDTH = 768;

export default function SiteHeader({
  sidebarOpen,
  onToggleSidebar,
  onGoHome,
  breadcrumbs,
  quickLinks = [],
  isLockedScope = false,
  lockedLabel = "ACESSO RESTRITO",
  isAdmin,
  onUnlockAllScope,
  onOpenQr,
  onToggleAdmin,
  themeToggle,
  brandMark,
  scrollContainer,
  className = "",
}: SiteHeaderProps) {
  const layoutId = useId();
  const reduced = !!useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [semestersExpanded, setSemestersExpanded] = useState(true);
  const [hoveredCrumb, setHoveredCrumb] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  // Detecta scroll para solidificar o cabeçalho (padrão @uiarc/site-header)
  useEffect(() => {
    const node = scrollContainer?.current ?? null;
    const target: HTMLElement | Window = node ?? window;
    const read = () => (node ? node.scrollTop : window.scrollY);
    const update = () => {
      const y = read();
      setScrolled((prev) => (prev ? y > 4 : y > 8));
    };
    update();
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [scrollContainer]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Fecha o sheet ao clicar fora, pressionar Escape ou redimensionar para desktop
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const handleResize = () => {
      if (window.innerWidth >= SHEET_COLLAPSE_WIDTH) {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen, closeMenu]);

  const sheetTransition = reduced
    ? { duration: 0.12 }
    : motionTokens.spring.smooth;

  return (
    <header
      ref={headerRef}
      data-scrolled={scrolled || undefined}
      className={`relative z-30 shrink-0 border-b transition-colors duration-200 ${
        scrolled
          ? "border-[#1a1614]/15 bg-[#f5f6f1]/95 shadow-xs backdrop-blur-md dark:border-white/15 dark:bg-[#161311]/95"
          : "border-[#1a1614]/10 bg-[#f5f6f1]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#161311]/80"
      } ${className}`}
    >
      {/* Barra Principal */}
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-5">
        {/* Esquerda: Sidebar Toggle + Marca + Breadcrumbs (Desktop) */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1a1614]/15 bg-white/70 text-[#1a1614] shadow-2xs transition hover:bg-white active:scale-95 dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
            title={sidebarOpen ? "Recolher painel lateral" : "Abrir painel lateral"}
            aria-label="Alternar painel lateral"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>

          {/* Brand Tile Antimetal */}
          <button
            type="button"
            onClick={() => {
              closeMenu();
              onGoHome();
            }}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-[#1a1614]/10 bg-white/75 px-2.5 py-1.5 shadow-2xs transition hover:bg-white active:scale-98 dark:border-white/10 dark:bg-[#201c19]/75 dark:hover:bg-[#201c19]"
            title="Ir para o início"
          >
            {brandMark}
            <span className="font-semibold text-xs tracking-tight text-[#1a1614] dark:text-[#fafbf7]">
              Acervo PI
            </span>
            <span className="hidden sm:inline-block rounded bg-[#6d8352]/10 px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-[#55693e] dark:text-[#8ea573]">
              v2.0
            </span>
          </button>

          {/* Badge de Acesso Restrito no Mobile (compacto) */}
          {isLockedScope && !isAdmin && (
            <div className="flex md:hidden min-w-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[110px]">{lockedLabel}</span>
            </div>
          )}

          {/* Breadcrumbs e Cápsula de Navegação (apenas Desktop md+) */}
          <div className="hidden md:flex min-w-0 items-center gap-2">
            <span className="font-mono text-xs text-[#1a1614]/25 dark:text-white/25 select-none">
              /
            </span>

            {isLockedScope && !isAdmin ? (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                <Lock className="h-3 w-3 shrink-0" />
                <span className="truncate">{lockedLabel}</span>
              </div>
            ) : (
              <LayoutGroup id={`${layoutId}-crumbs`}>
                <nav
                  aria-label="Caminho atual"
                  className="flex min-w-0 items-center gap-1 font-mono text-xs"
                  onMouseLeave={() => setHoveredCrumb(null)}
                >
                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    const isInteractive = Boolean(crumb.onClick);
                    const isHovered = hoveredCrumb === crumb.id;

                    return (
                      <React.Fragment key={crumb.id}>
                        {idx > 0 && (
                          <span className="text-[#1a1614]/25 dark:text-white/25 select-none px-0.5">
                            /
                          </span>
                        )}
                        {isInteractive ? (
                          <button
                            type="button"
                            onClick={crumb.onClick}
                            onMouseEnter={() => setHoveredCrumb(crumb.id)}
                            className={`relative truncate max-w-[180px] rounded-full px-2.5 py-1 transition-colors ${
                              crumb.active || isLast
                                ? "font-semibold text-[#1a1614] dark:text-[#fafbf7]"
                                : "font-medium text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
                            }`}
                          >
                            {isHovered && (
                              <motion.span
                                layoutId={`${layoutId}-hover`}
                                transition={motionTokens.spring.snappy}
                                className="absolute inset-0 -z-10 rounded-full bg-[#1a1614]/6 dark:bg-white/10"
                              />
                            )}
                            {(crumb.active || isLast) && (
                              <motion.span
                                layoutId={`${layoutId}-indicator`}
                                transition={motionTokens.spring.morph}
                                className="absolute right-2.5 bottom-0 left-2.5 h-[2px] rounded-full bg-[#c96726] dark:bg-[#d77435]"
                              />
                            )}
                            <span className="relative truncate">{crumb.label}</span>
                          </button>
                        ) : (
                          <span className="relative truncate max-w-[200px] rounded-full px-2.5 py-1 font-semibold text-[#1a1614] dark:text-[#fafbf7]">
                            <motion.span
                              layoutId={`${layoutId}-indicator`}
                              transition={motionTokens.spring.morph}
                              className="absolute right-2.5 bottom-0 left-2.5 h-[2px] rounded-full bg-[#c96726] dark:bg-[#d77435]"
                            />
                            <span className="relative truncate">{crumb.label}</span>
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </nav>
              </LayoutGroup>
            )}

            {isLockedScope && isAdmin && onUnlockAllScope && (
              <button
                type="button"
                onClick={onUnlockAllScope}
                className="ml-1 inline-flex items-center gap-1 rounded-full border border-[#1a1614]/10 bg-[#1a1614]/5 px-2.5 py-1 text-[10px] font-mono font-medium text-[#736d67] transition hover:bg-[#1a1614]/10 dark:border-white/10 dark:bg-white/10 dark:text-[#9c968f]"
                title="Você é admin: clique para liberar a visualização de todo o acervo"
              >
                <span>DESBLOQUEAR TUDO</span>
              </button>
            )}
          </div>
        </div>

        {/* Direita: Ações (Desktop) & Botão Menu Sheet (Mobile) */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Ações completas no Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenQr}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-[#1a1614]/15 bg-white/70 px-3.5 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition hover:bg-white active:scale-97 dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
              title="Gerar QR Code de acesso"
            >
              <QrCode className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
              <span>QR CODE</span>
            </button>

            <button
              type="button"
              onClick={onToggleAdmin}
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-full px-3.5 font-mono text-xs font-medium transition shadow-2xs active:scale-97 ${
                isAdmin
                  ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                  : "border border-[#1a1614]/15 bg-white/70 text-[#1a1614] hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
              }`}
              title={
                isAdmin
                  ? "Modo edição ativo (clique para bloquear)"
                  : "Destravar modo admin para gerenciar arquivos e pastas"
              }
            >
              {isAdmin ? (
                <>
                  <Unlock className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" />
                  <span>ADMIN ATIVO</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-[#736d67] dark:text-[#9c968f]" />
                  <span>GERENCIAR</span>
                </>
              )}
            </button>
          </div>

          {/* Theme Toggle sempre acessível sem espremer */}
          {themeToggle}

          {/* Botão de Menu Mobile (@uiarc/site-header sheet trigger) */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu de navegação"}
            className={`inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full border transition active:scale-95 ${
              menuOpen
                ? "border-[#c96726]/40 bg-[#c96726] text-white dark:border-[#d77435]/40 dark:bg-[#d77435]"
                : "border-[#1a1614]/15 bg-white/75 text-[#1a1614] shadow-2xs hover:bg-white dark:border-white/15 dark:bg-[#201c19]/75 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "close" : "open"}
                initial={reduced ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.8 }}
                transition={{ duration: 0.14 }}
                className="flex items-center justify-center"
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Sheet & Scrim (@uiarc/site-header responsive pattern) */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Scrim de fundo */}
            <motion.div
              key="mobile-sheet-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={closeMenu}
              className="fixed inset-x-0 top-14 bottom-0 z-30 bg-black/30 backdrop-blur-xs md:hidden"
              aria-hidden="true"
            />

            {/* Painel Sheet deslizante */}
            <motion.div
              key="mobile-sheet-panel"
              initial={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: -10 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8 }
              }
              transition={sheetTransition}
              className="absolute inset-x-0 top-full z-40 border-b border-[#1a1614]/15 bg-[#f5f6f1]/98 shadow-xl backdrop-blur-lg md:hidden dark:border-white/15 dark:bg-[#161311]/98"
            >
              <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
                {/* 01 / Localização Atual (Breadcrumbs confortáveis para toque) */}
                <div>
                  <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#6d8352] dark:text-[#7f9564]">
                    01 / CAMINHO ATUAL
                  </span>
                  {isLockedScope && !isAdmin ? (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>{lockedLabel}</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#1a1614]/10 bg-white/75 p-2.5 dark:border-white/10 dark:bg-[#201c19]/75">
                      {breadcrumbs.map((crumb, idx) => {
                        const isLast = idx === breadcrumbs.length - 1;
                        return (
                          <React.Fragment key={crumb.id}>
                            {idx > 0 && (
                              <span className="font-mono text-xs text-[#1a1614]/30 dark:text-white/30">
                                /
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={!crumb.onClick}
                              onClick={() => {
                                crumb.onClick?.();
                                closeMenu();
                              }}
                              className={`min-h-[34px] rounded-full px-3 py-1 font-mono text-xs transition ${
                                isLast || crumb.active
                                  ? "bg-[#1a1614] text-[#fafbf7] font-semibold dark:bg-[#fafbf7] dark:text-[#1a1614]"
                                  : "bg-[#1a1614]/5 text-[#736d67] active:bg-[#1a1614]/15 dark:bg-white/5 dark:text-[#9c968f]"
                              }`}
                            >
                              {crumb.label}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 02 / Semestres Rápidos (Accordion estilo @uiarc/site-header) */}
                {quickLinks.length > 0 && (
                  <div className="border-t border-dashed border-[#1a1614]/15 pt-3 dark:border-white/10">
                    <button
                      type="button"
                      aria-expanded={semestersExpanded}
                      onClick={() => setSemestersExpanded((prev) => !prev)}
                      className="flex w-full min-h-[44px] items-center justify-between px-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#1a1614] dark:text-[#fafbf7]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[#6d8352] dark:text-[#7f9564]">
                          02 / SEMESTRES ({quickLinks.length})
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[#736d67] transition-transform duration-200 dark:text-[#9c968f] ${
                          semestersExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {semestersExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 grid grid-cols-1 gap-1.5 pb-1">
                            {quickLinks.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  item.onSelect();
                                  closeMenu();
                                }}
                                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 font-mono text-xs transition ${
                                  item.active
                                    ? "bg-[#c96726]/12 text-[#1a1614] font-semibold border border-[#c96726]/30 dark:bg-[#d77435]/15 dark:text-[#fafbf7]"
                                    : "bg-white/60 text-[#736d67] hover:bg-white dark:bg-[#201c19]/60 dark:text-[#9c968f]"
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#c96726] dark:text-[#d77435]" />
                                  <span className="truncate">{item.label}</span>
                                </span>
                                {item.active && (
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#c96726] dark:bg-[#d77435]" />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 03 / Ações Principais (Grade 2 colunas estilo @uiarc/site-header) */}
                <div className="border-t border-dashed border-[#1a1614]/15 pt-4 dark:border-white/10">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        onOpenQr();
                      }}
                      className="flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-[#1a1614]/15 bg-white px-4 font-mono text-xs font-medium text-[#1a1614] shadow-2xs transition active:scale-97 dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                    >
                      <QrCode className="h-4 w-4 text-[#c96726] dark:text-[#d77435]" />
                      <span>QR CODE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        onToggleAdmin();
                      }}
                      className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full px-4 font-mono text-xs font-medium shadow-2xs transition active:scale-97 ${
                        isAdmin
                          ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                          : "border border-[#1a1614]/15 bg-white text-[#1a1614] dark:border-white/15 dark:bg-[#201c19] dark:text-[#fafbf7]"
                      }`}
                    >
                      {isAdmin ? (
                        <>
                          <Unlock className="h-4 w-4 text-[#c96726] dark:text-[#d77435]" />
                          <span>ADMIN ATIVO</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-[#736d67] dark:text-[#9c968f]" />
                          <span>GERENCIAR</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isLockedScope && isAdmin && onUnlockAllScope && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        onUnlockAllScope();
                      }}
                      className="mt-2.5 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full border border-[#6d8352]/30 bg-[#6d8352]/10 px-4 font-mono text-xs font-medium text-[#55693e] transition active:scale-98 dark:text-[#8ea573]"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>DESBLOQUEAR TODO O ACERVO</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
