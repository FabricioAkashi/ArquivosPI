"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("pi-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("pi-theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className="h-8.5 w-8.5 rounded-full border border-[#1a1614]/15 dark:border-white/15" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#1a1614]/15 bg-white/70 text-[#1a1614] shadow-2xs transition hover:bg-white dark:border-white/15 dark:bg-[#201c19]/70 dark:text-[#fafbf7] dark:hover:bg-[#201c19]"
      title={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label="Alternar tema"
    >
      {dark ? <Sun className="h-3.5 w-3.5 text-[#c96726] dark:text-[#d77435]" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
