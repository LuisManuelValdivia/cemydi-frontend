const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ProductReview = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: number;
    nombre: string;
  };
};

export type ProductReviewSummary = {
  count: number;
  averageRating: number;
};

export type MyProductReview = {
  id: number;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
};

function resolveErrorMessage(result: unknown, fallback: string) {
  if (typeof result === "object" && result !== null && "message" in result) {
    const message = (result as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function getApprovedProductReviews(productId: number) {
  const res = await fetch(`${API_URL}/reviews/product/${productId}`, {
    cache: "no-store",
  });
  const result = (await res.json()) as
    | { reviews: ProductReview[]; summary: ProductReviewSummary }
    | { message?: string | string[] };

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "No se pudieron cargar las reseñas"));
  }

  return result as { reviews: ProductReview[]; summary: ProductReviewSummary };
}

export async function createProductReview(
  token: string,
  payload: { productId: number; rating: number; comment: string },
) {
  const res = await fetch(`${API_URL}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "No se pudo enviar la reseña"));
  }

  return result as { message: string; review: MyProductReview };
}

export async function getMyProductReview(token: string, productId: number) {
  const res = await fetch(`${API_URL}/reviews/product/${productId}/mine`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = (await res.json()) as
    | { review: MyProductReview | null }
    | { message?: string | string[] };

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "No se pudo cargar tu reseña"));
  }

  return result as { review: MyProductReview | null };
}
