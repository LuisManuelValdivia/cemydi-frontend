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
  imageUrl: string | null;
  images: Array<{
    id: number;
    imageUrl: string;
    sortOrder: number;
    createdAt: string;
  }>;
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
  initializedAt: string | null;
  databaseAgeSeconds: number;
  sizeBytes: number;
  sizePretty: string;
  overview: {
    totalTables: number;
    totalIndexes: number;
    totalRows: number;
    totalSizeBytes: number;
    totalSizePretty: string;
  };
  connections: {
    total: number;
    active: number;
    idle: number;
    idleInTransaction: number;
    internal: number;
    other: number;
    items: Array<{
      pid: number;
      userName: string;
      state: string;
      clientAddress: string;
      applicationName: string;
      backendType: string;
    }>;
  };
  users: Array<{
    userName: string;
    totalConnections: number;
    activeConnections: number;
    internalConnections: number;
  }>;
  indexes: Array<{
    indexName: string;
    tableName: string;
    scans: number;
    sizeBytes: number;
    sizePretty: string;
  }>;
  tables: {
    totalRows: number;
    totalSizeBytes: number;
    totalSizePretty: string;
    totalIndexes: number;
    items: Array<{
      tableName: string;
      rowCount: number;
      sequentialScans: number;
      indexScans: number;
      totalQueries: number;
      totalSizeBytes: number;
      totalSizePretty: string;
      tableSizeBytes: number;
      tableSizePretty: string;
      indexSizeBytes: number;
      indexSizePretty: string;
      indexUsagePercent: number;
    }>;
    topQueried: Array<{
      tableName: string;
      rowCount: number;
      sequentialScans: number;
      indexScans: number;
      totalQueries: number;
      totalSizeBytes: number;
      totalSizePretty: string;
      tableSizeBytes: number;
      tableSizePretty: string;
      indexSizeBytes: number;
      indexSizePretty: string;
      indexUsagePercent: number;
    }>;
  };
  backup: {
    format: string;
    fileExtension: string;
    provider?: string;
  };
};

export type DatabaseBackupRecord = {
  id: number;
  fileName: string;
  origin: "MANUAL" | "AUTOMATIC" | "TABLE";
  sizeBytes: number;
  createdAt: string;
};

export type DatabaseBackupCreationResult = {
  backup: DatabaseBackupRecord;
  message: string;
  logText: string;
};

export type MaintenanceOperation = "VACUUM" | "ANALYZE" | "VACUUM_ANALYZE";

export type MaintenanceRunResult = {
  operation: MaintenanceOperation;
  schemaName: string | null;
  tableName: string | null;
  processedTables: number;
  startedAt: string;
  finishedAt: string;
  logText: string;
  message: string;
};

export type MaintenanceSchedule = {
  enabled: boolean;
  everyDays: number;
  runAtTime: string;
  operation: MaintenanceOperation;
  schemaName: string | null;
  tableName: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DatabaseBackupSchedule = {
  enabled: boolean;
  everyDays: number;
  runAtTime: string;
  retentionDays: number;
  schemaName: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActiveUserSession = {
  sessionId: string;
  userId: number;
  nombre: string;
  correo: string;
  rol: UserRole;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type LoginAuditEntry = {
  id: number;
  userId: number | null;
  nombre: string;
  correo: string;
  success: boolean;
  reason: string | null;
  attemptedAt: string;
};

export type AuthSecurityOverview = {
  activeSessions: ActiveUserSession[];
  loginAttempts: LoginAuditEntry[];
  summary: {
    activeSessions: number;
    recentAttempts: number;
    failedAttempts: number;
  };
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
  imageUrls?: string[];
};

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  keepImageIds?: number[];
};

export type CreateCatalogOptionPayload = {
  nombre: string;
};

export type CreateSupplierPayload = {
  nombre: string;
  encargado: string;
  repartidor: string;
  direccion: string;
};

export type UpdateSupplierPayload = CreateSupplierPayload;

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
    const message = (result as {
      message?: string | string[] | { message?: string };
    }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
    if (typeof message === "object" && message && typeof message.message === "string") {
      return message.message;
    }
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers: Record<string, string> = {};

  if (!isFormDataBody) {
    headers["Content-Type"] = "application/json";
  }

  if (init?.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...(init ?? {}),
    headers,
    credentials: "include",
  });

  const result = await res.json();

  if (!res.ok) {
    const error = new Error(resolveErrorMessage(result, "Error en la solicitud")) as Error & {
      payload?: unknown;
    };
    error.payload = result;
    throw error;
  }

  return result as T;
}

export function listUsers() {
  return request<{ users: AdminUser[] }>("/users", { method: "GET" });
}

export function createUser(payload: CreateUserPayload) {
  return request<{ user: AdminUser; message: string }>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: number, payload: UpdateUserPayload) {
  return request<{ user: AdminUser; message: string }>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number) {
  return request<{ message: string }>(`/users/${id}`, {
    method: "DELETE",
  });
}

export function listProducts() {
  return request<{ products: AdminProduct[] }>("/products?includeInactive=true", {
    method: "GET",
  });
}

export function createProduct(
  payload: CreateProductPayload & { imageFiles?: File[] },
) {
  return request<{ product: AdminProduct; message: string }>("/products", {
    method: "POST",
    body: buildProductFormData(payload),
  });
}

export function updateProduct(
  id: number,
  payload: UpdateProductPayload & { imageFiles?: File[] },
) {
  return request<{ product: AdminProduct; message: string }>(`/products/${id}`, {
    method: "PATCH",
    body: buildProductFormData(payload),
  });
}

export function deleteProduct(id: number) {
  return request<{ message: string }>(`/products/${id}`, {
    method: "DELETE",
  });
}

export function buildProductFormData(payload: UpdateProductPayload & {
  imageFiles?: File[];
}) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (key === "imageUrls" && Array.isArray(value)) {
      value.forEach((item) => formData.append("imageUrls", String(item)));
      return;
    }

    if (key === "keepImageIds" && Array.isArray(value)) {
      value.forEach((item) => formData.append("keepImageIds", String(item)));
      return;
    }

    if (key === "imageFiles" && Array.isArray(value)) {
      (value as File[]).forEach((file) => formData.append("images", file));
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
}

export function listCatalogs() {
  return request<{
    brands: BrandOption[];
    classifications: ClassificationOption[];
  }>("/catalogs", { method: "GET" });
}

export function createBrand(payload: CreateCatalogOptionPayload) {
  return request<{ brand: BrandOption; message: string }>("/catalogs/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBrand(id: number, payload: CreateCatalogOptionPayload) {
  return request<{ brand: BrandOption; message: string }>(`/catalogs/brands/${id}/update`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteBrand(id: number) {
  return request<{ message: string }>(`/catalogs/brands/${id}`, {
    method: "DELETE",
  });
}

export function createClassification(payload: CreateCatalogOptionPayload) {
  return request<{ classification: ClassificationOption; message: string }>(
    "/catalogs/classifications",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function updateClassification(id: number, payload: CreateCatalogOptionPayload) {
  return request<{ classification: ClassificationOption; message: string }>(
    `/catalogs/classifications/${id}/update`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteClassification(id: number) {
  return request<{ message: string }>(`/catalogs/classifications/${id}`, {
    method: "DELETE",
  });
}

export function listSuppliers() {
  return request<{ suppliers: SupplierOption[] }>("/suppliers", {
    method: "GET",
  });
}

export function createSupplier(payload: CreateSupplierPayload) {
  return request<{ supplier: SupplierOption; message: string }>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listPromotions() {
  return request<{ promotions: AdminPromotion[] }>("/promotions?includeExpired=true", {
    method: "GET",
  });
}

export function createPromotion(payload: CreatePromotionPayload) {
  return request<{ promotions: AdminPromotion[]; message: string }>("/promotions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePromotion(id: number) {
  return request<{ message: string }>(`/promotions/${id}`, {
    method: "DELETE",
  });
}

export function updatePromotion(id: number, payload: UpdatePromotionPayload) {
  return request<{ promotion: AdminPromotion; message: string }>(`/promotions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listAdminReviews(params?: {
  status?: ReviewStatus | "ALL";
  userId?: number;
}) {
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
    {
      method: "GET",
    }
  );
}

export function approveReview(id: number) {
  return request<{ review: AdminReview; message: string }>(`/reviews/${id}/approve`, {
    method: "PATCH",
  });
}

export function deleteReview(id: number) {
  return request<{ message: string }>(`/reviews/${id}`, {
    method: "DELETE",
  });
}

export async function downloadDatabaseBackup() {
  const response = await fetch(`${API_URL}/backups/database`, {
    method: "GET",
    credentials: "include",
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

export function listDatabaseBackups() {
  return request<{ backups: DatabaseBackupRecord[] }>("/backups/database/history", {
    method: "GET",
  });
}

export function createDatabaseBackupRecord() {
  return request<DatabaseBackupCreationResult>("/backups/database", {
    method: "POST",
  });
}

export function createSingleTableDatabaseBackupRecord(tableName: string) {
  return request<DatabaseBackupCreationResult>("/backups/database/table", {
    method: "POST",
    body: JSON.stringify({ tableName }),
  });
}

export function createSingleSchemaDatabaseBackupRecord(schemaName: string) {
  return request<DatabaseBackupCreationResult>("/backups/database/schema", {
    method: "POST",
    body: JSON.stringify({ schemaName }),
  });
}

export function runMaintenance(payload: {
  operation: MaintenanceOperation;
  schemaName?: string | null;
  tableName?: string | null;
}) {
  return request<MaintenanceRunResult>("/maintenance/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMaintenanceSchedule() {
  return request<{ schedule: MaintenanceSchedule }>("/maintenance/schedule", {
    method: "GET",
  });
}

export function updateMaintenanceSchedule(payload: {
  enabled: boolean;
  everyDays: number;
  runAtTime: string;
  operation: MaintenanceOperation;
  schemaName?: string | null;
  tableName?: string | null;
}) {
  return request<{ schedule: MaintenanceSchedule; message: string }>(
    "/maintenance/schedule",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteMaintenanceSchedule() {
  return request<{ schedule: MaintenanceSchedule; message: string }>(
    "/maintenance/schedule",
    {
      method: "DELETE",
    }
  );
}

export function deleteDatabaseBackupRecord(id: number) {
  return request<{
    backup: DatabaseBackupRecord;
    message: string;
  }>(`/backups/database/${id}`, {
    method: "DELETE",
  });
}

export async function downloadDatabaseBackupById(id: number) {
  const response = await fetch(`${API_URL}/backups/database/${id}/download`, {
    method: "GET",
    credentials: "include",
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

export function getDatabaseStatus() {
  return request<{ status: DatabaseStatus }>("/backups/database/status", {
    method: "GET",
  });
}

export function getAuthSecurityOverview() {
  return request<{ overview: AuthSecurityOverview }>("/auth/security-overview", {
    method: "GET",
  });
}

export function getDatabaseBackupSchedule() {
  return request<{ schedule: DatabaseBackupSchedule }>("/backups/database/schedule", {
    method: "GET",
  });
}

export function deleteDatabaseBackupSchedule() {
  return request<{
    schedule: DatabaseBackupSchedule;
    message: string;
  }>("/backups/database/schedule", {
    method: "DELETE",
  });
}

export function updateSupplier(id: number, payload: UpdateSupplierPayload) {
  return request<{ supplier: SupplierOption; message: string }>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSupplier(id: number) {
  return request<{ message: string }>(`/suppliers/${id}`, {
    method: "DELETE",
  });
}

export function updateDatabaseBackupSchedule(payload: {
  enabled: boolean;
  everyDays: number;
  runAtTime: string;
  retentionDays: number;
  schemaName?: string | null;
}) {
  return request<{
    schedule: DatabaseBackupSchedule;
    message: string;
  }>("/backups/database/schedule", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
