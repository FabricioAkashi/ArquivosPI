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
      border: "border-rose-200 dark:border-rose-900/60",
      fill: "bg-rose-600 text-white",
      text: "text-rose-600 dark:text-rose-400",
      bgHover: "hover:bg-rose-50 dark:hover:bg-rose-950/30",
    },
    accent: {
      border: "border-neutral-300 dark:border-neutral-700",
      fill: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
      text: "text-neutral-900 dark:text-neutral-100",
      bgHover: "hover:bg-neutral-100 dark:hover:bg-neutral-800",
    },
    neutral: {
      border: "border-neutral-200 dark:border-neutral-800",
      fill: "bg-neutral-700 text-white",
      text: "text-neutral-700 dark:text-neutral-300",
      bgHover: "hover:bg-neutral-100 dark:hover:bg-neutral-800",
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
      className={`relative inline-flex h-9 select-none items-center justify-center overflow-hidden rounded-xl border px-3.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${
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
