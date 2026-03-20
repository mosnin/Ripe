"use client";

import { useState, useEffect } from "react";

type Theme = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("ripe-theme") as Theme | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else if (t === "light") {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "";
      // Let prefers-color-scheme take over
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      }
    }
  }

  function selectTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("ripe-theme", t);
    applyTheme(t);
  }

  const options: { value: Theme; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Theme</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => selectTheme(opt.value)}
            className={`rounded-md border px-4 py-2 text-sm transition-colors ${
              theme === opt.value
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] hover:bg-[var(--accent)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mt-2">
        {theme === "system"
          ? "Follows your operating system preference."
          : `Using ${theme} mode.`}
      </p>
    </div>
  );
}
