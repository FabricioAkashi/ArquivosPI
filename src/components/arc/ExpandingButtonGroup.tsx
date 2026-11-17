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
      className={`inline-flex items-center gap-1 rounded-full border border-[#1a1614]/15 bg-white/90 p-1 shadow-2xs backdrop-blur-xs dark:border-white/15 dark:bg-[#201c19]/90 ${className}`}
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
            className={`group relative flex h-7 items-center gap-1.5 overflow-hidden rounded-full px-2.5 font-mono text-xs font-medium transition-colors ${
              item.active
                ? "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]"
                : "text-[#736d67] hover:text-[#1a1614] dark:text-[#9c968f] dark:hover:text-[#fafbf7]"
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
