const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type CatalogProduct = {
  id: number;
  nombre: string;
  marca: string;
  modelo: string;
  descripcion: string;
  precio: number;
  clasificacion: string;
  stock: number;
  proveedor: string;
  tipoAdquisicion: "VENTA" | "RENTA" | "MIXTO";
  requiereReceta: boolean;
  activo: boolean;
  imageUrl: string | null;
  images: Array<{
    id: number;
    imageUrl: string;
    sortOrder: number;
    createdAt: string;
  }>;
  createdAt: string;
};

export type ActivePromotion = {
  id: number;
  productId: number;
  descripcion: string;
  startAt: string;
  endAt: string;
  imageUrl: string | null;
  createdAt: string;
  product: {
    id: number;
    nombre: string;
    clasificacion: string;
    precio: number;
    stock: number;
    activo: boolean;
  };
};

type CatalogResponse = {
  products: CatalogProduct[];
  filters?: {
    clasificaciones?: string[];
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
};

function resolveErrorMessage(result: unknown, fallback: string) {
  if (typeof result === "object" && result !== null && "message" in result) {
    const message = (result as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function getCatalogProducts(params: {
  search?: string;
  clasificaciones?: string[];
  tipos?: Array<"VENTA" | "RENTA" | "MIXTO">;
  requiereReceta?: boolean | null;
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.clasificaciones && params.clasificaciones.length > 0) {
    searchParams.set("clasificaciones", params.clasificaciones.join(","));
  }

  if (params.tipos && params.tipos.length > 0) {
    searchParams.set("tipos", params.tipos.join(","));
  }

  if (params.requiereReceta === true) {
    searchParams.set("requiereReceta", "true");
  } else if (params.requiereReceta === false) {
    searchParams.set("requiereReceta", "false");
  }

  if (params.page && Number.isInteger(params.page) && params.page > 0) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize && Number.isInteger(params.pageSize) && params.pageSize > 0) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const query = searchParams.toString();
  const res = await fetch(`${API_URL}/products${query ? `?${query}` : ""}`);
  const result = (await res.json()) as CatalogResponse | { message?: string | string[] };

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "No se pudo cargar el catalogo"));
  }

  return result as CatalogResponse;
}

export async function getCatalogProductById(id: number) {
  const res = await fetch(`${API_URL}/products/${id}`);
  const result = (await res.json()) as
    | { product: CatalogProduct }
    | { message?: string | string[] };

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "No se pudo cargar el producto"));
  }

  return result as { product: CatalogProduct };
}

export async function getActivePromotions() {
  const res = await fetch(`${API_URL}/promotions`, { cache: "no-store" });
  const result = (await res.json()) as
    | { promotions: ActivePromotion[] }
    | { message?: string | string[] };

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "No se pudo cargar promociones"));
  }

  return result as { promotions: ActivePromotion[] };
}
