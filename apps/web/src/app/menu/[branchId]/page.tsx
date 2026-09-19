import Link from "next/link";
import { formatTryLabel } from "@silakebap/shared";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SafeImage } from "@/components/SafeImage";
import { apiUrl } from "@/lib/api";
import {
  productImageFallback,
  resolveProductImage,
} from "@/lib/media";
import { CategoryRail, MenuCartSidebar } from "./CategoryRail";
import styles from "./menu.module.css";

type MenuProduct = {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  imageKey: string | null;
  imageUrl: string | null;
};

type MenuResponse = {
  branchId: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    products: MenuProduct[];
  }>;
};

export default async function MenuPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  let menu: MenuResponse | null = null;
  try {
    const res = await fetch(`${apiUrl}/api/catalog/branches/${branchId}/menu`, {
      next: { revalidate: 20 },
    });
    if (res.ok) menu = (await res.json()) as MenuResponse;
  } catch {
    menu = null;
  }

  const cats = menu?.categories ?? [];
  const featured = cats
    .map((c) => c.products.find((p) => p.isAvailable) ?? c.products[0])
    .filter((p): p is MenuProduct => Boolean(p))
    .slice(0, 3);

  return (
    <main className={styles.page}>
      <AnnouncementBar />
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <BrandMark href="/" size={36} showWordmark={false} />
          <div className={styles.branchMeta}>
            <strong>Sıla Kebap</strong>
            <span>
              <i className={styles.live} aria-hidden />
              Açık · Min. 150 TL · 25–40 dk
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <ThemeToggle />
        </div>
      </header>

      {cats.length > 0 ? (
        <div className={styles.stickyWrap}>
          <CategoryRail
            categories={cats.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
            }))}
          />
        </div>
      ) : null}

      {!menu ? (
        <p className={styles.empty}>Menü yüklenemedi. API çalışıyor mu?</p>
      ) : (
        <div className={styles.shell}>
          <div className={styles.mainCol}>
            {featured.length > 0 ? (
              <section className={styles.featured} aria-label="Öne çıkanlar">
                <div className={styles.sectionTitle}>
                  <h2>Öne çıkanlar</h2>
                </div>
                <div className={styles.featuredTrack}>
                  {featured.map((p, i) => (
                    <Link
                      key={`feat-${p.id}`}
                      href={`/menu/${branchId}/product/${p.id}`}
                      className={styles.featCard}
                      prefetch
                    >
                      <div className={styles.featMedia}>
                        <SafeImage
                          src={resolveProductImage(p.slug, p.imageUrl)}
                          fallbackSrc={productImageFallback()}
                          alt={p.name}
                          fill
                          priority={i === 0}
                          sizes="260px"
                          className={styles.featImg}
                        />
                      </div>
                      <div className={styles.featBody}>
                        <strong>{p.name}</strong>
                        <span>{formatTryLabel(p.priceCents)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {cats.map((cat) => (
              <section
                key={cat.id}
                id={`cat-${cat.slug}`}
                className={styles.section}
              >
                <div className={styles.sectionTitle}>
                  <h2>{cat.name}</h2>
                </div>
                <ul className={styles.list}>
                  {cat.products.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/menu/${branchId}/product/${p.id}`}
                        className={styles.row}
                        prefetch
                      >
                        <div className={styles.rowBody}>
                          <strong>{p.name}</strong>
                          {p.description ? <p>{p.description}</p> : null}
                          <div className={styles.rowFoot}>
                            <span className={styles.price}>
                              {formatTryLabel(p.priceCents)}
                            </span>
                            {!p.isAvailable ? (
                              <em className={styles.sold}>Tükendi</em>
                            ) : (
                              <span className={styles.plus} aria-hidden>
                                +
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.rowMedia}>
                          <SafeImage
                            src={resolveProductImage(p.slug, p.imageUrl)}
                            fallbackSrc={productImageFallback()}
                            alt=""
                            width={112}
                            height={112}
                            className={styles.rowImg}
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <MenuCartSidebar branchId={branchId} />
        </div>
      )}
    </main>
  );
}
