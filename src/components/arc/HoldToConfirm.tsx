"use client";

import React, { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Trash2 } from "lucide-react";
import { motionTokens } from "./motion-tokens";

export interface HoldToConfirmProps {
  label: string;
  confirmedLabel?: string;
  onConfirm: () => void;
  duration?: number; // ms, default 1000ms
  icon?: React.ReactNode;
  tone?: "accent" | "danger" | "neutral";
  className?: string;
  disabled?: boolean;
}

export default function HoldToConfirm({
  label,
  confirmedLabel = "Confirmado!",
  onConfirm,
  duration = 1000,
  icon,
  tone = "danger",
  className = "",
  disabled = false,
}: HoldToConfirmProps) {
  const reduced = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [done, setDone] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const cancelHold = () => {
    if (done) return;
    setHolding(false);
    startTimeRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setProgress(0);
  };

  const startHold = () => {
    if (disabled || done) return;
    setHolding(true);
    const start = performance.now();
    startTimeRef.current = start;

    const frame = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        setDone(true);
        setHolding(false);
        onConfirm();
      } else {
        animFrameRef.current = requestAnimationFrame(frame);
      }
    };

    animFrameRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const toneClasses = {
    danger: {
      border: "border-rose-500/40",
      fill: "bg-rose-600 text-white",
      text: "text-rose-600 dark:text-rose-400",
      bgHover: "hover:bg-rose-500/10",
    },
    accent: {
      border: "border-[#c96726]/40 dark:border-[#d77435]/40",
      fill: "bg-[#c96726] text-white dark:bg-[#d77435]",
      text: "text-[#c96726] dark:text-[#d77435]",
      bgHover: "hover:bg-[#c96726]/10",
    },
    neutral: {
      border: "border-[#1a1614]/15 dark:border-white/15",
      fill: "bg-[#1a1614] text-[#fafbf7] dark:bg-[#fafbf7] dark:text-[#1a1614]",
      text: "text-[#1a1614] dark:text-[#fafbf7]",
      bgHover: "hover:bg-black/5 dark:hover:bg-white/5",
    },
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          if (!holding && !done) startHold();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") cancelHold();
      }}
      className={`relative inline-flex h-8.5 select-none items-center justify-center overflow-hidden rounded-full border px-4 font-mono text-xs font-medium shadow-2xs transition-all active:scale-[0.98] ${
        toneClasses.border
      } ${toneClasses.bgHover} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
      title={done ? confirmedLabel : "Segure para confirmar"}
    >
      {/* Barra animada de progresso ao segurar */}
      <motion.div
        className={`absolute inset-0 z-0 origin-left ${toneClasses.fill}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        transition={reduced ? { duration: 0 } : { ease: "linear", duration: 0 }}
      />

      {/* Conteúdo do botão */}
      <div className="relative z-10 flex items-center gap-2">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-white"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ scale: 1 }}
              animate={holding ? { scale: 1.15 } : { scale: 1 }}
              className={progress > 50 ? "text-white" : toneClasses.text}
            >
              {icon || <Trash2 className="h-3.5 w-3.5" />}
            </motion.span>
          )}
        </AnimatePresence>

        <span
          className={`font-medium transition-colors ${
            progress > 50 || done
              ? "text-white"
              : toneClasses.text
          }`}
        >
          {done
            ? confirmedLabel
            : holding
            ? "Continue segurando..."
            : label}
        </span>
      </div>
    </button>
  );
}
