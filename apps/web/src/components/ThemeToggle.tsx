"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("silakebap.theme", theme);
}

export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("silakebap.theme") as Theme | null;
    const preferred = saved ?? "light";
    setTheme(preferred);
    applyTheme(preferred);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${onDark ? styles.btnOnDark : ""}`}
      onClick={toggle}
    >
      {theme === "dark" ? "Aydınlık" : "Karanlık"}
    </button>
  );
}
