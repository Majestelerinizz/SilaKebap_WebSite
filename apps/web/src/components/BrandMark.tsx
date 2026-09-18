import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/media";
import styles from "./BrandMark.module.css";

export function BrandMark({
  href = "/",
  size = 40,
  showWordmark = true,
  inverted = false,
}: {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${styles.mark} ${inverted ? styles.inverted : ""}`}
    >
      <Image
        src={BRAND.logo}
        alt="Sıla Kebap"
        width={size}
        height={size}
        className={styles.logo}
        priority
      />
      {showWordmark ? <span className={styles.word}>Sıla Kebap</span> : null}
    </Link>
  );
}
