"use client";

import React from "react";

interface AmbientOrbsProps {
  className?: string;
}

/**
 * Fundo atmosférico com gradient orbs animados na paleta Antimetal
 * (cobre metálico, verde sálvia e lima quente), movendo-se continuamente
 * por animações CSS aceleradas via GPU.
 */
export default function AmbientOrbs({ className = "" }: AmbientOrbsProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
    >
      {/* Orb 1: Cobre Metálico (região superior esquerda) */}
      <div className="ambient-orb-1 absolute top-[-6%] left-[2%] h-[360px] w-[360px] rounded-full blur-2xl sm:h-[520px] sm:w-[520px]" />

      {/* Orb 2: Verde Sálvia Técnico (região direita média) */}
      <div className="ambient-orb-2 absolute top-[22%] right-[2%] h-[380px] w-[380px] rounded-full blur-2xl sm:h-[540px] sm:w-[540px]" />

      {/* Orb 3: Lima Quente / Âmbar (região inferior central) */}
      <div className="ambient-orb-3 absolute bottom-[-6%] left-[28%] h-[340px] w-[340px] rounded-full blur-2xl sm:h-[480px] sm:w-[480px]" />
    </div>
  );
}
