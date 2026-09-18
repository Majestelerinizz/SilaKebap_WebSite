import styles from "./menu.module.css";

export default function MenuLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className="skeleton" style={{ width: 180, height: 40 }} />
        <div className="skeleton" style={{ width: 84, height: 34 }} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ width: 96, height: 38, borderRadius: 999 }}
          />
        ))}
      </div>
      <div style={{ padding: "8px 16px", display: "grid", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 128, borderRadius: 16 }}
          />
        ))}
      </div>
    </main>
  );
}
