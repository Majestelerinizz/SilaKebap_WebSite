import styles from "./BrandMark.module.css";

type Props = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

export function BrandMark({ size = "md", showWordmark = true }: Props) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} aria-label="Sıla Kebap">
      <span className={styles.badge} aria-hidden>
        SK
      </span>
      {showWordmark ? <span className={styles.word}>Sıla Ops</span> : null}
    </span>
  );
}
