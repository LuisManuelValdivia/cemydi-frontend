"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getCatalogProducts, type CatalogProduct } from "@/services/catalog";
import {
  MyProductReview,
  ProductReview,
  ProductReviewSummary,
  createProductReview,
  getApprovedProductReviews,
  getMyProductReview,
} from "@/services/reviews";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./producto.module.css";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getProductMonogram(nombre: string) {
  const clean = nombre.trim().toUpperCase();
  if (!clean) return "PR";
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }

  return `${parts[0][0]}${parts[1][0]}`;
}

function getDisponibilidad(
  tipo: CatalogProduct["tipoAdquisicion"],
  stock: number,
) {
  if (stock <= 0) return "No disponible por falta de stock";
  if (tipo === "VENTA") return "Disponible para compra";
  if (tipo === "RENTA") return "Disponible para renta";
  return "Disponible para compra y renta";
}

function getTipoLabel(tipo: CatalogProduct["tipoAdquisicion"]) {
  if (tipo === "VENTA") return "Venta";
  if (tipo === "RENTA") return "Renta";
  return "Ambos";
}

function renderStars(value: number) {
  const safeValue = Math.max(0, Math.min(5, value));
  return `${"\u2605".repeat(safeValue)}${"\u2606".repeat(5 - safeValue)}`;
}

type ProductDetailClientProps = {
  product: CatalogProduct;
  productId: number;
};

export default function ProductDetailClient({
  product,
  productId,
}: ProductDetailClientProps) {
  const router = useRouter();
  const relatedTrackRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<CatalogProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [canScrollRelatedPrev, setCanScrollRelatedPrev] = useState(false);
  const [canScrollRelatedNext, setCanScrollRelatedNext] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewSummary>({
    count: 0,
    averageRating: 0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [myReview, setMyReview] = useState<MyProductReview | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(
    product.imageUrl ?? null,
  );
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: "",
  });
  const galleryImages = useMemo(() => {
    if (product.images.length > 0) {
      return product.images.map((image) => ({
        key: String(image.id),
        url: image.imageUrl,
      }));
    }

    if (product.imageUrl) {
      return [{ key: "primary", url: product.imageUrl }];
    }

    return [] as Array<{ key: string; url: string }>;
  }, [product.imageUrl, product.images]);

  useEffect(() => {
    setSelectedImageUrl(product.imageUrl ?? null);
  }, [product.imageUrl]);

  const selectedImageIndex = useMemo(() => {
    if (!selectedImageUrl) return -1;
    return galleryImages.findIndex((image) => image.url === selectedImageUrl);
  }, [galleryImages, selectedImageUrl]);

  const showGalleryArrows = galleryImages.length > 1;

  const moveGallery = (direction: -1 | 1) => {
    if (galleryImages.length <= 1) return;

    const currentIndex = selectedImageIndex >= 0 ? selectedImageIndex : 0;
    const nextIndex =
      (currentIndex + direction + galleryImages.length) % galleryImages.length;
    setSelectedImageUrl(galleryImages[nextIndex]?.url ?? null);
  };

  const loadReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const result = await getApprovedProductReviews(productId);
      setReviews(result.reviews);
      setReviewsSummary(result.summary);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las reseñas del producto.";
      toast.error(message);
    } finally {
      setReviewsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    let cancelled = false;

    const loadRelatedProducts = async () => {
      try {
        setRelatedLoading(true);
        const result = await getCatalogProducts({
          clasificaciones: [product.clasificacion],
          page: 1,
          pageSize: 8,
        });

        if (cancelled) return;

        setRelatedProducts(
          result.products.filter((item) => item.id !== productId).slice(0, 8),
        );
      } catch {
        if (!cancelled) {
          setRelatedProducts([]);
        }
      } finally {
        if (!cancelled) {
          setRelatedLoading(false);
        }
      }
    };

    void loadRelatedProducts();

    return () => {
      cancelled = true;
    };
  }, [product.clasificacion, productId]);

  const updateRelatedArrows = useCallback(() => {
    const node = relatedTrackRef.current;
    if (!node) {
      setCanScrollRelatedPrev(false);
      setCanScrollRelatedNext(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollRelatedPrev(node.scrollLeft > 8);
    setCanScrollRelatedNext(maxScrollLeft - node.scrollLeft > 8);
  }, []);

  useEffect(() => {
    updateRelatedArrows();
    const node = relatedTrackRef.current;
    if (!node) return;

    const handleScroll = () => updateRelatedArrows();
    node.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateRelatedArrows);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateRelatedArrows);
    };
  }, [relatedProducts, updateRelatedArrows]);

  const scrollRelated = (direction: -1 | 1) => {
    const node = relatedTrackRef.current;
    if (!node) return;

    const card = node.querySelector<HTMLElement>("[data-related-card='true']");
    const scrollAmount = card ? card.offsetWidth + 16 : Math.max(node.clientWidth * 0.8, 280);
    node.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  };

  const loadMyReview = useCallback(async () => {
    if (!user) {
      setMyReview(null);
      return;
    }

    try {
      const result = await getMyProductReview(productId);
      setMyReview(result.review);
    } catch {
      setMyReview(null);
    }
  }, [productId, user]);

  useEffect(() => {
    void loadMyReview();
  }, [loadMyReview]);

  const disponibilidad = useMemo(() => {
    return getDisponibilidad(product.tipoAdquisicion, product.stock);
  }, [product]);
  const isOutOfStock = product.stock <= 0;

  const showBuyAction = product.tipoAdquisicion !== "RENTA";
  const showRentAction = product.tipoAdquisicion !== "VENTA";
  const myApprovedReview = useMemo(() => {
    if (!user?.id) return null;

    const currentUserId = Number(user.id);
    if (!Number.isInteger(currentUserId)) return null;

    return reviews.find((item) => item.user.id === currentUserId) ?? null;
  }, [reviews, user?.id]);
  const existingReview = myReview ?? myApprovedReview;
  const canEditReview = Boolean(existingReview);

  const onOpenReviewModal = () => {
    if (!user) {
      toast.error("Debes iniciar sesión para comentar y calificar este producto.");
      return;
    }

    if (existingReview) {
      setReviewForm({
        rating: existingReview.rating,
        comment: existingReview.comment,
      });
    } else {
      setReviewForm({ rating: 0, comment: "" });
    }

    setShowReviewModal(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Debes iniciar sesión para enviar una reseña.");
      return;
    }

    const comment = reviewForm.comment.trim();
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      toast.error("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }

    if (comment.length < 5 || comment.length > 500) {
      toast.error("El comentario debe tener entre 5 y 500 caracteres.");
      return;
    }

    try {
      setSavingReview(true);
      const result = await createProductReview({
        productId,
        rating: canEditReview ? existingReview?.rating ?? reviewForm.rating : reviewForm.rating,
        comment,
      });
      toast.success(result.message);
      setMyReview(result.review);
      setShowReviewModal(false);
      setReviewForm({ rating: 0, comment: "" });
      await loadReviews();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo enviar la reseña.";
      toast.error(message);
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <section className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Migas de pan">
        <Link href="/" className={styles.crumbLink}>
          Inicio
        </Link>
        <span className={styles.crumbSeparator}>›</span>
        <Link href="/catalogo" className={styles.crumbLink}>
          Catalogo
        </Link>
        <span className={styles.crumbSeparator}>›</span>
        <strong className={styles.crumbCurrent}>{product.nombre}</strong>
      </nav>

      <div className={styles.detail}>
        <article className={styles.imagePanel}>
          {product.requiereReceta ? <span className={styles.badge}>REQUIERE RECETA</span> : null}
          {showGalleryArrows ? (
            <>
              <button
                type="button"
                className={`${styles.galleryArrow} ${styles.galleryArrowLeft}`}
                onClick={() => moveGallery(-1)}
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.galleryArrow} ${styles.galleryArrowRight}`}
                onClick={() => moveGallery(1)}
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          ) : null}
          {selectedImageUrl ? (
            <img
              src={selectedImageUrl}
              alt={product.nombre}
              className={styles.visualImage}
            />
          ) : (
            <div className={styles.visual}>{getProductMonogram(product.nombre)}</div>
          )}

          {galleryImages.length > 1 ? (
            <div className={styles.thumbnailGrid}>
              {galleryImages.map((image, index) => (
                <button
                  key={image.key}
                  type="button"
                  className={`${styles.thumbnailBtn} ${
                    selectedImageUrl === image.url ? styles.thumbnailBtnActive : ""
                  }`}
                  onClick={() => setSelectedImageUrl(image.url)}
                >
                  <img src={image.url} alt={`Vista previa ${index + 1}`} />
                </button>
              ))}
            </div>
          ) : null}
        </article>

        <article className={styles.content}>
          <h1>{product.nombre}</h1>
          <div className={styles.priceRow}>
            <strong>{formatMoney(product.precio)}</strong>
            <span>MXN</span>
          </div>

          <div className={styles.metaGrid}>
            <div>
              <h3>Garantia</h3>
              <p>3 meses</p>
            </div>
            <div>
              <h3>Disponibilidad</h3>
              <p className={isOutOfStock ? styles.stockOff : styles.stock}>
                {disponibilidad}
              </p>
            </div>
          </div>

          <p className={styles.description}>{product.descripcion}</p>

          <div className={styles.specs}>
            <span>Clasificacion: {product.clasificacion}</span>
            <span>Marca: {product.marca}</span>
            <span>Modelo: {product.modelo}</span>
            <span>Tipo de adquisicion: {getTipoLabel(product.tipoAdquisicion)}</span>
          </div>

          <div className={styles.actions}>
            {showBuyAction ? (
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={isOutOfStock}
              >
                Anadir al carrito
              </button>
            ) : null}
            {showRentAction ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={isOutOfStock}
              >
                Reservar para renta
              </button>
            ) : null}
            {isOutOfStock ? (
              <button
                type="button"
                className={styles.notifyBtn}
                onClick={() => {
                  setNotifyRequested(true);
                  toast.success("Te notificaremos cuando el producto vuelva a tener stock.");
                }}
                disabled={notifyRequested}
              >
                {notifyRequested
                  ? "Te notificaremos cuando haya stock"
                  : "Notificarme cuando este disponible"}
              </button>
            ) : null}
          </div>

          {product.requiereReceta ? (
            <details className={styles.faq}>
              <summary>Que necesito si requiere receta?</summary>
              <p>
                Debes presentar receta medica vigente y una identificacion oficial.
                El equipo de CEMYDI valida el documento antes de confirmar la compra
                o renta.
              </p>
            </details>
          ) : null}
        </article>
      </div>

      <section className={styles.relatedSection}>
        <div className={styles.relatedHeader}>
          <h2>Productos relacionados</h2>
          <span>Misma clasificacion</span>
        </div>

        {relatedLoading ? <p className={styles.info}>Cargando productos relacionados...</p> : null}

        {!relatedLoading && relatedProducts.length > 0 ? (
          <div className={styles.relatedCarousel}>
            <button
              type="button"
              className={`${styles.relatedArrow} ${styles.relatedArrowLeft}`}
              onClick={() => scrollRelated(-1)}
              aria-label="Ver productos relacionados anteriores"
              disabled={!canScrollRelatedPrev}
            >
              ‹
            </button>
            <div ref={relatedTrackRef} className={styles.relatedTrack}>
              <div className={styles.relatedGrid}>
            {relatedProducts.map((item) => (
              <article
                key={item.id}
                className={styles.relatedCard}
                data-related-card="true"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/producto/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/producto/${item.id}`);
                  }
                }}
              >
                <div className={styles.relatedImageWrap}>
                  {item.requiereReceta ? (
                    <span className={styles.relatedBadge}>Requiere receta</span>
                  ) : null}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.nombre}
                      className={styles.relatedImage}
                    />
                  ) : (
                    <div className={styles.relatedFallback}>
                      {getProductMonogram(item.nombre)}
                    </div>
                  )}
                </div>
                <div className={styles.relatedBody}>
                  <h3>{item.nombre}</h3>
                  <p>{item.clasificacion}</p>
                  <strong>{formatMoney(item.precio)}</strong>
                </div>
              </article>
            ))}
              </div>
          </div>
            <button
              type="button"
              className={`${styles.relatedArrow} ${styles.relatedArrowRight}`}
              onClick={() => scrollRelated(1)}
              aria-label="Ver más productos relacionados"
              disabled={!canScrollRelatedNext}
            >
              ›
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.reviewSection}>
        <div className={styles.reviewHeader}>
          <h2>Reseñas de clientes</h2>
          <button type="button" className={styles.reviewBtn} onClick={onOpenReviewModal}>
            {canEditReview ? "Editar comentario" : "Agregar comentario"}
          </button>
        </div>
        <p className={styles.reviewSummary}>
          {reviewsSummary.count > 0
            ? `${reviewsSummary.averageRating.toFixed(1)} / 5 (${reviewsSummary.count} reseñas)`
            : "Aun no hay reseñas aprobadas para este producto."}
        </p>

        {reviewsLoading ? <p className={styles.info}>Cargando reseñas...</p> : null}

        {reviews.length > 0 ? (
          <div className={styles.reviewList}>
            {reviews.map((item) => (
              <article key={item.id} className={styles.reviewCard}>
                <div className={styles.reviewCardTop}>
                  <strong>{item.user.nombre}</strong>
                  <span>{new Date(item.createdAt).toLocaleDateString("es-MX")}</span>
                </div>
                <p className={styles.reviewStars}>{renderStars(item.rating)}</p>
                <p className={styles.reviewText}>{item.comment}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {showReviewModal ? (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!savingReview) {
              setShowReviewModal(false);
            }
          }}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{canEditReview ? "Editar comentario" : "Calificar producto"}</h3>
            <form onSubmit={submitReview}>
              <div className={styles.starPicker}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={
                      reviewForm.rating >= star
                        ? `${styles.starBtn} ${styles.starBtnActive}`
                        : styles.starBtn
                    }
                    onClick={() => {
                      if (canEditReview) return;
                      setReviewForm((prev) => ({ ...prev, rating: star }));
                    }}
                    disabled={canEditReview}
                    aria-label={`Calificar con ${star} estrellas`}
                  >
                    {"\u2605"}
                  </button>
                ))}
              </div>
              {canEditReview ? (
                <p className={styles.info}>La calificacion no se puede editar.</p>
              ) : null}

              <textarea
                placeholder="Escribe tu comentario"
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm((prev) => ({ ...prev, comment: e.target.value }))
                }
                minLength={5}
                maxLength={500}
              />

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowReviewModal(false)}
                  disabled={savingReview}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={savingReview}
                >
                  {savingReview
                    ? canEditReview
                      ? "Guardando..."
                      : "Enviando..."
                    : canEditReview
                      ? "Guardar cambios"
                      : "Enviar reseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
