import {
  listCatalogs,
  listSuppliers,
  type AdminProduct,
  type CreateProductPayload,
  type ProductImage,
  type ProductMode,
  type SupplierOption,
} from "@/services/admin";
import type { UploadedFile } from "../components/ui/file-upload-card";

export const PRODUCT_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const PRODUCT_MAX_IMAGES = 10;

function normalizeProductImages(images: ProductImage[] | undefined) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => ({
      ...image,
      id: Number(image.id),
      sortOrder: Number(image.sortOrder) || 0,
      imageUrl: String(image.imageUrl ?? ""),
      createdAt: image.createdAt,
    }))
    .filter((image) => image.id > 0 && image.imageUrl);
}

function getImageNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return lastSegment || "imagen-producto";
  } catch {
    return "imagen-producto";
  }
}

/** Normaliza respuestas de API (precio como string, enums sueltos) para la UI admin. */
export function normalizeAdminProduct(raw: AdminProduct): AdminProduct {
  const precioParsed = parseFloat(String(raw.precio));
  const precio = Number.isFinite(precioParsed) ? precioParsed : 0;

  let tipoAdquisicion: ProductMode = "VENTA";
  if (raw.tipoAdquisicion === "RENTA" || raw.tipoAdquisicion === "MIXTO") {
    tipoAdquisicion = raw.tipoAdquisicion;
  }

  const stockNum = Number(raw.stock);
  const stock = Number.isFinite(stockNum) ? Math.trunc(stockNum) : 0;
  const images = normalizeProductImages(raw.images);
  const imageUrl =
    typeof raw.imageUrl === "string" && raw.imageUrl.trim()
      ? raw.imageUrl.trim()
      : images[0]?.imageUrl ?? null;

  return {
    ...raw,
    precio,
    tipoAdquisicion,
    stock: Math.max(0, stock),
    requiereReceta: Boolean(raw.requiereReceta),
    activo: Boolean(raw.activo),
    imageUrl,
    images,
  };
}

export function normalizeAdminProducts(list: AdminProduct[]): AdminProduct[] {
  return list.map(normalizeAdminProduct);
}

export const PRODUCT_PAGE_SIZE = 8;

/** Campos alineados con `Input` del admin; compatibles con tema claro/oscuro (.dark). */
export const productFieldClassName =
  "h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm";

export const productTextareaClassName =
  "min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm";

export const EMPTY_PRODUCT_FORM = {
  nombre: "",
  marca: "",
  modelo: "",
  descripcion: "",
  precio: 0,
  clasificacion: "",
  stock: 0,
  proveedor: "",
  tipoAdquisicion: "VENTA",
  requiereReceta: false,
  activo: true,
} satisfies CreateProductPayload;

export function createUploadedFileFromProductImage(image: ProductImage): UploadedFile {
  return {
    id: `existing-${image.id}`,
    name: getImageNameFromUrl(image.imageUrl),
    progress: 100,
    size: 0,
    status: "completed",
    previewUrl: image.imageUrl,
    serverImageId: image.id,
  };
}

export type ProductReferenceData = {
  brands: string[];
  classifications: string[];
  suppliers: SupplierOption[];
};

export async function loadProductReferenceData(): Promise<ProductReferenceData> {
  const [catalogsResponse, suppliersResponse] = await Promise.all([
    listCatalogs(),
    listSuppliers(),
  ]);

  return {
    brands: catalogsResponse.brands.map((brand) => brand.nombre),
    classifications: catalogsResponse.classifications.map(
      (classification) => classification.nombre,
    ),
    suppliers: suppliersResponse.suppliers,
  };
}

export function normalizeProductPayload(
  form: CreateProductPayload,
): CreateProductPayload {
  const stockRaw = Number.isFinite(form.stock) ? form.stock : 0;
  return {
    nombre: form.nombre.trim(),
    marca: form.marca.trim(),
    modelo: form.modelo.trim(),
    descripcion: form.descripcion.trim(),
    precio: Number.isFinite(form.precio) ? form.precio : 0,
    clasificacion: form.clasificacion.trim(),
    stock: Math.max(0, Math.trunc(stockRaw)),
    proveedor: form.proveedor.trim(),
    tipoAdquisicion: form.tipoAdquisicion,
    requiereReceta: form.requiereReceta,
    activo: form.activo,
  };
}

export function validateProductForm(form: CreateProductPayload) {
  const nombre = form.nombre.trim();
  if (nombre.length < 2 || nombre.length > 120) {
    return "El nombre debe tener entre 2 y 120 caracteres.";
  }
  if (!form.marca.trim()) return "La marca es obligatoria";
  if (!form.modelo.trim()) return "El modelo es obligatorio";

  const descripcion = form.descripcion.trim();
  if (descripcion.length < 5 || descripcion.length > 400) {
    return "La descripción debe tener entre 5 y 400 caracteres.";
  }

  if (!form.clasificacion.trim()) return "La clasificación es obligatoria";
  if (!form.proveedor.trim()) return "El proveedor es obligatorio";
  if (form.precio < 0) return "El precio no puede ser negativo";
  if (!Number.isInteger(form.stock) || form.stock < 0) {
    return "El stock debe ser un entero 0 o mayor.";
  }
  return null;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getModeLabel(mode: ProductMode) {
  switch (mode) {
    case "RENTA":
      return "Renta";
    case "MIXTO":
      return "Mixto";
    default:
      return "Venta";
  }
}

export function getStatusLabel(active: boolean) {
  return active ? "Activo" : "Inactivo";
}

export function getStockBadgeVariant(stock: number) {
  if (stock <= 0) return "red" as const;
  if (stock <= 5) return "amber" as const;
  return "blue" as const;
}

export function getRecipeBadgeVariant(requiereReceta: boolean) {
  return requiereReceta ? ("amber" as const) : ("emerald" as const);
}
