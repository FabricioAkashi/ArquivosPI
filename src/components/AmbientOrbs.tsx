"use client";

import React, { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

interface AmbientOrbsProps {
  className?: string;
}

interface RepellingOrbProps {
  positionClassName: string;
  orbClassName: string;
  radius?: number;
  maxPush?: number;
  reduced: boolean;
}

const SPRING_CONFIG = { stiffness: 45, damping: 22, mass: 1.2 };

function RepellingOrb({
  positionClassName,
  orbClassName,
  radius = 520,
  maxPush = 75,
  reduced,
}: RepellingOrbProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, SPRING_CONFIG);
  const springY = useSpring(rawY, SPRING_CONFIG);

  useEffect(() => {
    if (reduced || typeof window === "undefined") return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const el = anchorRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = cx - e.clientX;
      const dy = cy - e.clientY;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const strength = Math.pow(1 - dist / radius, 1.8);
        const ux = dist > 1 ? dx / dist : 0;
        const uy = dist > 1 ? dy / dist : -1;
        rawX.set(ux * maxPush * strength);
        rawY.set(uy * maxPush * strength);
      } else {
        rawX.set(0);
        rawY.set(0);
      }
    };

    const handlePointerLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [reduced, radius, maxPush, rawX, rawY]);

  return (
    <div ref={anchorRef} className={`absolute ${positionClassName}`}>
      <motion.div
        style={reduced ? undefined : { x: springX, y: springY }}
        className="h-full w-full"
      >
        <div className={`${orbClassName} h-full w-full rounded-full blur-3xl`} />
      </motion.div>
    </div>
  );
}

/**
 * Fundo atmosférico com gradient orbs animados na paleta Antimetal
 * (cobre metálico, verde sálvia e lima quente). Os orbes derivam lentamente
 * sozinhos no fundo e se afastam com suavidade quando o mouse se aproxima.
 */
export default function AmbientOrbs({ className = "" }: AmbientOrbsProps) {
  const reduced = !!useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
    >
      {/* Orb 1: Cobre Metálico (canto superior esquerdo) */}
      <RepellingOrb
        positionClassName="-top-[14%] -left-[8%] h-[460px] w-[460px] sm:h-[680px] sm:w-[680px]"
        orbClassName="ambient-orb-1"
        radius={560}
        maxPush={80}
        reduced={reduced}
      />

      {/* Orb 2: Verde Sálvia Técnico (lateral direita média) */}
      <RepellingOrb
        positionClassName="top-[16%] -right-[10%] h-[480px] w-[480px] sm:h-[720px] sm:w-[720px]"
        orbClassName="ambient-orb-2"
        radius={580}
        maxPush={80}
        reduced={reduced}
      />

      {/* Orb 3: Lima Quente / Âmbar (inferior central) */}
      <RepellingOrb
        positionClassName="-bottom-[18%] left-[22%] h-[440px] w-[440px] sm:h-[640px] sm:w-[640px]"
        orbClassName="ambient-orb-3"
        radius={520}
        maxPush={75}
        reduced={reduced}
      />
    </div>
  );
}
