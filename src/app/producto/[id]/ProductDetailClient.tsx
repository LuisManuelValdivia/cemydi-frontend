"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogProduct } from "@/services/catalog";
import {
  MyProductReview,
  ProductReview,
  ProductReviewSummary,
  createProductReview,
  getApprovedProductReviews,
  getMyProductReview,
} from "@/services/reviews";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

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
  return `${"★".repeat(safeValue)}${"☆".repeat(5 - safeValue)}`;
}

type ProductDetailClientProps = {
  product: CatalogProduct;
  productId: number;
};

export default function ProductDetailClient({
  product,
  productId,
}: ProductDetailClientProps) {
  const { user } = useAuth();
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewSummary>({
    count: 0,
    averageRating: 0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [myReview, setMyReview] = useState<MyProductReview | null>(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: "",
  });

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
    <section className="mx-auto max-w-[1280px] px-4 pt-[26px] pb-11">
      <nav
        className="mb-[22px] flex flex-wrap items-center gap-2 rounded-[14px] border border-[#d7e4e7] bg-white px-[14px] py-2.5 text-[#62727f]"
        aria-label="Migas de pan"
      >
        <Link href="/" className="rounded-full px-2.5 py-1.5 font-bold text-[#395768] no-underline hover:bg-[#eef4f5]">
          Inicio
        </Link>
        <span className="font-bold text-[#90a3ab]">/</span>
        <Link href="/catalogo" className="rounded-full px-2.5 py-1.5 font-bold text-[#395768] no-underline hover:bg-[#eef4f5]">
          Catálogo
        </Link>
        <span className="font-bold text-[#90a3ab]">/</span>
        <strong className="rounded-full border border-[#cde0e2] bg-[#eff6f7] px-3 py-1.5 text-[#1b5f5d]">
          {product.nombre}
        </strong>
      </nav>

      <div className="grid gap-6 min-[1081px]:grid-cols-2">
        <article className="relative grid min-h-[500px] place-items-center rounded-[28px] border border-[#dbe4e6] bg-white">
          {product.requiereReceta ? (
            <span className="absolute top-[18px] left-[18px] rounded-full bg-[#1c2a3f] px-2.5 py-[5px] text-[0.75rem] font-extrabold text-white">
              REQUIERE RECETA
            </span>
          ) : null}
          <div className="grid h-[340px] w-[340px] place-items-center rounded-[28px] border border-[#d7e3e6] bg-[linear-gradient(160deg,#f4f8f8_0%,#eaf1f3_100%)] text-[5.8rem] font-extrabold tracking-[0.04em] text-[#1f6a67] max-[1080px]:h-[260px] max-[1080px]:w-[260px] max-[1080px]:text-[4.2rem]">
            {getProductMonogram(product.nombre)}
          </div>
        </article>

        <article className="rounded-[28px] border border-[#dbe4e6] bg-white p-[26px]">
          <h1 className="m-0 text-[3.2rem] leading-[1.1] text-[#111f36] max-[1080px]:text-[2.5rem]">
            {product.nombre}
          </h1>
          <div className="mt-4 flex items-center gap-2.5">
            <strong className="text-[2.8rem] text-[#1d6a67]">{formatMoney(product.precio)}</strong>
            <span className="rounded-full bg-[#edf2f3] px-3 py-[5px] font-bold text-[#6a7e87]">
              MXN
            </span>
          </div>

          <div className="mt-5 grid gap-3 min-[700px]:grid-cols-2">
            <div className="rounded-[14px] border border-[#e2eaec] bg-[#f8fbfb] px-4 py-[14px]">
              <h3 className="m-0 text-[0.95rem] uppercase text-[#84959d]">Garantía</h3>
              <p className="mt-2 text-[1.5rem] font-bold text-[#172f3e]">12 meses</p>
            </div>
            <div className="rounded-[14px] border border-[#e2eaec] bg-[#f8fbfb] px-4 py-[14px]">
              <h3 className="m-0 text-[0.95rem] uppercase text-[#84959d]">Disponibilidad</h3>
              <p className={`mt-2 text-[1.5rem] font-bold ${isOutOfStock ? "text-[#a01919]" : "text-[#179a4f]"}`}>
                {disponibilidad}
              </p>
            </div>
          </div>

          <p className="mt-5 text-[1.2rem] leading-[1.6] text-[#36515e]">{product.descripcion}</p>

          <div className="mt-4 grid gap-2">
            <span className="font-semibold text-[#2f4a57]">Clasificación: {product.clasificacion}</span>
            <span className="font-semibold text-[#2f4a57]">Marca: {product.marca}</span>
            <span className="font-semibold text-[#2f4a57]">Modelo: {product.modelo}</span>
            <span className="font-semibold text-[#2f4a57]">
              Tipo de adquisición: {getTipoLabel(product.tipoAdquisicion)}
            </span>
          </div>

          <div className="mt-5 grid gap-2.5">
            {showBuyAction ? (
              <button
                type="button"
                className="rounded-[14px] border-0 bg-[#1f6a67] px-[18px] py-[14px] text-[1.1rem] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d6dde0] disabled:text-[#6e8088]"
                disabled={isOutOfStock}
              >
                Añadir al carrito
              </button>
            ) : null}
            {showRentAction ? (
              <button
                type="button"
                className="rounded-[14px] border-2 border-[#1f6a67] bg-white px-[18px] py-[14px] text-[1.1rem] font-bold text-[#1f6a67] disabled:cursor-not-allowed disabled:border-0 disabled:bg-[#d6dde0] disabled:text-[#6e8088]"
                disabled={isOutOfStock}
              >
                Reservar para renta
              </button>
            ) : null}
            {isOutOfStock ? (
              <button
                type="button"
                className="rounded-[14px] border border-[#1f6a67] bg-white px-[18px] py-3 text-[1.05rem] font-bold text-[#1f6a67] disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => {
                  setNotifyRequested(true);
                  toast.success("Te notificaremos cuando el producto vuelva a tener stock.");
                }}
                disabled={notifyRequested}
              >
                {notifyRequested
                  ? "Te notificaremos cuando haya stock"
                  : "Notificarme cuando esté disponible"}
              </button>
            ) : null}
          </div>

          {product.requiereReceta ? (
            <details className="mt-[18px] rounded-xl border border-[#dce5e8] bg-[#f8fbfc] px-[14px] py-3">
              <summary className="cursor-pointer font-bold text-[#1f2f3a]">
                ¿Qué necesito si requiere receta?
              </summary>
              <p className="mt-2.5 leading-[1.55] text-[#4a606b]">
                Debes presentar receta médica vigente y una identificación oficial.
                El equipo de CEMYDI valida el documento antes de confirmar la compra
                o renta.
              </p>
            </details>
          ) : null}
        </article>
      </div>

      <section className="mt-6 rounded-[22px] border border-[#dbe4e6] bg-white p-5">
        <div className="flex flex-col gap-3 min-[1080px]:flex-row min-[1080px]:items-center min-[1080px]:justify-between">
          <h2 className="m-0 text-[#1a2a37]">Reseñas de clientes</h2>
          <button
            type="button"
            className="rounded-[10px] bg-[#1f6a67] px-[14px] py-2.5 font-bold text-white"
            onClick={onOpenReviewModal}
          >
            {canEditReview ? "Editar comentario" : "Agregar comentario"}
          </button>
        </div>
        <p className="mt-2.5 font-semibold text-[#415f6b]">
          {reviewsSummary.count > 0
            ? `${reviewsSummary.averageRating.toFixed(1)} / 5 (${reviewsSummary.count} reseñas)`
            : "Aún no hay reseñas aprobadas para este producto."}
        </p>

        {reviewsLoading ? (
          <p className="mb-4 rounded-xl bg-[#edf4f5] px-3 py-[11px] font-bold text-[#3d5d66]">
            Cargando reseñas...
          </p>
        ) : null}

        {reviews.length > 0 ? (
          <div className="mt-[14px] grid gap-2.5">
            {reviews.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-[#e0eaec] bg-[#f8fbfc] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[#1a2f3b]">{item.user.nombre}</strong>
                  <span className="text-[0.9rem] text-[#5f7780]">
                    {new Date(item.createdAt).toLocaleDateString("es-MX")}
                  </span>
                </div>
                <p className="mt-[7px] mb-1 text-[1.05rem] tracking-[0.05em] text-[#dc9a1a]">
                  {renderStars(item.rating)}
                </p>
                <p className="m-0 leading-[1.45] text-[#2f4a57]">{item.comment}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {showReviewModal ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(9,19,29,0.58)] p-4"
          onClick={() => {
            if (!savingReview) {
              setShowReviewModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-[540px] rounded-2xl border border-[#d5e2e5] bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-[#192e39]">
              {canEditReview ? "Editar comentario" : "Calificar producto"}
            </h3>
            <form onSubmit={submitReview}>
              <div className="mb-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`grid size-[42px] place-items-center rounded-lg border text-[1.25rem] ${
                      reviewForm.rating >= star
                        ? "border-[#ebb755] bg-[#fff8ea] text-[#d9971a]"
                        : "border-[#d3dde1] bg-white text-[#9aa9af]"
                    }`}
                    onClick={() => {
                      if (canEditReview) return;
                      setReviewForm((prev) => ({ ...prev, rating: star }));
                    }}
                    disabled={canEditReview}
                    aria-label={`Calificar con ${star} estrellas`}
                  >
                    {"★"}
                  </button>
                ))}
              </div>
              {canEditReview ? (
                <p className="mb-4 rounded-xl bg-[#edf4f5] px-3 py-[11px] font-bold text-[#3d5d66]">
                  La calificación no se puede editar.
                </p>
              ) : null}

              <textarea
                placeholder="Escribe tu comentario"
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm((prev) => ({ ...prev, comment: e.target.value }))
                }
                minLength={5}
                maxLength={500}
                className="min-h-[110px] w-full resize-y rounded-[10px] border border-[#d0dde0] p-2.5 text-[#203944] outline-none"
              />

              <div className="mt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  className="rounded-[14px] border-2 border-[#1f6a67] bg-white px-[18px] py-[14px] text-[1.1rem] font-bold text-[#1f6a67] disabled:cursor-not-allowed disabled:border-0 disabled:bg-[#d6dde0] disabled:text-[#6e8088]"
                  onClick={() => setShowReviewModal(false)}
                  disabled={savingReview}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-[14px] border-0 bg-[#1f6a67] px-[18px] py-[14px] text-[1.1rem] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d6dde0] disabled:text-[#6e8088]"
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
