"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import {
  categoryImageFallback,
  resolveCategoryImage,
} from "@/lib/media";
import styles from "./menu.module.css";

type Cat = { id: string; name: string; slug?: string };

export function CategoryRail({ categories }: { categories: Cat[] }) {
  const [active, setActive] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    if (!categories.length) return;

    const onScroll = () => {
      const stickyOffset = 130;
      let current = categories[0]?.id ?? "";
      for (const c of categories) {
        const el = document.getElementById(`cat-${c.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - stickyOffset <= 8) current = c.id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [categories]);

  useEffect(() => {
    const btn = document.querySelector<HTMLElement>(
      `.${styles.catItemOn}`,
    );
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  function goTo(id: string) {
    setActive(id);
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 125;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <nav className={styles.catNav} aria-label="Kategoriler">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`${styles.catItem} ${active === c.id ? styles.catItemOn : ""}`}
          aria-current={active === c.id ? "true" : undefined}
          onClick={() => goTo(c.id)}
        >
          <SafeImage
            src={resolveCategoryImage(c.slug)}
            fallbackSrc={categoryImageFallback()}
            alt=""
            width={44}
            height={44}
            className={styles.catItemImg}
          />
          <span>{c.name}</span>
        </button>
      ))}
    </nav>
  );
}
