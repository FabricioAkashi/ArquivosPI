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
      <div className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-800" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
      title={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label="Alternar tema"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
