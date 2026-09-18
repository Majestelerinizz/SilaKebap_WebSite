import Link from "next/link";
import styles from "./page.module.css";

export default function AdminHome() {
  return (
    <main className={styles.page}>
      <h1>Sıla Kebap Paneller</h1>
      <p>Personel girişi sonrası mutfak, kurye ve yönetim ekranları.</p>
      <nav className={styles.nav}>
        <Link href="/login">Giriş</Link>
        <Link href="/dashboard">Yönetim</Link>
        <Link href="/kitchen">Mutfak</Link>
        <Link href="/courier">Kurye</Link>
      </nav>
    </main>
  );
}
