const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type UserRole = "ADMIN" | "CLIENT";
export type ProductMode = "VENTA" | "RENTA" | "MIXTO";

export type AdminUser = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  direccion: string | null;
  rol: UserRole;
  activo: boolean;
  createdAt?: string;
};

export type AdminProduct = {
  id: number;
  nombre: string;
  marca: string;
  modelo: string;
  descripcion: string;
  precio: number;
  clasificacion: string;
  stock: number;
  proveedor: string;
  tipoAdquisicion: ProductMode;
  requiereReceta: boolean;
  activo: boolean;
  createdAt?: string;
};

export type BrandOption = {
  id: number;
  nombre: string;
  createdAt?: string;
};

export type ClassificationOption = {
  id: number;
  nombre: string;
  createdAt?: string;
};

export type SupplierOption = {
  id: number;
  nombre: string;
  encargado: string;
  repartidor: string;
  direccion: string;
  createdAt?: string;
};

export type PromotionMode = "PRODUCT" | "CATEGORY";

export type AdminPromotion = {
  id: number;
  productId: number;
  descripcion: string;
  startAt: string;
  endAt: string;
  imageUrl: string | null;
  createdAt?: string;
  product: {
    id: number;
    nombre: string;
    clasificacion: string;
    precio: number;
    stock: number;
    activo: boolean;
  };
};

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminReview = {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string;
  status: ReviewStatus;
  approvedAt: string | null;
  createdAt: string;
  product: {
    id: number;
    nombre: string;
  };
  user: {
    id: number;
    nombre: string;
    correo: string;
  };
  approvedBy: {
    id: number;
    nombre: string;
    correo: string;
  } | null;
};

export type DatabaseStatus = {
  checkedAt: string;
  isOnline: boolean;
  databaseName: string;
  dbVersion: string;
  uptimeSeconds: number;
  sizeBytes: number;
  sizePretty: string;
  connections: {
    total: number;
    active: number;
    idle: number;
  };
  transactions: {
    commits: number;
    rollbacks: number;
  };
  tables: {
    totalRows: number;
    totalSizeBytes: number;
    totalSizePretty: string;
    items: Array<{
      tableName: string;
      rowCount: number;
      sizeBytes: number;
      sizePretty: string;
    }>;
  };
  backup: {
    format: string;
    fileExtension: string;
  };
};

export type DatabaseBackupRecord = {
  id: number;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};

export type CreateUserPayload = {
  nombre: string;
  correo: string;
  password: string;
  telefono?: string;
  direccion?: string;
  rol: UserRole;
  activo: boolean;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export type CreateProductPayload = {
  nombre: string;
  marca: string;
  modelo: string;
  descripcion: string;
  precio: number;
  clasificacion: string;
  stock: number;
  proveedor: string;
  tipoAdquisicion: ProductMode;
  requiereReceta: boolean;
  activo: boolean;
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

export type CreateCatalogOptionPayload = {
  nombre: string;
};

export type CreateSupplierPayload = {
  nombre: string;
  encargado: string;
  repartidor: string;
  direccion: string;
};

export type CreatePromotionPayload = {
  mode: PromotionMode;
  productId?: number;
  clasificacion?: string;
  startAt: string;
  endAt: string;
  descripcion: string;
  imageUrl?: string;
};

export type UpdatePromotionPayload = {
  productId?: number;
  startAt?: string;
  endAt?: string;
  descripcion?: string;
  imageUrl?: string;
};

function resolveErrorMessage(result: unknown, fallback: string) {
  if (typeof result === "object" && result !== null && "message" in result) {
    const message = (result as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

function resolveFileNameFromDisposition(
  disposition: string | null,
  fallback: string
) {
  if (!disposition) return fallback;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    } catch {
      return utf8Match[1].replace(/["']/g, "");
    }
  }

  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1].trim();
  }

  return fallback;
}

async function request<T>(
  path: string,
  token: string | null,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (init?.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(resolveErrorMessage(result, "Error en la solicitud"));
  }

  return result as T;
}

export function listUsers(token: string) {
  return request<{ users: AdminUser[] }>("/users", token, { method: "GET" });
}

export function createUser(token: string, payload: CreateUserPayload) {
  return request<{ user: AdminUser; message: string }>("/users", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  token: string,
  id: number,
  payload: UpdateUserPayload
) {
  return request<{ user: AdminUser; message: string }>(`/users/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(token: string, id: number) {
  return request<{ message: string }>(`/users/${id}`, token, {
    method: "DELETE",
  });
}

export function listProducts(token: string) {
  return request<{ products: AdminProduct[] }>("/products?includeInactive=true", token, {
    method: "GET",
  });
}

export function createProduct(token: string, payload: CreateProductPayload) {
  return request<{ product: AdminProduct; message: string }>("/products", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(
  token: string,
  id: number,
  payload: UpdateProductPayload
) {
  return request<{ product: AdminProduct; message: string }>(
    `/products/${id}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteProduct(token: string, id: number) {
  return request<{ message: string }>(`/products/${id}`, token, {
    method: "DELETE",
  });
}

export function listCatalogs(token: string) {
  return request<{
    brands: BrandOption[];
    classifications: ClassificationOption[];
  }>("/catalogs", token, { method: "GET" });
}

export function createBrand(token: string, payload: CreateCatalogOptionPayload) {
  return request<{ brand: BrandOption; message: string }>(
    "/catalogs/brands",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function createClassification(
  token: string,
  payload: CreateCatalogOptionPayload
) {
  return request<{ classification: ClassificationOption; message: string }>(
    "/catalogs/classifications",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function listSuppliers(token: string) {
  return request<{ suppliers: SupplierOption[] }>("/suppliers", token, {
    method: "GET",
  });
}

export function createSupplier(token: string, payload: CreateSupplierPayload) {
  return request<{ supplier: SupplierOption; message: string }>(
    "/suppliers",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function listPromotions(token: string) {
  return request<{ promotions: AdminPromotion[] }>(
    "/promotions?includeExpired=true",
    token,
    {
      method: "GET",
    }
  );
}

export function createPromotion(token: string, payload: CreatePromotionPayload) {
  return request<{ promotions: AdminPromotion[]; message: string }>(
    "/promotions",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function deletePromotion(token: string, id: number) {
  return request<{ message: string }>(`/promotions/${id}`, token, {
    method: "DELETE",
  });
}

export function updatePromotion(token: string, id: number, payload: UpdatePromotionPayload) {
  return request<{ promotion: AdminPromotion; message: string }>(
    `/promotions/${id}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function listAdminReviews(
  token: string,
  params?: { status?: ReviewStatus | "ALL"; userId?: number }
) {
  const search = new URLSearchParams();

  if (params?.status && params.status !== "ALL") {
    search.set("status", params.status);
  }

  if (params?.userId) {
    search.set("userId", String(params.userId));
  }

  const query = search.toString();

  return request<{ reviews: AdminReview[] }>(
    `/reviews/admin${query ? `?${query}` : ""}`,
    token,
    {
      method: "GET",
    }
  );
}

export function approveReview(token: string, id: number) {
  return request<{ review: AdminReview; message: string }>(
    `/reviews/${id}/approve`,
    token,
    {
      method: "PATCH",
    }
  );
}

export function deleteReview(token: string, id: number) {
  return request<{ message: string }>(`/reviews/${id}`, token, {
    method: "DELETE",
  });
}

export async function downloadDatabaseBackup(token: string) {
  const response = await fetch(`${API_URL}/backups/database`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let fallback = "No se pudo generar el respaldo de base de datos";

    try {
      const result = await response.json();
      fallback = resolveErrorMessage(result, fallback);
    } catch {
      // Ignorar parseo de error si la respuesta no es JSON.
    }

    throw new Error(fallback);
  }

  const blob = await response.blob();
  const fallbackName = `cemydi-backup-${new Date().toISOString().slice(0, 10)}.tar`;
  const fileName = resolveFileNameFromDisposition(
    response.headers.get("Content-Disposition"),
    fallbackName
  );

  return { blob, fileName };
}

export function listDatabaseBackups(token: string) {
  return request<{ backups: DatabaseBackupRecord[] }>(
    "/backups/database/history",
    token,
    {
      method: "GET",
    }
  );
}

export function createDatabaseBackupRecord(token: string) {
  return request<{
    backup: DatabaseBackupRecord;
    message: string;
  }>("/backups/database", token, {
    method: "POST",
  });
}

export function createSingleTableDatabaseBackupRecord(
  token: string,
  tableName: string,
) {
  return request<{
    backup: DatabaseBackupRecord;
    message: string;
  }>("/backups/database/table", token, {
    method: "POST",
    body: JSON.stringify({ tableName }),
  });
}

export function deleteDatabaseBackupRecord(token: string, id: number) {
  return request<{
    backup: DatabaseBackupRecord;
    message: string;
  }>(`/backups/database/${id}`, token, {
    method: "DELETE",
  });
}

export async function downloadDatabaseBackupById(token: string, id: number) {
  const response = await fetch(`${API_URL}/backups/database/${id}/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let fallback = "No se pudo descargar el respaldo";

    try {
      const result = await response.json();
      fallback = resolveErrorMessage(result, fallback);
    } catch {
      // Ignorar parseo de error si la respuesta no es JSON.
    }

    throw new Error(fallback);
  }

  const blob = await response.blob();
  const fallbackName = `cemydi_backup_${id}.tar`;
  const fileName = resolveFileNameFromDisposition(
    response.headers.get("Content-Disposition"),
    fallbackName
  );

  return { blob, fileName };
}

export function getDatabaseStatus(token: string) {
  return request<{ status: DatabaseStatus }>("/backups/database/status", token, {
    method: "GET",
  });
}
