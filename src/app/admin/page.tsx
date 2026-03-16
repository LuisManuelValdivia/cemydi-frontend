"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AdminReview,
  AdminPromotion,
  AdminProduct,
  AdminUser,
  BrandOption,
  ClassificationOption,
  CreatePromotionPayload,
  DatabaseBackupRecord,
  DatabaseStatus,
  ProductMode,
  ReviewStatus,
  SupplierOption,
  UserRole,
  approveReview,
  createBrand,
  createClassification,
  createProduct,
  createPromotion,
  createSupplier,
  createUser,
  deleteReview,
  deletePromotion,
  deleteProduct,
  deleteUser,
  createDatabaseBackupRecord,
  createSingleTableDatabaseBackupRecord,
  deleteDatabaseBackupRecord,
  downloadDatabaseBackupById,
  getDatabaseStatus,
  listAdminReviews,
  listDatabaseBackups,
  listCatalogs,
  listProducts,
  listPromotions,
  listSuppliers,
  listUsers,
  updateProduct,
  updatePromotion,
  updateUser,
} from "@/services/admin";
import { ConfirmDialog, ToastViewport, type ToastItem } from "@/components/feedback";
import { updateMyProfile } from "@/services/users";
import styles from "./admin.module.css";

type Section =
  | "overview"
  | "users"
  | "products"
  | "catalogs"
  | "suppliers"
  | "promotions"
  | "reviews"
  | "profile"
  | "dbMonitoring"
  | "extras";
type Notice = { type: "success" | "error"; text: string } | null;
type ConfirmRequest = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};
const USER_PAGE_SIZE = 10;
const PRODUCT_PAGE_SIZE = 10;
const PROMOTION_PAGE_SIZE = 10;
const BACKUP_PAGE_SIZE = 10;
const CATALOG_PAGE_SIZE = 10;

const PRODUCT_CSV_COLUMNS = [
  { key: "nombre", label: "Nombre", required: true },
  { key: "marca", label: "Marca", required: true },
  { key: "modelo", label: "Modelo", required: true },
  { key: "descripcion", label: "Descripcion", required: true },
  { key: "precio", label: "Precio", required: true },
  { key: "clasificacion", label: "Clasificacion", required: true },
  { key: "stock", label: "Stock", required: true },
  { key: "proveedor", label: "Proveedor", required: true },
  { key: "tipoAdquisicion", label: "TipoAdquisicion", required: true },
  { key: "requiereReceta", label: "RequiereReceta", required: false },
  { key: "activo", label: "Activo", required: false },
] as const;

type ProductCsvColumnKey = (typeof PRODUCT_CSV_COLUMNS)[number]["key"];

type ProductImportPayload = {
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

type ProductCsvImportRow = {
  lineNumber: number;
  nombre: string;
  modelo: string;
  precioRaw: string;
  stockRaw: string;
  normalizedModel: string;
  payload: ProductImportPayload;
  validationError: string | null;
  duplicateExistingModel: boolean;
  duplicateInFile: boolean;
};

type ProductCsvImportPreview = {
  fileName: string;
  rows: ProductCsvImportRow[];
};

const PRODUCT_CSV_HEADER_ALIASES: Record<ProductCsvColumnKey, string[]> = {
  nombre: ["nombre"],
  marca: ["marca"],
  modelo: ["modelo", "codigomodelo", "modelocode"],
  descripcion: ["descripcion", "descrip", "descripcionproducto"],
  precio: ["precio", "coste", "costo"],
  clasificacion: ["clasificacion", "categoria"],
  stock: ["stock", "existencia", "inventario"],
  proveedor: ["proveedor", "supplier"],
  tipoAdquisicion: ["tipoadquisicion", "tipo_adquisicion", "tipo"],
  requiereReceta: ["requierereceta", "requiere_receta", "receta"],
  activo: ["activo", "estado"],
};

const defaultUserForm = {
  nombre: "",
  correo: "",
  password: "",
  telefono: "",
  direccion: "",
  rol: "CLIENT" as UserRole,
  activo: true,
};

const defaultProductForm = {
  nombre: "",
  marca: "",
  modelo: "",
  descripcion: "",
  precio: "",
  clasificacion: "",
  stock: "",
  proveedor: "",
  tipoAdquisicion: "VENTA" as ProductMode,
  requiereReceta: false,
  activo: true,
};

const defaultCatalogForm = {
  marca: "",
  clasificacion: "",
};

const defaultSupplierForm = {
  nombre: "",
  encargado: "",
  repartidor: "",
  direccion: "",
};

const defaultPromotionForm = {
  mode: "PRODUCT" as CreatePromotionPayload["mode"],
  productId: "",
  clasificacion: "",
  startAt: "",
  endAt: "",
  descripcion: "",
  imageUrl: "",
};

const NAME_REGEX = /^[A-Za-zÀ-ÿ\s'.-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,72}$/;

function sortByName<T extends { nombre: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

function validateUserPayload(form: typeof defaultUserForm, editing: boolean) {
  const nombre = form.nombre.trim();
  const correo = form.correo.trim();
  const password = form.password.trim();
  const telefono = form.telefono.trim();
  const direccion = form.direccion.trim();

  if (nombre.length < 2 || nombre.length > 120 || !NAME_REGEX.test(nombre)) {
    return "Nombre invalido. Usa solo letras y minimo 2 caracteres.";
  }

  if (!EMAIL_REGEX.test(correo) || correo.length > 120) {
    return "Correo invalido.";
  }

  if (!editing && !PASSWORD_REGEX.test(password)) {
    return "Password invalido. Minimo 6, con letras y numeros.";
  }

  if (editing && password && !PASSWORD_REGEX.test(password)) {
    return "El nuevo password debe tener minimo 6, con letras y numeros.";
  }

  if (telefono && !PHONE_REGEX.test(telefono)) {
    return "Telefono invalido.";
  }

  if (direccion && (direccion.length < 5 || direccion.length > 180)) {
    return "Direccion invalida. Entre 5 y 180 caracteres.";
  }

  return null;
}

function validateProductPayload(form: typeof defaultProductForm) {
  const nombre = form.nombre.trim();
  const descripcion = form.descripcion.trim();
  const precioRaw = form.precio.trim();
  const stockRaw = form.stock.trim();

  if (nombre.length < 2 || nombre.length > 120) {
    return "Nombre de producto invalido.";
  }

  if (!form.marca.trim() || !form.modelo.trim() || !form.clasificacion.trim() || !form.proveedor.trim()) {
    return "Selecciona marca, modelo, clasificacion y proveedor.";
  }

  if (descripcion.length < 5 || descripcion.length > 400) {
    return "Descripcion invalida. Entre 5 y 400 caracteres.";
  }

  if (precioRaw === "" || stockRaw === "") {
    return "Precio y stock son obligatorios.";
  }

  const precio = Number(precioRaw);
  const stock = Number(stockRaw);

  if (!Number.isFinite(precio) || precio < 0) {
    return "Precio invalido. Puede ser 0 o mayor.";
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return "Stock invalido. Debe ser entero 0 o mayor.";
  }

  return null;
}

function validateCatalogName(value: string, label: string) {
  const nombre = value.trim();
  if (nombre.length < 2 || nombre.length > 80) {
    return `${label} invalida. Entre 2 y 80 caracteres.`;
  }

  return null;
}

function validateSupplierPayload(form: typeof defaultSupplierForm) {
  const nombre = form.nombre.trim();
  const encargado = form.encargado.trim();
  const repartidor = form.repartidor.trim();
  const direccion = form.direccion.trim();

  if (nombre.length < 2 || nombre.length > 120) {
    return "Nombre de proveedor invalido.";
  }

  if (encargado.length < 2 || encargado.length > 120) {
    return "Nombre de encargado invalido.";
  }

  if (repartidor.length < 2 || repartidor.length > 120) {
    return "Nombre de repartidor invalido.";
  }

  if (direccion.length < 5 || direccion.length > 180) {
    return "Direccion invalida. Entre 5 y 180 caracteres.";
  }

  return null;
}

function validatePromotionPayload(form: typeof defaultPromotionForm) {
  if (form.mode === "PRODUCT") {
    const productId = Number(form.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return "Selecciona un producto para la promocion.";
    }
  }

  if (form.mode === "CATEGORY") {
    if (!form.clasificacion.trim()) {
      return "Selecciona una clasificacion para aplicar promociones.";
    }
  }

  if (!form.startAt || !form.endAt) {
    return "Selecciona fecha de inicio y fecha final.";
  }

  const descripcion = form.descripcion.trim();
  if (descripcion.length < 5 || descripcion.length > 240) {
    return "Descripcion de promocion invalida. Entre 5 y 240 caracteres.";
  }

  const startAt = new Date(form.startAt);
  const endAt = new Date(form.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return "Fechas de promocion invalidas.";
  }

  if (startAt >= endAt) {
    return "La fecha final debe ser posterior a la fecha de inicio.";
  }

  if (form.imageUrl.trim().length > 500) {
    return "La URL de imagen es demasiado larga.";
  }

  return null;
}

function validateProfilePayload(form: {
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  password: string;
  confirmPassword: string;
}) {
  const nombre = form.nombre.trim();
  const correo = form.correo.trim();
  const telefono = form.telefono.trim();
  const direccion = form.direccion.trim();
  const password = form.password.trim();
  const confirmPassword = form.confirmPassword.trim();

  if (nombre.length < 2 || nombre.length > 120 || !NAME_REGEX.test(nombre)) {
    return "Nombre invalido. Usa solo letras y minimo 2 caracteres.";
  }

  if (!EMAIL_REGEX.test(correo) || correo.length > 120) {
    return "Correo invalido.";
  }

  if (telefono && !PHONE_REGEX.test(telefono)) {
    return "Telefono invalido.";
  }

  if (direccion && (direccion.length < 5 || direccion.length > 180)) {
    return "Direccion invalida. Entre 5 y 180 caracteres.";
  }

  if (password || confirmPassword) {
    if (!PASSWORD_REGEX.test(password)) {
      return "El nuevo password debe tener minimo 6, con letras y numeros.";
    }

    if (password !== confirmPassword) {
      return "La confirmacion del password no coincide.";
    }
  }

  return null;
}

function formatReviewStatus(status: ReviewStatus) {
  if (status === "PENDING") return "Pendiente";
  if (status === "APPROVED") return "Aprobada";
  return "Rechazada";
}

function renderRatingStars(rating: number) {
  const safe = Math.max(0, Math.min(5, Math.floor(rating)));
  return `${"\u2605".repeat(safe)}${"\u2606".repeat(5 - safe)}`;
}

type SaveFilePickerType = {
  description: string;
  accept: Record<string, string[]>;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: SaveFilePickerType[];
};

type SaveFilePickerWritable = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
};

type SaveFilePickerHandle = {
  createWritable(): Promise<SaveFilePickerWritable>;
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<SaveFilePickerHandle>;
};

async function saveBlobAsFile(blob: Blob, fileName: string) {
  const safeWindow = window as SavePickerWindow;

  if (typeof safeWindow.showSaveFilePicker === "function") {
    try {
      const handle = await safeWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Respaldo de base de datos (.tar)",
            accept: {
              "application/x-tar": [".tar"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }
      throw error;
    }
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Sin datos";
  }

  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatTableName(tableName: string) {
  return tableName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBackupRecordDate(backup: DatabaseBackupRecord) {
  const fileNameMatch = backup.fileName.match(/_(\d{8})_(\d{6})\.tar$/i);
  if (fileNameMatch) {
    const [, datePart, timePart] = fileNameMatch;
    const year = Number(datePart.slice(0, 4));
    const month = Number(datePart.slice(4, 6));
    const day = Number(datePart.slice(6, 8));
    const hour = Number(timePart.slice(0, 2));
    const minute = Number(timePart.slice(2, 4));
    const second = Number(timePart.slice(4, 6));
    const parsedFromFileName = new Date(year, month - 1, day, hour, minute, second);

    if (!Number.isNaN(parsedFromFileName.getTime())) {
      return parsedFromFileName.toLocaleString("es-MX");
    }
  }

  const parsedCreatedAt = new Date(backup.createdAt);
  if (!Number.isNaN(parsedCreatedAt.getTime())) {
    return parsedCreatedAt.toLocaleString("es-MX");
  }

  return "Sin fecha";
}

function normalizeCsvHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s._-]+/g, "");
}

function parseCsvText(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const currentChar = text[index];
    const nextChar = text[index + 1];

    if (currentChar === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (currentChar === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((currentChar === "\n" || currentChar === "\r") && !inQuotes) {
      if (currentChar === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += currentChar;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeBooleanCell(value: string, fallback: boolean) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return fallback;
  if (["true", "1", "si", "s", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;

  return null;
}

function normalizeProductMode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "VENTA" || normalized === "RENTA" || normalized === "MIXTO") {
    return normalized as ProductMode;
  }
  return null;
}

function getProductCsvValue(product: AdminProduct, column: ProductCsvColumnKey) {
  if (column === "nombre") return product.nombre;
  if (column === "marca") return product.marca;
  if (column === "modelo") return product.modelo;
  if (column === "descripcion") return product.descripcion;
  if (column === "precio") return product.precio.toString();
  if (column === "clasificacion") return product.clasificacion;
  if (column === "stock") return product.stock.toString();
  if (column === "proveedor") return product.proveedor;
  if (column === "tipoAdquisicion") return product.tipoAdquisicion;
  if (column === "requiereReceta") return product.requiereReceta ? "True" : "False";
  return product.activo ? "True" : "False";
}

function escapeCsvCell(value: string) {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildCsvContent<T>(
  rows: T[],
  columns: ProductCsvColumnKey[],
  getter: (row: T, column: ProductCsvColumnKey) => string,
) {
  const headerRow = columns.join(",");
  const dataRows = rows.map((row) =>
    columns.map((column) => escapeCsvCell(getter(row, column))).join(","),
  );

  return [headerRow, ...dataRows].join("\r\n");
}

function createFileTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function downloadCsvFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function createProductImportPreview(
  fileName: string,
  csvText: string,
  existingModelCodes: Set<string>,
) {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) {
    throw new Error("El archivo CSV no contiene filas para importar.");
  }

  const headerRow = rows[0]?.map((value) => String(value ?? "").trim()) ?? [];
  const normalizedHeaders = headerRow.map((value) => normalizeCsvHeader(value));
  const columnIndexMap: Record<ProductCsvColumnKey, number> = {
    nombre: -1,
    marca: -1,
    modelo: -1,
    descripcion: -1,
    precio: -1,
    clasificacion: -1,
    stock: -1,
    proveedor: -1,
    tipoAdquisicion: -1,
    requiereReceta: -1,
    activo: -1,
  };

  PRODUCT_CSV_COLUMNS.forEach((column) => {
    const aliases = PRODUCT_CSV_HEADER_ALIASES[column.key];
    const foundIndex = normalizedHeaders.findIndex((header) =>
      aliases.includes(header),
    );
    columnIndexMap[column.key] = foundIndex;
  });

  const missingRequiredColumns = PRODUCT_CSV_COLUMNS.filter(
    (column) => column.required && columnIndexMap[column.key] < 0,
  ).map((column) => column.label);

  if (missingRequiredColumns.length > 0) {
    throw new Error(
      `Columnas obligatorias faltantes en CSV: ${missingRequiredColumns.join(", ")}`,
    );
  }

  const parsedRows: ProductCsvImportRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const rowValues = rows[rowIndex] ?? [];
    const readCell = (column: ProductCsvColumnKey) => {
      const index = columnIndexMap[column];
      if (index < 0) return "";
      return String(rowValues[index] ?? "").trim();
    };

    const nombre = readCell("nombre");
    const marca = readCell("marca");
    const modelo = readCell("modelo");
    const descripcion = readCell("descripcion");
    const precioRaw = readCell("precio");
    const clasificacion = readCell("clasificacion");
    const stockRaw = readCell("stock");
    const proveedor = readCell("proveedor");
    const tipoAdquisicionRaw = readCell("tipoAdquisicion");
    const requiereRecetaRaw = readCell("requiereReceta");
    const activoRaw = readCell("activo");

    const joinedRow = [
      nombre,
      marca,
      modelo,
      descripcion,
      precioRaw,
      clasificacion,
      stockRaw,
      proveedor,
      tipoAdquisicionRaw,
      requiereRecetaRaw,
      activoRaw,
    ]
      .join("")
      .trim();

    if (!joinedRow) {
      continue;
    }

    let validationError: string | null = null;
    const tipoAdquisicion = normalizeProductMode(tipoAdquisicionRaw);
    if (!tipoAdquisicion) {
      validationError =
        "Tipo de adquisicion invalido. Usa VENTA, RENTA o MIXTO.";
    }

    const requiereReceta = normalizeBooleanCell(requiereRecetaRaw, false);
    if (requiereReceta === null && !validationError) {
      validationError = "Valor invalido en requiereReceta. Usa true o false.";
    }

    const activo = normalizeBooleanCell(activoRaw, true);
    if (activo === null && !validationError) {
      validationError = "Valor invalido en activo. Usa true o false.";
    }

    const formCandidate = {
      nombre,
      marca,
      modelo,
      descripcion,
      precio: precioRaw,
      clasificacion,
      stock: stockRaw,
      proveedor,
      tipoAdquisicion: tipoAdquisicion ?? "VENTA",
      requiereReceta: requiereReceta ?? false,
      activo: activo ?? true,
    };

    const payloadError = validateProductPayload(formCandidate);
    if (!validationError && payloadError) {
      validationError = payloadError;
    }

    const payload: ProductImportPayload = {
      nombre: nombre.trim(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      descripcion: descripcion.trim(),
      precio: Number(precioRaw.replace(/,/g, "")),
      clasificacion: clasificacion.trim(),
      stock: Number(stockRaw.replace(/,/g, "")),
      proveedor: proveedor.trim(),
      tipoAdquisicion: tipoAdquisicion ?? "VENTA",
      requiereReceta: requiereReceta ?? false,
      activo: activo ?? true,
    };

    parsedRows.push({
      lineNumber: rowIndex + 1,
      nombre: payload.nombre,
      modelo: payload.modelo,
      precioRaw,
      stockRaw,
      normalizedModel: payload.modelo.trim().toLowerCase(),
      payload,
      validationError,
      duplicateExistingModel: false,
      duplicateInFile: false,
    });
  }

  if (parsedRows.length === 0) {
    throw new Error("El CSV no tiene productos validos para previsualizar.");
  }

  const modelCountMap = new Map<string, number>();
  parsedRows.forEach((row) => {
    if (!row.normalizedModel) return;
    modelCountMap.set(
      row.normalizedModel,
      (modelCountMap.get(row.normalizedModel) ?? 0) + 1,
    );
  });

  parsedRows.forEach((row) => {
    if (!row.normalizedModel) return;
    row.duplicateInFile = (modelCountMap.get(row.normalizedModel) ?? 0) > 1;
    row.duplicateExistingModel = existingModelCodes.has(row.normalizedModel);
  });

  return {
    fileName,
    rows: parsedRows,
  } as ProductCsvImportPreview;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, logout, updateUser: syncUser } = useAuth();

  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [notice, setNotice] = useState<Notice>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [userForm, setUserForm] = useState(defaultUserForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [isUserFormCollapsed, setIsUserFormCollapsed] = useState(false);

  const [productForm, setProductForm] = useState(defaultProductForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [isProductFormCollapsed, setIsProductFormCollapsed] = useState(false);
  const productCsvInputRef = useRef<HTMLInputElement | null>(null);
  const [productImportPreview, setProductImportPreview] = useState<ProductCsvImportPreview | null>(null);
  const [importingProductsFromCsv, setImportingProductsFromCsv] = useState(false);
  const [showProductExportModal, setShowProductExportModal] = useState(false);
  const [selectedProductExportColumns, setSelectedProductExportColumns] = useState<
    ProductCsvColumnKey[]
  >(() => PRODUCT_CSV_COLUMNS.map((column) => column.key));

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [classifications, setClassifications] = useState<ClassificationOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [catalogForm, setCatalogForm] = useState(defaultCatalogForm);
  const [brandPage, setBrandPage] = useState(1);
  const [classificationPage, setClassificationPage] = useState(1);
  const [savingCatalog, setSavingCatalog] = useState<
    "brand" | "classification" | null
  >(null);
  const [supplierForm, setSupplierForm] = useState(defaultSupplierForm);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [promotionForm, setPromotionForm] = useState(defaultPromotionForm);
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<number | null>(null);
  const [promotionPage, setPromotionPage] = useState(1);
  const [isPromotionFormCollapsed, setIsPromotionFormCollapsed] = useState(false);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [reviewUserFilter, setReviewUserFilter] = useState("");
  const [reviewActionId, setReviewActionId] = useState<number | null>(null);

  const [profileForm, setProfileForm] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    direccion: "",
    password: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState(false);
  const [backupRecords, setBackupRecords] = useState<DatabaseBackupRecord[]>([]);
  const [backupPage, setBackupPage] = useState(1);
  const [loadingBackupRecords, setLoadingBackupRecords] = useState(false);
  const [generatingBackup, setGeneratingBackup] = useState(false);
  const [generatingTableBackup, setGeneratingTableBackup] = useState(false);
  const [showTableBackupOptions, setShowTableBackupOptions] = useState(false);
  const [selectedBackupTable, setSelectedBackupTable] = useState("");
  const [downloadingBackupId, setDownloadingBackupId] = useState<number | null>(null);
  const [deletingBackupId, setDeletingBackupId] = useState<number | null>(null);

  const stats = useMemo(() => {
    const totalStock = products.reduce((acc, item) => acc + item.stock, 0);
    const totalValue = products.reduce((acc, item) => acc + item.precio * item.stock, 0);
    const adminCount = users.filter((item) => item.rol === "ADMIN").length;
    const activeProducts = products.filter((item) => item.activo).length;

    return {
      users: users.length,
      admins: adminCount,
      products: products.length,
      activeProducts,
      inactiveProducts: products.length - activeProducts,
      stock: totalStock,
      inventoryValue: totalValue,
    };
  }, [products, users]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;

    return users.filter((item) => {
      const fields = [
        item.nombre,
        item.correo,
        item.rol,
        item.telefono ?? "",
        item.direccion ?? "",
        item.activo ? "alta" : "baja",
      ];

      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [userSearch, users]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USER_PAGE_SIZE;
    const end = start + USER_PAGE_SIZE;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, userPage]);

  const productOptions = useMemo(() => {
    const merge = (primary: string[], secondary: string[]) => {
      return Array.from(
        new Set(
          [...primary, ...secondary]
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );
    };

    return {
      marca: merge(
        brands.map((item) => item.nombre),
        products.map((item) => item.marca),
      ),
      modelo: merge(
        [],
        products.map((item) => item.modelo),
      ),
      clasificacion: merge(
        classifications.map((item) => item.nombre),
        products.map((item) => item.clasificacion),
      ),
      proveedor: merge(
        suppliers.map((item) => item.nombre),
        products.map((item) => item.proveedor),
      ),
    };
  }, [brands, classifications, products, suppliers]);

  const promotionClassificationOptions = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...classifications.map((item) => item.nombre),
          ...products.map((item) => item.clasificacion),
        ]
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }, [classifications, products]);

  const sortedPromotions = useMemo(() => {
    return [...promotions].sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    );
  }, [promotions]);

  const totalPromotionPages = Math.max(
    1,
    Math.ceil(sortedPromotions.length / PROMOTION_PAGE_SIZE),
  );

  const paginatedPromotions = useMemo(() => {
    const start = (promotionPage - 1) * PROMOTION_PAGE_SIZE;
    const end = start + PROMOTION_PAGE_SIZE;
    return sortedPromotions.slice(start, end);
  }, [promotionPage, sortedPromotions]);

  const filteredReviews = useMemo(() => {
    const userId = reviewUserFilter ? Number(reviewUserFilter) : null;
    return reviews.filter((item) => {
      if (reviewStatusFilter !== "ALL" && item.status !== reviewStatusFilter) {
        return false;
      }

      if (userId !== null && item.userId !== userId) {
        return false;
      }

      return true;
    });
  }, [reviewStatusFilter, reviewUserFilter, reviews]);

  const totalReviewsCount = useMemo(() => reviews.length, [reviews]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;

    return products.filter((item) => {
      const fields = [
        item.nombre,
        item.marca,
        item.modelo,
        item.clasificacion,
        item.proveedor,
        item.tipoAdquisicion,
        item.activo ? "alta" : "baja",
      ];

      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [productSearch, products]);

  const existingProductModelCodes = useMemo(
    () => new Set(products.map((item) => item.modelo.trim().toLowerCase()).filter(Boolean)),
    [products],
  );

  const productImportSummary = useMemo(() => {
    const rows = productImportPreview?.rows ?? [];
    const invalidRows = rows.filter((row) => Boolean(row.validationError));
    const duplicateExistingRows = rows.filter((row) => row.duplicateExistingModel);
    const duplicateInFileRows = rows.filter((row) => row.duplicateInFile);
    const validRows = rows.filter(
      (row) => !row.validationError && !row.duplicateExistingModel && !row.duplicateInFile,
    );

    return {
      total: rows.length,
      invalidCount: invalidRows.length,
      duplicateExistingCount: duplicateExistingRows.length,
      duplicateInFileCount: duplicateInFileRows.length,
      validRows,
      duplicateExistingModels: Array.from(
        new Set(duplicateExistingRows.map((row) => row.modelo)),
      ),
      duplicateInFileModels: Array.from(new Set(duplicateInFileRows.map((row) => row.modelo))),
    };
  }, [productImportPreview]);

  const totalProductPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE),
  );

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * PRODUCT_PAGE_SIZE;
    const end = start + PRODUCT_PAGE_SIZE;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, productPage]);

  const totalBackupPages = Math.max(
    1,
    Math.ceil(backupRecords.length / BACKUP_PAGE_SIZE),
  );

  const paginatedBackupRecords = useMemo(() => {
    const start = (backupPage - 1) * BACKUP_PAGE_SIZE;
    const end = start + BACKUP_PAGE_SIZE;
    return backupRecords.slice(start, end);
  }, [backupPage, backupRecords]);

  const totalBrandPages = Math.max(1, Math.ceil(brands.length / CATALOG_PAGE_SIZE));
  const paginatedBrands = useMemo(() => {
    const start = (brandPage - 1) * CATALOG_PAGE_SIZE;
    const end = start + CATALOG_PAGE_SIZE;
    return brands.slice(start, end);
  }, [brandPage, brands]);

  const totalClassificationPages = Math.max(
    1,
    Math.ceil(classifications.length / CATALOG_PAGE_SIZE),
  );
  const paginatedClassifications = useMemo(() => {
    const start = (classificationPage - 1) * CATALOG_PAGE_SIZE;
    const end = start + CATALOG_PAGE_SIZE;
    return classifications.slice(start, end);
  }, [classificationPage, classifications]);

  const dbTableItems = useMemo(() => dbStatus?.tables.items ?? [], [dbStatus]);
  const heaviestDbTable = dbTableItems[0] ?? null;

  useEffect(() => {
    if (dbTableItems.length === 0) {
      if (selectedBackupTable) {
        setSelectedBackupTable("");
      }
      return;
    }

    const isCurrentTableAvailable = dbTableItems.some(
      (item) => item.tableName === selectedBackupTable,
    );

    if (!isCurrentTableAvailable) {
      setSelectedBackupTable(dbTableItems[0]?.tableName ?? "");
    }
  }, [dbTableItems, selectedBackupTable]);

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages);
    }
  }, [userPage, totalUserPages]);

  useEffect(() => {
    if (productPage > totalProductPages) {
      setProductPage(totalProductPages);
    }
  }, [productPage, totalProductPages]);

  useEffect(() => {
    if (promotionPage > totalPromotionPages) {
      setPromotionPage(totalPromotionPages);
    }
  }, [promotionPage, totalPromotionPages]);

  useEffect(() => {
    if (backupPage > totalBackupPages) {
      setBackupPage(totalBackupPages);
    }
  }, [backupPage, totalBackupPages]);

  useEffect(() => {
    if (brandPage > totalBrandPages) {
      setBrandPage(totalBrandPages);
    }
  }, [brandPage, totalBrandPages]);

  useEffect(() => {
    if (classificationPage > totalClassificationPages) {
      setClassificationPage(totalClassificationPages);
    }
  }, [classificationPage, totalClassificationPages]);

  const pushToast = useCallback((type: ToastItem["type"], text: string) => {
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 10000),
        type,
        text,
      },
    ]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!notice) return;
    pushToast(notice.type, notice.text);
    setNotice(null);
  }, [notice, pushToast]);

  const requestConfirmation = useCallback((request: ConfirmRequest) => {
    setConfirmRequest(request);
  }, []);

  const closeConfirmation = useCallback(() => {
    if (confirmBusy) return;
    setConfirmRequest(null);
  }, [confirmBusy]);

  const executeConfirmation = useCallback(async () => {
    if (!confirmRequest) return;

    try {
      setConfirmBusy(true);
      await confirmRequest.onConfirm();
      setConfirmRequest(null);
    } finally {
      setConfirmBusy(false);
    }
  }, [confirmRequest]);

  const handleSessionError = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    const shouldLogout =
      normalized.includes("token") ||
      normalized.includes("autenticado") ||
      normalized.includes("sesion") ||
      normalized.includes("permisos");

    if (shouldLogout) {
      logout();
      router.replace("/login");
      return true;
    }

    return false;
  }, [logout, router]);

  const loadDashboard = useCallback(async (sessionToken: string) => {
    try {
      setLoadingData(true);
      const [
        usersResult,
        productsResult,
        catalogsResult,
        suppliersResult,
        promotionsResult,
        reviewsResult,
      ] =
        await Promise.all([
          listUsers(sessionToken),
          listProducts(sessionToken),
          listCatalogs(sessionToken),
          listSuppliers(sessionToken),
          listPromotions(sessionToken),
          listAdminReviews(sessionToken, { status: "ALL" }),
        ]);
      setUsers(usersResult.users);
      setProducts(productsResult.products);
      setBrands(sortByName(catalogsResult.brands));
      setClassifications(sortByName(catalogsResult.classifications));
      setSuppliers(sortByName(suppliersResult.suppliers));
      setPromotions(promotionsResult.promotions);
      setReviews(reviewsResult.reviews);
      setNotice(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar el dashboard";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setLoadingData(false);
    }
  }, [handleSessionError]);

  const loadDatabaseStats = useCallback(async (sessionToken: string) => {
    try {
      setLoadingDbStatus(true);
      const result = await getDatabaseStatus(sessionToken);
      setDbStatus(result.status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo consultar el estado de la base de datos";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setLoadingDbStatus(false);
    }
  }, [handleSessionError]);

  const loadBackupRecords = useCallback(async (sessionToken: string) => {
    try {
      setLoadingBackupRecords(true);
      const result = await listDatabaseBackups(sessionToken);
      setBackupRecords(result.backups);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar el historial de respaldos";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setLoadingBackupRecords(false);
    }
  }, [handleSessionError]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.rol !== "ADMIN") {
      router.replace("/perfil");
      return;
    }

    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      logout();
      router.replace("/login");
      return;
    }

    setProfileForm({
      nombre: String(user.nombre ?? ""),
      correo: String(user.correo ?? ""),
      telefono: String(user.telefono ?? ""),
      direccion: String(user.direccion ?? ""),
      password: "",
      confirmPassword: "",
    });
    setToken(storedToken);
    setReady(true);
    void loadDashboard(storedToken);
    void loadDatabaseStats(storedToken);
    void loadBackupRecords(storedToken);
  }, [loadBackupRecords, loadDashboard, loadDatabaseStats, loading, logout, router, user]);

  useEffect(() => {
    if (section !== "dbMonitoring" || !token) {
      return;
    }

    void loadDatabaseStats(token);
    void loadBackupRecords(token);
  }, [loadBackupRecords, loadDatabaseStats, section, token]);

  const onUserInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetUserForm = () => {
    setUserForm(defaultUserForm);
    setEditingUserId(null);
  };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const userValidationError = validateUserPayload(userForm, Boolean(editingUserId));
    if (userValidationError) {
      setNotice({ type: "error", text: userValidationError });
      return;
    }

    try {
      setSavingUser(true);

      if (editingUserId) {
        const payload = {
          nombre: userForm.nombre.trim(),
          correo: userForm.correo.trim(),
          telefono: userForm.telefono.trim(),
          direccion: userForm.direccion.trim(),
          rol: userForm.rol,
          activo: userForm.activo,
          ...(userForm.password.trim()
            ? { password: userForm.password.trim() }
            : {}),
        };
        const result = await updateUser(token, editingUserId, payload);
        setUsers((prev) =>
          prev.map((item) => (item.id === editingUserId ? result.user : item)),
        );
        setNotice({ type: "success", text: "Usuario actualizado." });
      } else {
        const result = await createUser(token, {
          nombre: userForm.nombre.trim(),
          correo: userForm.correo.trim(),
          password: userForm.password.trim(),
          telefono: userForm.telefono.trim(),
          direccion: userForm.direccion.trim(),
          rol: userForm.rol,
          activo: userForm.activo,
        });
        setUsers((prev) => [result.user, ...prev]);
        setUserPage(1);
        setNotice({ type: "success", text: "Usuario creado." });
      }

      resetUserForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el usuario";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingUser(false);
    }
  };

  const editUser = (item: AdminUser) => {
    setEditingUserId(item.id);
    setUserForm({
      nombre: item.nombre,
      correo: item.correo,
      password: "",
      telefono: item.telefono ?? "",
      direccion: item.direccion ?? "",
      rol: item.rol,
      activo: item.activo,
    });
    setSection("users");
  };

  const removeUser = async (id: number) => {
    if (!token) return;

    try {
      await deleteUser(token, id);
      setUsers((prev) => prev.filter((item) => item.id !== id));
      setNotice({ type: "success", text: "Usuario eliminado." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el usuario";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    }
  };

  const toggleUserStatus = async (item: AdminUser) => {
    if (!token) return;

    try {
      const result = await updateUser(token, item.id, { activo: !item.activo });
      setUsers((prev) =>
        prev.map((userItem) => (userItem.id === item.id ? result.user : userItem)),
      );
      setNotice({
        type: "success",
        text: `Usuario ${result.user.activo ? "dado de alta" : "dado de baja"}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    }
  };

  const onProductInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const target = e.target;
    const { name, value } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setProductForm((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }

    if (name === "activo") {
      setProductForm((prev) => ({ ...prev, activo: value === "true" }));
      return;
    }

    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetProductForm = () => {
    setProductForm(defaultProductForm);
    setEditingProductId(null);
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const productValidationError = validateProductPayload(productForm);
    if (productValidationError) {
      setNotice({ type: "error", text: productValidationError });
      return;
    }

    const payload = {
      nombre: productForm.nombre.trim(),
      marca: productForm.marca.trim(),
      modelo: productForm.modelo.trim(),
      descripcion: productForm.descripcion.trim(),
      precio: Number(productForm.precio),
      clasificacion: productForm.clasificacion.trim(),
      stock: Number(productForm.stock),
      proveedor: productForm.proveedor.trim(),
      tipoAdquisicion: productForm.tipoAdquisicion,
      requiereReceta: productForm.requiereReceta,
      activo: productForm.activo,
    };

    try {
      setSavingProduct(true);

      if (editingProductId) {
        const result = await updateProduct(token, editingProductId, payload);
        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingProductId ? result.product : item,
          ),
        );
        setNotice({ type: "success", text: "Producto actualizado." });
      } else {
        const result = await createProduct(token, payload);
        setProducts((prev) => [result.product, ...prev]);
        setProductPage(1);
        setNotice({ type: "success", text: "Producto creado." });
      }

      resetProductForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el producto";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingProduct(false);
    }
  };

  const editProduct = (item: AdminProduct) => {
    setEditingProductId(item.id);
    setProductForm({
      nombre: item.nombre,
      marca: item.marca,
      modelo: item.modelo,
      descripcion: item.descripcion,
      precio: String(item.precio),
      clasificacion: item.clasificacion,
      stock: String(item.stock),
      proveedor: item.proveedor,
      tipoAdquisicion: item.tipoAdquisicion,
      requiereReceta: item.requiereReceta,
      activo: item.activo,
    });
    setSection("products");
  };

  const removeProduct = async (id: number) => {
    if (!token) return;

    try {
      await deleteProduct(token, id);
      setProducts((prev) => prev.filter((item) => item.id !== id));
      setNotice({ type: "success", text: "Producto eliminado." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el producto";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    }
  };

  const toggleProductStatus = async (item: AdminProduct) => {
    if (!token) return;

    try {
      const result = await updateProduct(token, item.id, { activo: !item.activo });
      setProducts((prev) =>
        prev.map((product) => (product.id === item.id ? result.product : product)),
      );
      setNotice({
        type: "success",
        text: `Producto ${result.product.activo ? "dado de alta" : "dado de baja"}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    }
  };

  const openProductImportPicker = () => {
    productCsvInputRef.current?.click();
  };

  const onProductCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setNotice({ type: "error", text: "Selecciona un archivo .csv valido." });
      return;
    }

    try {
      const csvText = await file.text();
      const preview = createProductImportPreview(
        file.name,
        csvText,
        existingProductModelCodes,
      );
      setProductImportPreview(preview);
      setNotice(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo procesar el archivo CSV de productos";
      setNotice({ type: "error", text: message });
    }
  };

  const closeProductImportModal = () => {
    if (importingProductsFromCsv) return;
    setProductImportPreview(null);
  };

  const importProductsFromCsv = async () => {
    if (!token || !productImportPreview) return;

    const rowsToImport = productImportSummary.validRows;
    if (rowsToImport.length === 0) {
      setNotice({
        type: "error",
        text: "No hay filas validas para importar. Revisa modelos repetidos o errores.",
      });
      return;
    }

    try {
      setImportingProductsFromCsv(true);
      const createdProducts: AdminProduct[] = [];
      let failedRows = 0;

      for (const row of rowsToImport) {
        try {
          const result = await createProduct(token, row.payload);
          createdProducts.push(result.product);
        } catch {
          failedRows += 1;
        }
      }

      if (createdProducts.length > 0) {
        setProducts((prev) => [...createdProducts, ...prev]);
        setProductPage(1);
      }

      setProductImportPreview(null);
      if (createdProducts.length > 0 && failedRows === 0) {
        setNotice({
          type: "success",
          text: `Importacion completada: ${createdProducts.length} productos creados.`,
        });
      } else if (createdProducts.length > 0) {
        setNotice({
          type: "success",
          text:
            `Importacion parcial: ${createdProducts.length} creados, ` +
            `${failedRows} filas no se pudieron guardar.`,
        });
      } else {
        setNotice({
          type: "error",
          text: "No se pudo importar ningun producto del CSV.",
        });
      }
    } finally {
      setImportingProductsFromCsv(false);
    }
  };

  const toggleExportColumn = (columnKey: ProductCsvColumnKey) => {
    setSelectedProductExportColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((item) => item !== columnKey)
        : [...prev, columnKey],
    );
  };

  const exportProductsCsv = (columns: ProductCsvColumnKey[], filePrefix: string) => {
    if (columns.length === 0) {
      setNotice({
        type: "error",
        text: "Selecciona al menos una columna para exportar.",
      });
      return;
    }

    const orderedColumns = PRODUCT_CSV_COLUMNS.map((column) => column.key).filter((key) =>
      columns.includes(key),
    );
    const csvContent = buildCsvContent(products, orderedColumns, getProductCsvValue);
    const fileName = `${filePrefix}_${createFileTimestamp()}.csv`;
    downloadCsvFile(csvContent, fileName);
    setShowProductExportModal(false);
    setNotice({
      type: "success",
      text: `CSV exportado: ${fileName}`,
    });
  };

  const onCatalogInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCatalogForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSupplierInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSupplierForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const validationError = validateCatalogName(catalogForm.marca, "Marca");
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      setSavingCatalog("brand");
      const result = await createBrand(token, {
        nombre: catalogForm.marca.trim(),
      });
      setBrands((prev) => sortByName([...prev, result.brand]));
      setBrandPage(1);
      setCatalogForm((prev) => ({ ...prev, marca: "" }));
      setNotice({ type: "success", text: "Marca creada." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la marca";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingCatalog(null);
    }
  };

  const submitClassification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const validationError = validateCatalogName(
      catalogForm.clasificacion,
      "Clasificacion",
    );
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      setSavingCatalog("classification");
      const result = await createClassification(token, {
        nombre: catalogForm.clasificacion.trim(),
      });
      setClassifications((prev) =>
        sortByName([...prev, result.classification]),
      );
      setClassificationPage(1);
      setCatalogForm((prev) => ({ ...prev, clasificacion: "" }));
      setNotice({ type: "success", text: "Clasificacion creada." });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la clasificacion";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingCatalog(null);
    }
  };

  const submitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const validationError = validateSupplierPayload(supplierForm);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      setSavingSupplier(true);
      const result = await createSupplier(token, {
        nombre: supplierForm.nombre.trim(),
        encargado: supplierForm.encargado.trim(),
        repartidor: supplierForm.repartidor.trim(),
        direccion: supplierForm.direccion.trim(),
      });
      setSuppliers((prev) => sortByName([...prev, result.supplier]));
      setSupplierForm(defaultSupplierForm);
      setNotice({ type: "success", text: "Proveedor creado." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el proveedor";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingSupplier(false);
    }
  };

  const onPromotionInput = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setPromotionForm((prev) => {
      if (name === "mode") {
        return {
          ...prev,
          mode: value as CreatePromotionPayload["mode"],
          productId: "",
          clasificacion: "",
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const resetPromotionForm = () => {
    setPromotionForm(defaultPromotionForm);
    setEditingPromotionId(null);
  };

  const submitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const validationError = validatePromotionPayload(promotionForm);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    const normalizedImageUrl = promotionForm.imageUrl.trim();
    const productId = Number(promotionForm.productId);
    const commonPayload = {
      productId,
      startAt: new Date(`${promotionForm.startAt}T00:00:00`).toISOString(),
      endAt: new Date(`${promotionForm.endAt}T23:59:59`).toISOString(),
      descripcion: promotionForm.descripcion.trim(),
      imageUrl: normalizedImageUrl,
    };

    try {
      setSavingPromotion(true);

      if (editingPromotionId) {
        const result = await updatePromotion(token, editingPromotionId, commonPayload);
        setPromotions((prev) =>
          prev.map((item) => (item.id === editingPromotionId ? result.promotion : item)),
        );
        setNotice({ type: "success", text: result.message });
      } else {
        const payload: CreatePromotionPayload = {
          mode: promotionForm.mode,
          startAt: commonPayload.startAt,
          endAt: commonPayload.endAt,
          descripcion: commonPayload.descripcion,
          imageUrl: commonPayload.imageUrl,
          ...(promotionForm.mode === "PRODUCT"
            ? { productId }
            : { clasificacion: promotionForm.clasificacion.trim() }),
        };

        const result = await createPromotion(token, payload);
        setPromotions((prev) => [...result.promotions, ...prev]);
        setPromotionPage(1);
        setNotice({ type: "success", text: result.message });
      }

      resetPromotionForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la promocion";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingPromotion(false);
    }
  };

  const editPromotion = (item: AdminPromotion) => {
    setEditingPromotionId(item.id);
    setPromotionForm({
      mode: "PRODUCT",
      productId: String(item.productId),
      clasificacion: "",
      startAt: item.startAt.slice(0, 10),
      endAt: item.endAt.slice(0, 10),
      descripcion: item.descripcion,
      imageUrl: item.imageUrl ?? "",
    });
    setIsPromotionFormCollapsed(false);
    setSection("promotions");
  };

  const removePromotion = async (id: number) => {
    if (!token) return;

    try {
      await deletePromotion(token, id);
      setPromotions((prev) => prev.filter((item) => item.id !== id));
      if (editingPromotionId === id) {
        resetPromotionForm();
      }
      setNotice({ type: "success", text: "Promocion eliminada." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la promocion";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    }
  };

  const approvePendingReview = async (id: number) => {
    if (!token) return;

    try {
      setReviewActionId(id);
      const result = await approveReview(token, id);
      setReviews((prev) =>
        prev.map((item) => (item.id === id ? result.review : item)),
      );
      setNotice({ type: "success", text: result.message });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo aprobar la reseña";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setReviewActionId(null);
    }
  };

  const removeReviewItem = async (id: number) => {
    if (!token) return;

    try {
      setReviewActionId(id);
      await deleteReview(token, id);
      setReviews((prev) => prev.filter((item) => item.id !== id));
      setNotice({ type: "success", text: "Reseña eliminada." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la reseña";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setReviewActionId(null);
    }
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const profileValidationError = validateProfilePayload(profileForm);
    if (profileValidationError) {
      setNotice({ type: "error", text: profileValidationError });
      return;
    }

    try {
      setSavingProfile(true);
      const result = await updateMyProfile(
        {
          nombre: profileForm.nombre.trim(),
          correo: profileForm.correo.trim(),
          telefono: profileForm.telefono.trim(),
          direccion: profileForm.direccion.trim(),
          ...(profileForm.password.trim()
            ? { password: profileForm.password.trim() }
            : {}),
        },
        token,
      );
      syncUser(result.user);
      setProfileForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      setNotice({ type: "success", text: "Perfil actualizado." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el perfil";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const generateBackup = async () => {
    if (!token) return;

    try {
      setGeneratingBackup(true);
      const result = await createDatabaseBackupRecord(token);
      setBackupRecords((prev) => [result.backup, ...prev]);
      setBackupPage(1);
      void loadDatabaseStats(token);
      setNotice({
        type: "success",
        text: `Respaldo generado: ${result.backup.fileName}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo de base de datos";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setGeneratingBackup(false);
    }
  };

  const generateSingleTableBackup = async () => {
    if (!token) return;

    if (!selectedBackupTable) {
      setNotice({ type: "error", text: "Selecciona una tabla para generar el respaldo." });
      return;
    }

    try {
      setGeneratingTableBackup(true);
      const result = await createSingleTableDatabaseBackupRecord(token, selectedBackupTable);
      setBackupRecords((prev) => [result.backup, ...prev]);
      setBackupPage(1);
      void loadDatabaseStats(token);
      setNotice({
        type: "success",
        text: `Respaldo de tabla generado: ${result.backup.fileName}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo de la tabla seleccionada";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setGeneratingTableBackup(false);
    }
  };

  const downloadBackupRecord = async (backup: DatabaseBackupRecord) => {
    if (!token) return;

    try {
      setDownloadingBackupId(backup.id);
      const download = await downloadDatabaseBackupById(token, backup.id);
      const saved = await saveBlobAsFile(download.blob, download.fileName);
      if (!saved) {
        setNotice({ type: "error", text: "Descarga cancelada por el usuario." });
        return;
      }

      setNotice({ type: "success", text: `Respaldo descargado: ${download.fileName}` });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo descargar el respaldo";
      setNotice({ type: "error", text: message });
    } finally {
      setDownloadingBackupId(null);
    }
  };

  const removeBackupRecord = async (backup: DatabaseBackupRecord) => {
    if (!token) return;

    try {
      setDeletingBackupId(backup.id);
      const result = await deleteDatabaseBackupRecord(token, backup.id);
      setBackupRecords((prev) => prev.filter((item) => item.id !== backup.id));
      setNotice({
        type: "success",
        text: result.message || `Respaldo eliminado: ${backup.fileName}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el respaldo";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setDeletingBackupId(null);
    }
  };

  const refreshAdminData = async () => {
    if (!token) return;

    await Promise.all([
      loadDashboard(token),
      loadDatabaseStats(token),
      loadBackupRecords(token),
    ]);
  };

  if (!ready) {
    return <p className={styles.loading}>Cargando dashboard...</p>;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/logo001.png" alt="CEMYDI" />
          <span>Panel Admin</span>
        </div>

        <nav className={styles.nav}>
          <button
            className={section === "overview" ? styles.active : ""}
            onClick={() => setSection("overview")}
            type="button"
          >
            Resumen
          </button>
          <button
            className={section === "users" ? styles.active : ""}
            onClick={() => setSection("users")}
            type="button"
          >
            Gestionar usuarios
          </button>
          <button
            className={section === "products" ? styles.active : ""}
            onClick={() => setSection("products")}
            type="button"
          >
            Gestionar productos
          </button>
          <button
            className={section === "catalogs" ? styles.active : ""}
            onClick={() => setSection("catalogs")}
            type="button"
          >
            Catalogos
          </button>
          <button
            className={section === "suppliers" ? styles.active : ""}
            onClick={() => setSection("suppliers")}
            type="button"
          >
            Gestionar proveedores
          </button>
          <button
            className={section === "promotions" ? styles.active : ""}
            onClick={() => setSection("promotions")}
            type="button"
          >
            Gestionar promociones
          </button>
          <button
            className={section === "reviews" ? styles.active : ""}
            onClick={() => setSection("reviews")}
            type="button"
          >
            Gestionar reseñas
          </button>
          <button
            className={section === "profile" ? styles.active : ""}
            onClick={() => setSection("profile")}
            type="button"
          >
            Editar perfil
          </button>
          <button
            className={section === "dbMonitoring" ? styles.active : ""}
            onClick={() => setSection("dbMonitoring")}
            type="button"
          >
            Monitoreo de la base de datos
          </button>
          <button
            className={section === "extras" ? styles.active : ""}
            onClick={() => setSection("extras")}
            type="button"
          >
            Opciones extra
          </button>
        </nav>

        <button
          className={styles.logout}
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          Cerrar sesion
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1>Bienvenido, {user?.nombre ?? "Administrador"}</h1>
            <p>Control de usuarios, productos, catalogos, proveedores y promociones.</p>
          </div>
        </header>

        {loadingData ? <p className={styles.loading}>Cargando datos...</p> : null}

        {section === "overview" ? (
          <section className={styles.section}>
            <div className={styles.cards}>
              <article className={styles.cardDark}>
                <h3>Usuarios</h3>
                <strong>{stats.users}</strong>
                <span>{stats.admins} administradores</span>
              </article>
              <article className={styles.card}>
                <h3>Productos</h3>
                <strong>{stats.products}</strong>
                <span>
                  Activos: {stats.activeProducts} | Inactivos: {stats.inactiveProducts}
                </span>
              </article>
              <article className={styles.card}>
                <h3>Valor inventario</h3>
                <strong>${stats.inventoryValue.toFixed(2)}</strong>
                <span>Estimado por precio x stock</span>
              </article>
            </div>
          </section>
        ) : null}

        {section === "users" ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Gestionar usuarios</h2>
              <button
                type="button"
                className={styles.togglePanelBtn}
                onClick={() => setIsUserFormCollapsed((prev) => !prev)}
              >
                {isUserFormCollapsed
                  ? "Mostrar panel de usuario"
                  : "Minimizar panel de usuario"}
              </button>
            </div>

            {!isUserFormCollapsed ? (
              <form className={styles.form} onSubmit={submitUser} id="user-form">
                <input
                  name="nombre"
                  placeholder="Nombre"
                  value={userForm.nombre}
                  onChange={onUserInput}
                />
                <input
                  name="correo"
                  type="email"
                  placeholder="Correo"
                  value={userForm.correo}
                  onChange={onUserInput}
                />
                <input
                  name="password"
                  type="password"
                  placeholder={
                    editingUserId ? "Password nuevo (opcional)" : "Password"
                  }
                  value={userForm.password}
                  onChange={onUserInput}
                />
                <input
                  name="telefono"
                  placeholder="Telefono"
                  value={userForm.telefono}
                  onChange={onUserInput}
                />
                <input
                  name="direccion"
                  placeholder="Direccion"
                  value={userForm.direccion}
                  onChange={onUserInput}
                />
                <select name="rol" value={userForm.rol} onChange={onUserInput}>
                  <option value="CLIENT">CLIENT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select
                  name="activo"
                  value={String(userForm.activo)}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      activo: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">ALTA</option>
                  <option value="false">BAJA</option>
                </select>
              </form>
            ) : null}

            <div className={styles.productToolbar}>
              {!isUserFormCollapsed ? (
                <div className={styles.productActions}>
                  <button type="submit" form="user-form" disabled={savingUser}>
                    {savingUser
                      ? "Guardando..."
                      : editingUserId
                        ? "Actualizar"
                        : "Agregar usuario"}
                  </button>
                  {editingUserId ? (
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className={styles.ghostBtn}
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => setIsUserFormCollapsed(false)}
                >
                  Mostrar panel para agregar
                </button>
              )}

              <input
                type="search"
                className={styles.productSearch}
                placeholder="Buscar usuario..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Telefono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyCell}>
                        No se encontraron usuarios para mostrar.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.correo}</td>
                        <td>{item.rol}</td>
                        <td>{item.telefono || "-"}</td>
                        <td>
                          <span
                            className={item.activo ? styles.statusActive : styles.statusInactive}
                          >
                            {item.activo ? "ALTA" : "BAJA"}
                          </span>
                        </td>
                        <td className={styles.actionsCell}>
                          <button type="button" onClick={() => editUser(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className={styles.warning}
                            onClick={() =>
                              requestConfirmation({
                                title: item.activo
                                  ? "Confirmar baja de usuario"
                                  : "Confirmar alta de usuario",
                                description: `Se actualizara el estado del usuario "${item.nombre}".`,
                                confirmLabel: item.activo ? "Dar de baja" : "Dar de alta",
                                tone: "default",
                                onConfirm: () => toggleUserStatus(item),
                              })
                            }
                          >
                            {item.activo ? "Dar de baja" : "Dar de alta"}
                          </button>
                          <button
                            type="button"
                            className={styles.danger}
                            onClick={() =>
                              requestConfirmation({
                                title: "Confirmar eliminacion de usuario",
                                description: `Se eliminara el usuario "${item.nombre}". Esta accion no se puede deshacer.`,
                                confirmLabel: "Eliminar usuario",
                                tone: "danger",
                                onConfirm: () => removeUser(item.id),
                              })
                            }
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                disabled={userPage === 1}
              >
                Anterior
              </button>
              <span>
                Pagina {userPage} de {totalUserPages}
              </span>
              <button
                type="button"
                onClick={() => setUserPage((prev) => Math.min(totalUserPages, prev + 1))}
                disabled={userPage === totalUserPages}
              >
                Siguiente
              </button>
            </div>
          </section>
        ) : null}

        {section === "products" ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleWithMeta}>
                <h2>Gestionar productos</h2>
                <span className={styles.sectionMetaBadge}>
                  Total de productos: {formatNumber(products.length)}
                </span>
              </div>
              <button
                type="button"
                className={styles.togglePanelBtn}
                onClick={() => setIsProductFormCollapsed((prev) => !prev)}
              >
                {isProductFormCollapsed
                  ? "Mostrar panel de producto"
                  : "Minimizar panel de producto"}
              </button>
            </div>

            {!isProductFormCollapsed ? (
              <form className={styles.form} onSubmit={submitProduct} id="product-form">
                <input
                  name="nombre"
                  placeholder="Nombre"
                  value={productForm.nombre}
                  onChange={onProductInput}
                />
                <select
                  name="marca"
                  value={productForm.marca}
                  onChange={onProductInput}
                >
                  <option value="">Selecciona marca</option>
                  {productOptions.marca.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  name="modelo"
                  placeholder="Escribe modelo"
                  value={productForm.modelo}
                  onChange={onProductInput}
                />
                <textarea
                  name="descripcion"
                  placeholder="Descripcion"
                  value={productForm.descripcion}
                  onChange={onProductInput}
                />
                <input
                  name="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio"
                  value={productForm.precio}
                  onChange={onProductInput}
                />
                <input
                  name="stock"
                  type="number"
                  min="0"
                  placeholder="Stock"
                  value={productForm.stock}
                  onChange={onProductInput}
                />
                <select
                  name="clasificacion"
                  value={productForm.clasificacion}
                  onChange={onProductInput}
                >
                  <option value="">Selecciona clasificacion</option>
                  {productOptions.clasificacion.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  name="proveedor"
                  value={productForm.proveedor}
                  onChange={onProductInput}
                >
                  <option value="">Selecciona proveedor</option>
                  {productOptions.proveedor.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  name="tipoAdquisicion"
                  value={productForm.tipoAdquisicion}
                  onChange={onProductInput}
                >
                  <option value="VENTA">VENTA</option>
                  <option value="RENTA">RENTA</option>
                  <option value="MIXTO">MIXTO</option>
                </select>
                <select name="activo" value={String(productForm.activo)} onChange={onProductInput}>
                  <option value="true">ALTA</option>
                  <option value="false">BAJA</option>
                </select>
                <div className={styles.checkboxWrap}>
                  <label className={styles.checkboxInline}>
                    <input
                      name="requiereReceta"
                      type="checkbox"
                      checked={productForm.requiereReceta}
                      onChange={onProductInput}
                    />
                    <span>Requiere receta</span>
                  </label>
                </div>
              </form>
            ) : null}

            <div className={styles.productToolbar}>
              {!isProductFormCollapsed ? (
                <div className={styles.productActions}>
                  <button type="submit" form="product-form" disabled={savingProduct}>
                    {savingProduct
                      ? "Guardando..."
                      : editingProductId
                        ? "Actualizar"
                        : "Agregar producto"}
                  </button>
                  {editingProductId ? (
                    <button
                      type="button"
                      onClick={resetProductForm}
                      className={styles.ghostBtn}
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => setIsProductFormCollapsed(false)}
                >
                  Mostrar panel para agregar
                </button>
              )}

              <div className={styles.productTools}>
                <div className={styles.productCsvActions}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={openProductImportPicker}
                  >
                    Importar productos (CSV)
                  </button>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => {
                      if (selectedProductExportColumns.length === 0) {
                        setSelectedProductExportColumns(
                          PRODUCT_CSV_COLUMNS.map((column) => column.key),
                        );
                      }
                      setShowProductExportModal(true);
                    }}
                  >
                    Exportar productos (CSV)
                  </button>
                  <input
                    ref={productCsvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onProductCsvSelected}
                    className={styles.hiddenFileInput}
                  />
                </div>

                <input
                  type="search"
                  className={styles.productSearch}
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Proveedor</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Tipo</th>
                    <th>Receta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyCell}>
                        No se encontraron productos para mostrar.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.proveedor}</td>
                        <td>${item.precio.toFixed(2)}</td>
                        <td>{item.stock}</td>
                        <td>{item.tipoAdquisicion}</td>
                        <td>{item.requiereReceta ? "Si" : "No"}</td>
                        <td>
                          <span
                            className={item.activo ? styles.statusActive : styles.statusInactive}
                          >
                            {item.activo ? "ALTA" : "BAJA"}
                          </span>
                        </td>
                        <td className={styles.actionsCell}>
                          <button type="button" onClick={() => editProduct(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className={styles.warning}
                            onClick={() =>
                              requestConfirmation({
                                title: item.activo
                                  ? "Confirmar baja de producto"
                                  : "Confirmar alta de producto",
                                description: `Se actualizara el estado del producto "${item.nombre}".`,
                                confirmLabel: item.activo ? "Dar de baja" : "Dar de alta",
                                tone: "default",
                                onConfirm: () => toggleProductStatus(item),
                              })
                            }
                          >
                            {item.activo ? "Dar de baja" : "Dar de alta"}
                          </button>
                          <button
                            type="button"
                            className={styles.danger}
                            onClick={() =>
                              requestConfirmation({
                                title: "Confirmar eliminacion de producto",
                                description: `Se eliminara el producto "${item.nombre}". Esta accion no se puede deshacer.`,
                                confirmLabel: "Eliminar producto",
                                tone: "danger",
                                onConfirm: () => removeProduct(item.id),
                              })
                            }
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => setProductPage((prev) => Math.max(1, prev - 1))}
                disabled={productPage === 1}
              >
                Anterior
              </button>
              <span>
                Pagina {productPage} de {totalProductPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setProductPage((prev) => Math.min(totalProductPages, prev + 1))
                }
                disabled={productPage === totalProductPages}
              >
                Siguiente
              </button>
            </div>

            {productImportPreview ? (
              <div className={styles.modalBackdrop}>
                <div className={styles.modalCard}>
                  <div className={styles.modalHeader}>
                    <h3>Previsualizacion de importacion de productos</h3>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={closeProductImportModal}
                      disabled={importingProductsFromCsv}
                    >
                      Cerrar
                    </button>
                  </div>

                  <p className={styles.modalSubtitle}>
                    Archivo: <strong>{productImportPreview.fileName}</strong>
                  </p>

                  <div className={styles.modalSummaryGrid}>
                    <article>
                      <span>Total de filas</span>
                      <strong>{formatNumber(productImportSummary.total)}</strong>
                    </article>
                    <article>
                      <span>Validas para importar</span>
                      <strong>{formatNumber(productImportSummary.validRows.length)}</strong>
                    </article>
                    <article>
                      <span>Con errores de formato</span>
                      <strong>{formatNumber(productImportSummary.invalidCount)}</strong>
                    </article>
                    <article>
                      <span>Modelos repetidos</span>
                      <strong>
                        {formatNumber(
                          productImportSummary.duplicateExistingCount +
                            productImportSummary.duplicateInFileCount,
                        )}
                      </strong>
                    </article>
                  </div>

                  {productImportSummary.duplicateExistingModels.length > 0 ? (
                    <p className={styles.modalWarning}>
                      Modelos ya existentes:{" "}
                      {productImportSummary.duplicateExistingModels.slice(0, 8).join(", ")}
                      {productImportSummary.duplicateExistingModels.length > 8 ? ", ..." : ""}
                    </p>
                  ) : null}

                  {productImportSummary.duplicateInFileModels.length > 0 ? (
                    <p className={styles.modalWarning}>
                      Modelos repetidos dentro del CSV:{" "}
                      {productImportSummary.duplicateInFileModels.slice(0, 8).join(", ")}
                      {productImportSummary.duplicateInFileModels.length > 8 ? ", ..." : ""}
                    </p>
                  ) : null}

                  <div className={styles.modalTableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Linea</th>
                          <th>Nombre</th>
                          <th>Modelo</th>
                          <th>Precio</th>
                          <th>Stock</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productImportPreview.rows.slice(0, 40).map((row) => {
                          const status = row.validationError
                            ? row.validationError
                            : row.duplicateExistingModel
                              ? "Modelo duplicado (ya existe)"
                              : row.duplicateInFile
                                ? "Modelo duplicado en CSV"
                                : "Lista para importar";

                          return (
                            <tr key={`${row.lineNumber}-${row.modelo}`}>
                              <td>{row.lineNumber}</td>
                              <td>{row.nombre}</td>
                              <td>{row.modelo}</td>
                              <td>{row.precioRaw}</td>
                              <td>{row.stockRaw}</td>
                              <td>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={closeProductImportModal}
                      disabled={importingProductsFromCsv}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void importProductsFromCsv()}
                      disabled={
                        importingProductsFromCsv ||
                        productImportSummary.validRows.length === 0
                      }
                    >
                      {importingProductsFromCsv
                        ? "Importando..."
                        : `Importar ${productImportSummary.validRows.length} productos`}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {showProductExportModal ? (
              <div className={styles.modalBackdrop}>
                <div className={styles.modalCard}>
                  <div className={styles.modalHeader}>
                    <h3>Exportar productos a CSV</h3>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => setShowProductExportModal(false)}
                    >
                      Cerrar
                    </button>
                  </div>

                  <p className={styles.modalSubtitle}>
                    Selecciona columnas para exportar o descarga todo con formato compatible para
                    importar.
                  </p>

                  <div className={styles.exportColumnGrid}>
                    {PRODUCT_CSV_COLUMNS.map((column) => (
                      <label key={column.key} className={styles.exportColumnOption}>
                        <input
                          type="checkbox"
                          checked={selectedProductExportColumns.includes(column.key)}
                          onChange={() => toggleExportColumn(column.key)}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => setSelectedProductExportColumns([])}
                    >
                      Limpiar seleccion
                    </button>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() =>
                        setSelectedProductExportColumns(
                          PRODUCT_CSV_COLUMNS.map((column) => column.key),
                        )
                      }
                    >
                      Seleccionar todo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportProductsCsv(
                          PRODUCT_CSV_COLUMNS.map((column) => column.key),
                          "productos_cemydi_importacion",
                        )
                      }
                    >
                      Exportar todo (formato importacion)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportProductsCsv(
                          selectedProductExportColumns,
                          "productos_cemydi_columnas",
                        )
                      }
                    >
                      Exportar columnas seleccionadas
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {section === "catalogs" ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Catalogos para productos</h2>
              <p className={styles.pendingCounter}>
                Registros: <strong>{formatNumber(brands.length + classifications.length)}</strong>
              </p>
            </div>
            <div className={styles.catalogShell}>
              <div className={styles.catalogGrid}>
                <article className={styles.catalogCard}>
                  <div className={styles.catalogCardTop}>
                    <h3>Marcas</h3>
                    <span>{formatNumber(brands.length)} registradas</span>
                  </div>
                  <form onSubmit={submitBrand} className={styles.inlineForm}>
                    <input
                      name="marca"
                      placeholder="Nombre de la marca"
                      value={catalogForm.marca}
                      onChange={onCatalogInput}
                    />
                    <button type="submit" disabled={savingCatalog === "brand"}>
                      {savingCatalog === "brand" ? "Guardando..." : "Agregar"}
                    </button>
                  </form>
                  <div className={styles.catalogTableWrap}>
                    <table className={styles.catalogTable}>
                      <thead>
                        <tr>
                          <th>Marca</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBrands.length === 0 ? (
                          <tr>
                            <td className={styles.emptyCell}>Sin marcas registradas.</td>
                          </tr>
                        ) : (
                          paginatedBrands.map((item) => (
                            <tr key={item.id}>
                              <td>{item.nombre}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className={`${styles.pagination} ${styles.catalogPagination}`}>
                    <span>
                      Mostrando{" "}
                      {brands.length === 0 ? 0 : (brandPage - 1) * CATALOG_PAGE_SIZE + 1}
                      -{Math.min(brandPage * CATALOG_PAGE_SIZE, brands.length)} de{" "}
                      {formatNumber(brands.length)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBrandPage((prev) => Math.max(1, prev - 1))}
                      disabled={brandPage === 1}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBrandPage((prev) => Math.min(totalBrandPages, prev + 1))
                      }
                      disabled={brandPage === totalBrandPages}
                    >
                      Siguiente
                    </button>
                  </div>
                </article>

                <article className={styles.catalogCard}>
                  <div className={styles.catalogCardTop}>
                    <h3>Clasificaciones</h3>
                    <span>{formatNumber(classifications.length)} registradas</span>
                  </div>
                  <form onSubmit={submitClassification} className={styles.inlineForm}>
                    <input
                      name="clasificacion"
                      placeholder="Nombre de la clasificacion"
                      value={catalogForm.clasificacion}
                      onChange={onCatalogInput}
                    />
                    <button
                      type="submit"
                      disabled={savingCatalog === "classification"}
                    >
                      {savingCatalog === "classification" ? "Guardando..." : "Agregar"}
                    </button>
                  </form>
                  <div className={styles.catalogTableWrap}>
                    <table className={styles.catalogTable}>
                      <thead>
                        <tr>
                          <th>Clasificacion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedClassifications.length === 0 ? (
                          <tr>
                            <td className={styles.emptyCell}>
                              Sin clasificaciones registradas.
                            </td>
                          </tr>
                        ) : (
                          paginatedClassifications.map((item) => (
                            <tr key={item.id}>
                              <td>{item.nombre}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className={`${styles.pagination} ${styles.catalogPagination}`}>
                    <span>
                      Mostrando{" "}
                      {classifications.length === 0
                        ? 0
                        : (classificationPage - 1) * CATALOG_PAGE_SIZE + 1}
                      -{Math.min(
                        classificationPage * CATALOG_PAGE_SIZE,
                        classifications.length,
                      )}{" "}
                      de {formatNumber(classifications.length)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setClassificationPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={classificationPage === 1}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setClassificationPage((prev) =>
                          Math.min(totalClassificationPages, prev + 1),
                        )
                      }
                      disabled={classificationPage === totalClassificationPages}
                    >
                      Siguiente
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </section>
        ) : null}

        {section === "suppliers" ? (
          <section className={styles.section}>
            <h2>Gestionar proveedores</h2>
            <form className={styles.form} onSubmit={submitSupplier} id="supplier-form">
              <input
                name="nombre"
                placeholder="Nombre"
                value={supplierForm.nombre}
                onChange={onSupplierInput}
              />
              <input
                name="encargado"
                placeholder="Encargado"
                value={supplierForm.encargado}
                onChange={onSupplierInput}
              />
              <input
                name="repartidor"
                placeholder="Repartidor"
                value={supplierForm.repartidor}
                onChange={onSupplierInput}
              />
              <input
                name="direccion"
                placeholder="Direccion"
                value={supplierForm.direccion}
                onChange={onSupplierInput}
              />
            </form>

            <div className={styles.productToolbar}>
              <div className={styles.productActions}>
                <button type="submit" form="supplier-form" disabled={savingSupplier}>
                  {savingSupplier ? "Guardando..." : "Agregar proveedor"}
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Encargado</th>
                    <th>Repartidor</th>
                    <th>Direccion</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyCell}>
                        No hay proveedores registrados.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.encargado}</td>
                        <td>{item.repartidor}</td>
                        <td>{item.direccion}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {section === "promotions" ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Gestionar promociones</h2>
              <button
                type="button"
                className={styles.togglePanelBtn}
                onClick={() => setIsPromotionFormCollapsed((prev) => !prev)}
              >
                {isPromotionFormCollapsed
                  ? "Mostrar panel de promocion"
                  : "Minimizar panel de promocion"}
              </button>
            </div>

            {!isPromotionFormCollapsed ? (
              <form className={styles.form} onSubmit={submitPromotion} id="promotion-form">
                <select
                  name="mode"
                  value={promotionForm.mode}
                  onChange={onPromotionInput}
                  disabled={Boolean(editingPromotionId)}
                >
                  <option value="PRODUCT">Aplicar a producto</option>
                  <option value="CATEGORY">Aplicar por clasificacion</option>
                </select>
                <select
                  name="productId"
                  value={promotionForm.productId}
                  onChange={onPromotionInput}
                  disabled={promotionForm.mode !== "PRODUCT"}
                >
                  <option value="">Selecciona producto</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} ({item.clasificacion})
                    </option>
                  ))}
                </select>
                <select
                  name="clasificacion"
                  value={promotionForm.clasificacion}
                  onChange={onPromotionInput}
                  disabled={promotionForm.mode !== "CATEGORY"}
                >
                  <option value="">Selecciona clasificacion</option>
                  {promotionClassificationOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  name="startAt"
                  type="date"
                  value={promotionForm.startAt}
                  onChange={onPromotionInput}
                />
                <input
                  name="endAt"
                  type="date"
                  value={promotionForm.endAt}
                  onChange={onPromotionInput}
                />
                <input
                  name="imageUrl"
                  placeholder="URL de imagen (opcional)"
                  value={promotionForm.imageUrl}
                  onChange={onPromotionInput}
                />
                <textarea
                  name="descripcion"
                  placeholder="Descripcion de la promocion"
                  value={promotionForm.descripcion}
                  onChange={onPromotionInput}
                />
              </form>
            ) : null}

            <div className={styles.productToolbar}>
              {!isPromotionFormCollapsed ? (
                <div className={styles.productActions}>
                  <button type="submit" form="promotion-form" disabled={savingPromotion}>
                    {savingPromotion
                      ? "Guardando..."
                      : editingPromotionId
                        ? "Actualizar"
                        : "Agregar promocion"}
                  </button>
                  {editingPromotionId ? (
                    <button
                      type="button"
                      onClick={resetPromotionForm}
                      className={styles.ghostBtn}
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => setIsPromotionFormCollapsed(false)}
                >
                  Mostrar panel para agregar
                </button>
              )}
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Descripcion</th>
                    <th>Periodo</th>
                    <th>Estado</th>
                    <th>Imagen</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPromotions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
                        No hay promociones registradas.
                      </td>
                    </tr>
                  ) : (
                    paginatedPromotions.map((item) => {
                      const now = Date.now();
                      const starts = new Date(item.startAt).getTime();
                      const ends = new Date(item.endAt).getTime();
                      const isActive =
                        now >= starts &&
                        now <= ends &&
                        item.product.activo &&
                        item.product.stock > 0;
                      const statusLabel =
                        !item.product.activo || item.product.stock <= 0
                          ? "Producto sin disponibilidad"
                          : now < starts
                            ? "Programada"
                            : now > ends
                              ? "Finalizada"
                              : "Activa";

                      return (
                        <tr key={item.id}>
                          <td>{item.product.nombre}</td>
                          <td>{item.product.clasificacion}</td>
                          <td>{item.descripcion}</td>
                          <td>
                            {new Date(item.startAt).toLocaleDateString("es-MX")} -{" "}
                            {new Date(item.endAt).toLocaleDateString("es-MX")}
                          </td>
                          <td>
                            <span
                              className={
                                isActive ? styles.statusActive : styles.statusInactive
                              }
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td>{item.imageUrl ? "Cargada" : "Pendiente"}</td>
                          <td className={styles.actionsCell}>
                            <button
                              type="button"
                              onClick={() => editPromotion(item)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={styles.danger}
                              onClick={() =>
                                requestConfirmation({
                                  title: "Confirmar eliminacion de promocion",
                                  description: `Se eliminara la promocion del producto "${item.product.nombre}".`,
                                  confirmLabel: "Eliminar promocion",
                                  tone: "danger",
                                  onConfirm: () => removePromotion(item.id),
                                })
                              }
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => setPromotionPage((prev) => Math.max(1, prev - 1))}
                disabled={promotionPage === 1}
              >
                Anterior
              </button>
              <span>
                Pagina {promotionPage} de {totalPromotionPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPromotionPage((prev) => Math.min(totalPromotionPages, prev + 1))
                }
                disabled={promotionPage === totalPromotionPages}
              >
                Siguiente
              </button>
            </div>
          </section>
        ) : null}

        {section === "reviews" ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Gestionar reseñas</h2>
              <p className={styles.pendingCounter}>
                Total de reseñas: <strong>{totalReviewsCount}</strong>
              </p>
            </div>

            <div className={styles.productToolbar}>
              <div className={styles.reviewFilters}>
                <select
                  value={reviewStatusFilter}
                  onChange={(e) =>
                    setReviewStatusFilter(e.target.value as ReviewStatus | "ALL")
                  }
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="APPROVED">Aprobadas</option>
                  <option value="REJECTED">Rechazadas</option>
                </select>
                <select
                  value={reviewUserFilter}
                  onChange={(e) => setReviewUserFilter(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} ({item.correo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Producto</th>
                    <th>Calificacion</th>
                    <th>Comentario</th>
                    <th>Estado</th>
                    <th>Moderado por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyCell}>
                        No hay reseñas para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.createdAt).toLocaleDateString("es-MX")}</td>
                        <td>{item.user.nombre}</td>
                        <td>{item.product.nombre}</td>
                        <td className={styles.ratingStars}>{renderRatingStars(item.rating)}</td>
                        <td>{item.comment}</td>
                        <td>
                          <span
                            className={
                              item.status === "APPROVED"
                                ? styles.statusActive
                                : item.status === "PENDING"
                                  ? styles.statusPending
                                  : styles.statusInactive
                            }
                          >
                            {formatReviewStatus(item.status)}
                          </span>
                        </td>
                        <td>{item.approvedBy?.nombre ?? "-"}</td>
                        <td className={styles.actionsCell}>
                          {item.status === "PENDING" ? (
                            <button
                              type="button"
                              disabled={reviewActionId === item.id}
                              onClick={() => void approvePendingReview(item.id)}
                            >
                              {reviewActionId === item.id ? "Guardando..." : "Aprobar"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={styles.danger}
                            disabled={reviewActionId === item.id}
                            onClick={() =>
                              requestConfirmation({
                                title: "Confirmar eliminacion de reseña",
                                description: `Se eliminara la reseña de "${item.user.nombre}" para "${item.product.nombre}".`,
                                confirmLabel: "Eliminar reseña",
                                tone: "danger",
                                onConfirm: () => removeReviewItem(item.id),
                              })
                            }
                          >
                            {reviewActionId === item.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {section === "profile" ? (
          <section className={styles.section}>
            <h2>Editar perfil</h2>
            <form className={styles.form} onSubmit={submitProfile}>
              <input
                name="nombre"
                placeholder="Nombre"
                value={profileForm.nombre}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
              <input
                name="correo"
                type="email"
                placeholder="Correo"
                value={profileForm.correo}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, correo: e.target.value }))
                }
              />
              <input
                name="telefono"
                placeholder="Telefono"
                value={profileForm.telefono}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, telefono: e.target.value }))
                }
              />
              <input
                name="direccion"
                placeholder="Direccion"
                value={profileForm.direccion}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, direccion: e.target.value }))
                }
              />
              <input
                name="password"
                type="password"
                placeholder="Nueva password (opcional)"
                value={profileForm.password}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirmar nueva password"
                value={profileForm.confirmPassword}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
              <div className={styles.formActions}>
                <button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Guardando..." : "Guardar perfil"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {section === "dbMonitoring" ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Monitoreo de la base de datos</h2>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() =>
                  void (token &&
                    Promise.all([loadDatabaseStats(token), loadBackupRecords(token)]))
                }
                disabled={loadingDbStatus || loadingBackupRecords}
              >
                {loadingDbStatus || loadingBackupRecords
                  ? "Actualizando..."
                  : "Actualizar estado"}
              </button>
            </div>

            <div className={styles.dbHero}>
              <div className={styles.dbHeroMain}>
                <p>Base de datos activa</p>
                <h3>{dbStatus?.databaseName ?? "Sin datos"}</h3>
                <span>
                  Ultima revision:{" "}
                  {dbStatus
                    ? new Date(dbStatus.checkedAt).toLocaleString("es-MX")
                    : "Sin datos"}
                </span>
              </div>

              <div className={styles.dbHeroStats}>
                <article>
                  <span>Tablas detectadas</span>
                  <strong>{formatNumber(dbTableItems.length)}</strong>
                </article>
                <article>
                  <span>Filas totales</span>
                  <strong>{formatNumber(dbStatus?.tables.totalRows ?? 0)}</strong>
                </article>
                <article>
                  <span>Peso total de tablas</span>
                  <strong>{dbStatus?.tables.totalSizePretty ?? "Sin datos"}</strong>
                </article>
              </div>
            </div>

            <div className={styles.monitorGrid}>
              <article className={styles.monitorCard}>
                <h3>Estado</h3>
                <strong className={dbStatus?.isOnline ? styles.stateOk : styles.stateWarn}>
                  {dbStatus?.isOnline ? "Conectada" : "Sin datos"}
                </strong>
                <span>Servicio: {dbStatus?.isOnline ? "Disponible" : "Sin datos"}</span>
              </article>

              <article className={styles.monitorCard}>
                <h3>Tamaño y uptime</h3>
                <strong>{dbStatus?.sizePretty ?? "Sin datos"}</strong>
                <span>Uptime: {formatUptime(dbStatus?.uptimeSeconds ?? 0)}</span>
              </article>

              <article className={styles.monitorCard}>
                <h3>Conexiones</h3>
                <strong>{formatNumber(dbStatus?.connections.total ?? 0)}</strong>
                <span>
                  Activas: {formatNumber(dbStatus?.connections.active ?? 0)} | Idle:{" "}
                  {formatNumber(dbStatus?.connections.idle ?? 0)}
                </span>
              </article>

              <article className={styles.monitorCard}>
                <h3>Transacciones</h3>
                <strong>{formatNumber(dbStatus?.transactions.commits ?? 0)}</strong>
                <span>Rollbacks: {formatNumber(dbStatus?.transactions.rollbacks ?? 0)}</span>
              </article>
            </div>

            <div className={styles.monitorMeta}>
              <p>
                <strong>Version:</strong> {dbStatus?.dbVersion ?? "Sin datos"}
              </p>
              <p>
                <strong>Peso de tablas:</strong> {dbStatus?.tables.totalSizePretty ?? "Sin datos"}
              </p>
              <p>
                <strong>Tabla principal:</strong>{" "}
                {heaviestDbTable
                  ? `${formatTableName(heaviestDbTable.tableName)} (${heaviestDbTable.sizePretty})`
                  : "Sin datos"}
              </p>
            </div>

            <div className={styles.tableInsights}>
              <div className={styles.tableInsightsHeader}>
                <h3>Tablas de la BD</h3>
                <p>Registros y tamaño de cada tabla</p>
              </div>

              {dbTableItems.length === 0 ? (
                <p className={styles.tableInsightsEmpty}>
                  Sin datos de tablas por el momento.
                </p>
              ) : (
                <div className={styles.tableInsightsList}>
                  <div className={styles.tableInsightsHead}>
                    <span>Tabla</span>
                    <span>Registros</span>
                    <span>Tamaño</span>
                  </div>
                  {dbTableItems.map((table, index) => (
                    <article key={table.tableName} className={styles.tableInsightsRow}>
                      <div className={styles.tableNameCell}>
                        <span className={styles.tableRank}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{formatTableName(table.tableName)}</strong>
                          <code>{table.tableName}</code>
                        </div>
                      </div>
                      <p>{formatNumber(table.rowCount)}</p>
                      <p>{table.sizePretty}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.backupPanel}>
              <h3>Generar respaldo de la base de datos</h3>
              <p>
                Puedes generar respaldo completo (<code>cemydi_backup_fecha_hora</code>) o
                respaldo por tabla (<code>cemydi_nombre_tabla_backup_fecha_hora</code>). Ambos
                se registran y se pueden descargar desde el historial.
              </p>
              <div className={styles.backupActions}>
                <button
                  type="button"
                  onClick={() => void generateBackup()}
                  disabled={generatingBackup || generatingTableBackup}
                >
                  {generatingBackup
                    ? "Generando respaldo..."
                    : "Generar respaldo de la base de datos"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTableBackupOptions((prev) => !prev)}
                  className={showTableBackupOptions ? styles.warning : undefined}
                  disabled={loadingDbStatus || generatingBackup || generatingTableBackup}
                >
                  {showTableBackupOptions
                    ? "Ocultar respaldo por tabla"
                    : "Generar respaldo de una sola tabla"}
                </button>
                <button
                  type="button"
                  onClick={() => void (token && loadBackupRecords(token))}
                  disabled={loadingBackupRecords || generatingBackup || generatingTableBackup}
                >
                  {loadingBackupRecords ? "Recargando..." : "Recargar historial"}
                </button>
                <button type="button" onClick={() => void refreshAdminData()}>
                  Recargar datos
                </button>
              </div>

              {showTableBackupOptions ? (
                <div className={styles.singleTableBackupBox}>
                  <label htmlFor="single-table-backup-select">Selecciona una tabla</label>
                  <div className={styles.singleTableBackupControls}>
                    <select
                      id="single-table-backup-select"
                      value={selectedBackupTable}
                      onChange={(e) => setSelectedBackupTable(e.target.value)}
                      disabled={dbTableItems.length === 0 || generatingTableBackup}
                    >
                      {dbTableItems.length === 0 ? (
                        <option value="">Sin tablas disponibles</option>
                      ) : (
                        dbTableItems.map((table) => (
                          <option key={table.tableName} value={table.tableName}>
                            {table.tableName}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => void generateSingleTableBackup()}
                      disabled={
                        !selectedBackupTable || generatingBackup || generatingTableBackup
                      }
                    >
                      {generatingTableBackup
                        ? "Generando respaldo..."
                        : "Generar respaldo de tabla seleccionada"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Fecha de generacion</th>
                      <th>Tamaño</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBackupRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          No hay respaldos generados.
                        </td>
                      </tr>
                    ) : (
                      paginatedBackupRecords.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <code>{item.fileName}</code>
                          </td>
                          <td>{formatBackupRecordDate(item)}</td>
                          <td>{formatBytes(item.sizeBytes)}</td>
                          <td className={styles.actionsCell}>
                            <button
                              type="button"
                              onClick={() => void downloadBackupRecord(item)}
                              disabled={
                                downloadingBackupId === item.id || deletingBackupId === item.id
                              }
                            >
                              {downloadingBackupId === item.id
                                ? "Descargando..."
                                : "Descargar"}
                            </button>
                            <button
                              type="button"
                              className={styles.danger}
                              disabled={deletingBackupId === item.id}
                              onClick={() =>
                                requestConfirmation({
                                  title: "Confirmar eliminacion de respaldo",
                                  description: `Se eliminara el registro "${item.fileName}".`,
                                  confirmLabel: "Eliminar respaldo",
                                  tone: "danger",
                                  onConfirm: () => removeBackupRecord(item),
                                })
                              }
                            >
                              {deletingBackupId === item.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <button
                  type="button"
                  onClick={() => setBackupPage((prev) => Math.max(1, prev - 1))}
                  disabled={backupPage === 1}
                >
                  Anterior
                </button>
                <span>
                  Pagina {backupPage} de {totalBackupPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBackupPage((prev) => Math.min(totalBackupPages, prev + 1))
                  }
                  disabled={backupPage === totalBackupPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {section === "extras" ? (
          <section className={styles.section}>
            <h2>Opciones extra</h2>
            <div className={styles.extraGrid}>
              <button type="button" onClick={() => router.push("/perfil")}>
                Ir al perfil de cliente
              </button>
              <button type="button" onClick={() => void refreshAdminData()}>
                Recargar datos
              </button>
              <button
                type="button"
                className={styles.danger}
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                Cerrar sesion
              </button>
            </div>
          </section>
        ) : null}

        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <ConfirmDialog
          open={Boolean(confirmRequest)}
          title={confirmRequest?.title ?? "Confirmar accion"}
          description={confirmRequest?.description}
          confirmLabel={confirmRequest?.confirmLabel}
          cancelLabel={confirmRequest?.cancelLabel}
          tone={confirmRequest?.tone}
          busy={confirmBusy}
          onCancel={closeConfirmation}
          onConfirm={executeConfirmation}
        />
      </main>
    </div>
  );
}
