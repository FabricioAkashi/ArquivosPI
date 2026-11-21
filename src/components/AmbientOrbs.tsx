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

const SPRING_CONFIG = { stiffness: 65, damping: 18, mass: 0.9 };

function RepellingOrb({
  positionClassName,
  orbClassName,
  radius = 640,
  maxPush = 180,
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
        const strength = Math.pow(1 - dist / radius, 1.35);
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
        <div className={`${orbClassName} h-full w-full rounded-full blur-2xl`} />
      </motion.div>
    </div>
  );
}

/**
 * Fundo atmosférico com gradient orbs animados na paleta Antimetal
 * (cobre metálico, verde sálvia e lima quente). Os orbes derivam
 * continuamente no fundo e se afastam suavemente quando o mouse se aproxima.
 */
export default function AmbientOrbs({ className = "" }: AmbientOrbsProps) {
  const reduced = !!useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
    >
      {/* Orb 1: Cobre Metálico (região superior esquerda) */}
      <RepellingOrb
        positionClassName="top-[-6%] left-[2%] h-[360px] w-[360px] sm:h-[520px] sm:w-[520px]"
        orbClassName="ambient-orb-1"
        radius={620}
        maxPush={185}
        reduced={reduced}
      />

      {/* Orb 2: Verde Sálvia Técnico (região direita média) */}
      <RepellingOrb
        positionClassName="top-[22%] right-[2%] h-[380px] w-[380px] sm:h-[540px] sm:w-[540px]"
        orbClassName="ambient-orb-2"
        radius={640}
        maxPush={185}
        reduced={reduced}
      />

      {/* Orb 3: Lima Quente / Âmbar (região inferior central) */}
      <RepellingOrb
        positionClassName="bottom-[-6%] left-[28%] h-[340px] w-[340px] sm:h-[480px] sm:w-[480px]"
        orbClassName="ambient-orb-3"
        radius={600}
        maxPush={170}
        reduced={reduced}
      />
    </div>
  );
}
