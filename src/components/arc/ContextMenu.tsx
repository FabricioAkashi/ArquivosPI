"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTokens } from "./motion-tokens";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
  disabled?: boolean;
  className?: string;
}

export default function ContextMenu({
  children,
  items,
  disabled = false,
  className = "",
}: ContextMenuProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled || items.length === 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Calcula posição evitando estourar as bordas da tela
    const menuWidth = 190;
    const menuHeight = items.length * 36 + 20;

    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setPosition({ x, y });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div onContextMenu={handleContextMenu} className={className}>
        {children}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                initial={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.96, y: -2 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.96, y: -2 }
                }
                transition={{ duration: 0.12 }}
                style={{
                  top: `${position.y}px`,
                  left: `${position.x}px`,
                }}
                className="fixed z-[100] min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white/95 p-1 text-xs shadow-2xl backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95"
              >
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    {item.separatorBefore && (
                      <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                    )}
                    <button
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(false);
                        if (item.onSelect) item.onSelect();
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium outline-none transition-colors ${
                        item.destructive
                          ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                      } ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {item.icon && (
                        <span className="h-3.5 w-3.5 shrink-0 text-current">
                          {item.icon}
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  </React.Fragment>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
