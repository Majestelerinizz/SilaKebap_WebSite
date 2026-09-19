import styles from "./AnnouncementBar.module.css";

const MESSAGES = [
  "Min. sipariş 150 TL · Ücretsiz teslimat kampanyası yakında",
  "Teslimat süresi 25–40 dk · Mangaldan taze",
  "İlk siparişte sürpriz ikram · Gel-al’da sıra bekleme",
] as const;

/** CSS-only L→R marquee (no client JS — avoids webpack HMR factory crashes). */
export function AnnouncementBar() {
  const loop = [...MESSAGES, ...MESSAGES];

  return (
    <div className={styles.bar} role="status">
      <div className={styles.track}>
        {loop.map((text, i) => (
          <span
            key={`${i}-${text.slice(0, 12)}`}
            className={styles.msg}
            aria-hidden={i >= MESSAGES.length ? true : undefined}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
