import Link from "next/link";
import { ActivePromotion, getActivePromotions } from "@/services/catalog";
import styles from "./page.module.css";

function getProductMonogram(nombre: string) {
  const clean = nombre.trim().toUpperCase();
  if (!clean) return "PR";
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }

  return `${parts[0][0]}${parts[1][0]}`;
}

async function loadPromotions() {
  try {
    const result = await getActivePromotions();
    return result.promotions;
  } catch {
    return [] as ActivePromotion[];
  }
}

export default async function HomePage() {
  const promotions = await loadPromotions();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.bg} />
        <div className={styles.inner}>
          <div className={styles.content}>
            <span className={styles.badge}>Calidad medica certificada</span>

            <h1>Tu bienestar es nuestra prioridad</h1>

            <p>
              Encuentra equipos, ortesis y suministros medicos de alta calidad con garantias seguras
              y asesoria de expertos.
            </p>

            <div className={styles.actions}>
              <Link href="/catalogo" className={styles.primaryBtn}>
                Explorar catalogo
              </Link>
              <Link href="/register" className={styles.secondaryBtn}>
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.promotionsSection}>
        <div className={styles.promotionsInner}>
          <div className={styles.promotionsHeader}>
            <h2>Promociones destacadas</h2>
            <p>Banners interactivos con vigencia activa. Haz clic para ver el producto.</p>
          </div>

          <div className={styles.promotionGrid}>
            {promotions.length === 0 ? (
              <article className={styles.emptyPromotion}>
                <p>No hay promociones activas por ahora.</p>
              </article>
            ) : (
              promotions.slice(0, 8).map((promotion) => (
                <Link
                  key={promotion.id}
                  href={`/producto/${promotion.productId}`}
                  className={styles.promotionCard}
                >
                  <div
                    className={styles.promoVisual}
                    style={
                      promotion.imageUrl
                        ? { backgroundImage: `url(${promotion.imageUrl})` }
                        : undefined
                    }
                  >
                    {!promotion.imageUrl ? (
                      <span>{getProductMonogram(promotion.product.nombre)}</span>
                    ) : null}
                  </div>
                  <div className={styles.promoBody}>
                    <span className={styles.promoBadge}>Promocion activa</span>
                    <h3>{promotion.product.nombre}</h3>
                    <p>{promotion.product.clasificacion}</p>
                    <small>{promotion.descripcion || "Promocion especial vigente."}</small>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
