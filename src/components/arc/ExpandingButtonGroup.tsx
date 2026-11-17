"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface ExpandingButtonItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  tone?: "neutral" | "danger" | "primary";
}

export interface ExpandingButtonGroupProps {
  items: ExpandingButtonItem[];
  className?: string;
}

export default function ExpandingButtonGroup({
  items,
  className = "",
}: ExpandingButtonGroupProps) {
  const reduced = useReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {items.map((item) => {
        const isHovered = hoveredId === item.id;
        const isActive = item.active || isHovered;

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`group relative flex h-7 items-center gap-1.5 overflow-hidden rounded-lg px-2 text-xs font-medium transition-colors ${
              item.active
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            <span className="shrink-0">{item.icon}</span>

            <motion.span
              layout
              initial={false}
              animate={{
                width: isActive ? "auto" : 0,
                opacity: isActive ? 1 : 0,
              }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 500, damping: 35 }
              }
              className="overflow-hidden whitespace-nowrap text-[11px]"
            >
              {item.label}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
