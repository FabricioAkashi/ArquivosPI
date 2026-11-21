"use client";

import React from "react";

interface AmbientOrbsProps {
  className?: string;
}

/**
 * Fundo atmosférico ultra-sutil com gradient orbs animados na paleta Antimetal
 * (cobre metálico, verde sálvia e lima quente). Puramente decorativo e GPU-acelerado.
 */
export default function AmbientOrbs({ className = "" }: AmbientOrbsProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
    >
      {/* Orb 1: Cobre Metálico (canto superior esquerdo / fluxo quente) */}
      <div className="ambient-orb-1 absolute -top-[18%] -left-[12%] h-[420px] w-[420px] rounded-full blur-3xl sm:h-[640px] sm:w-[640px]" />

      {/* Orb 2: Verde Sálvia Técnico (canto direito médio / equilíbrio natural) */}
      <div className="ambient-orb-2 absolute top-[18%] -right-[14%] h-[440px] w-[440px] rounded-full blur-3xl sm:h-[680px] sm:w-[680px]" />

      {/* Orb 3: Lima Quente / Âmbar (inferior central / profundidade sutil) */}
      <div className="ambient-orb-3 absolute -bottom-[22%] left-[22%] h-[400px] w-[400px] rounded-full blur-3xl sm:h-[600px] sm:w-[600px]" />
    </div>
  );
}
