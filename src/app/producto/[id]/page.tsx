"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CatalogProduct, getCatalogProductById } from "@/services/catalog";
import {
  MyProductReview,
  ProductReview,
  ProductReviewSummary,
  createProductReview,
  getApprovedProductReviews,
  getMyProductReview,
} from "@/services/reviews";
import { useAuth } from "@/context/AuthContext";
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

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const productId = useMemo(() => {
    const id = Number(params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }, [params.id]);

  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewSummary>({
    count: 0,
    averageRating: 0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [myReview, setMyReview] = useState<MyProductReview | null>(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: "",
  });

  const loadReviews = useCallback(async () => {
    if (!productId) return;

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
      setReviewNotice({ type: "error", text: message });
    } finally {
      setReviewsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError("Producto no valido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getCatalogProductById(productId);
        setProduct(result.product);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el producto.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchProduct();
  }, [productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const loadMyReview = useCallback(async () => {
    if (!productId || !user) {
      setMyReview(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setMyReview(null);
      return;
    }

    try {
      const result = await getMyProductReview(token, productId);
      setMyReview(result.review);
    } catch {
      setMyReview(null);
    }
  }, [productId, user]);

  useEffect(() => {
    void loadMyReview();
  }, [loadMyReview]);

  const disponibilidad = useMemo(() => {
    if (!product) return "";
    return getDisponibilidad(product.tipoAdquisicion, product.stock);
  }, [product]);
  const isOutOfStock = (product?.stock ?? 0) <= 0;

  const showBuyAction = product?.tipoAdquisicion !== "RENTA";
  const showRentAction = product?.tipoAdquisicion !== "VENTA";
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
      setReviewNotice({
        type: "error",
        text: "Debes iniciar sesion para comentar y calificar este producto.",
      });
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

    setReviewNotice(null);
    setShowReviewModal(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) return;

    const token = localStorage.getItem("token");
    if (!token || !user) {
      setReviewNotice({
        type: "error",
        text: "Debes iniciar sesion para enviar una reseña.",
      });
      return;
    }

    const comment = reviewForm.comment.trim();
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      setReviewNotice({ type: "error", text: "Selecciona una calificacion de 1 a 5 estrellas." });
      return;
    }

    if (comment.length < 5 || comment.length > 500) {
      setReviewNotice({
        type: "error",
        text: "El comentario debe tener entre 5 y 500 caracteres.",
      });
      return;
    }

    try {
      setSavingReview(true);
      const result = await createProductReview(token, {
        productId,
        rating: canEditReview ? existingReview?.rating ?? reviewForm.rating : reviewForm.rating,
        comment,
      });
      setReviewNotice({ type: "success", text: result.message });
      setMyReview(result.review);
      setShowReviewModal(false);
      setReviewForm({ rating: 0, comment: "" });
      await loadReviews();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo enviar la reseña.";
      setReviewNotice({ type: "error", text: message });
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
        <span className={styles.crumbSeparator}>/</span>
        <Link href="/catalogo" className={styles.crumbLink}>
          Catalogo
        </Link>
        <span className={styles.crumbSeparator}>/</span>
        <strong className={styles.crumbCurrent}>
          {product?.nombre ?? "Detalle de producto"}
        </strong>
      </nav>

      {loading ? <p className={styles.info}>Cargando producto...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {product ? (
        <>
          <div className={styles.detail}>
            <article className={styles.imagePanel}>
              {product.requiereReceta ? <span className={styles.badge}>REQUIERE RECETA</span> : null}
              <div className={styles.visual}>{getProductMonogram(product.nombre)}</div>
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
                  <p>12 meses</p>
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
                    onClick={() => setNotifyRequested(true)}
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

            {reviewNotice ? (
              <p className={reviewNotice.type === "error" ? styles.error : styles.info}>
                {reviewNotice.text}
              </p>
            ) : null}

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
        </>
      ) : null}
    </section>
  );
}
