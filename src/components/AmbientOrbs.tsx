"use client";

import React, { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

interface AmbientOrbsProps {
  className?: string;
}

/**
 * Fundo atmosférico com gradient orbs animados na paleta Antimetal
 * (cobre metálico, verde sálvia e lima quente) com paralaxe fluida
 * e brilho reativo ao ponteiro do mouse.
 */
export default function AmbientOrbs({ className = "" }: AmbientOrbsProps) {
  const reduced = !!useReducedMotion();
  const [hasPointer, setHasPointer] = useState(false);

  // Coordenadas normalizadas [-1, 1] para paralaxe suave dos 3 orbs principais
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  // Posição absoluta do ponteiro para o orb seguidor suave
  const pointerX = useMotionValue(-400);
  const pointerY = useMotionValue(-400);

  const springConfig = { stiffness: 55, damping: 24, mass: 1.1 };
  const smoothNormX = useSpring(normX, springConfig);
  const smoothNormY = useSpring(normY, springConfig);

  const cursorX = useSpring(pointerX, { stiffness: 90, damping: 28, mass: 0.8 });
  const cursorY = useSpring(pointerY, { stiffness: 90, damping: 28, mass: 0.8 });

  // Fatores distintos de paralaxe por camada para sensação tridimensional
  const orb1X = useTransform(smoothNormX, [-1, 1], [-42, 42]);
  const orb1Y = useTransform(smoothNormY, [-1, 1], [-32, 32]);

  const orb2X = useTransform(smoothNormX, [-1, 1], [36, -36]);
  const orb2Y = useTransform(smoothNormY, [-1, 1], [28, -28]);

  const orb3X = useTransform(smoothNormX, [-1, 1], [-28, 28]);
  const orb3Y = useTransform(smoothNormY, [-1, 1], [34, -34]);

  useEffect(() => {
    if (reduced || typeof window === "undefined") return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;

      normX.set((e.clientX / vw) * 2 - 1);
      normY.set((e.clientY / vh) * 2 - 1);

      pointerX.set(e.clientX - 190);
      pointerY.set(e.clientY - 190);

      setHasPointer((prev) => (prev ? prev : true));
    };

    const handlePointerLeave = () => {
      normX.set(0);
      normY.set(0);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [reduced, normX, normY, pointerX, pointerY]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
    >
      {/* Orb 1: Cobre Metálico (canto superior esquerdo) */}
      <motion.div
        style={reduced ? undefined : { x: orb1X, y: orb1Y }}
        className="absolute -top-[16%] -left-[10%] h-[460px] w-[460px] sm:h-[680px] sm:w-[680px]"
      >
        <div className="ambient-orb-1 h-full w-full rounded-full blur-3xl" />
      </motion.div>

      {/* Orb 2: Verde Sálvia Técnico (canto direito médio — contra-paralaxe) */}
      <motion.div
        style={reduced ? undefined : { x: orb2X, y: orb2Y }}
        className="absolute top-[14%] -right-[12%] h-[480px] w-[480px] sm:h-[720px] sm:w-[720px]"
      >
        <div className="ambient-orb-2 h-full w-full rounded-full blur-3xl" />
      </motion.div>

      {/* Orb 3: Lima Quente / Âmbar (inferior central) */}
      <motion.div
        style={reduced ? undefined : { x: orb3X, y: orb3Y }}
        className="absolute -bottom-[20%] left-[20%] h-[440px] w-[440px] sm:h-[640px] sm:w-[640px]"
      >
        <div className="ambient-orb-3 h-full w-full rounded-full blur-3xl" />
      </motion.div>

      {/* Orb 4: Halo reativo que acompanha suavemente o mouse no desktop */}
      {!reduced && (
        <motion.div
          style={{ x: cursorX, y: cursorY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: hasPointer ? 1 : 0 }}
          transition={{ duration: 0.45 }}
          className="ambient-orb-cursor hidden md:block absolute top-0 left-0 h-[380px] w-[380px] rounded-full blur-3xl"
        />
      )}
    </div>
  );
}
