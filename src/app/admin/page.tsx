"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import {
  ActiveUserSession,
  AdminReview,
  AdminPromotion,
  AdminProduct,
  AdminUser,
  AuthSecurityOverview,
  BrandOption,
  ClassificationOption,
  CreatePromotionPayload,
  DatabaseBackupRecord,
  DatabaseBackupSchedule,
  DatabaseStatus,
  LoginAuditEntry,
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
  deleteBrand,
  deleteClassification,
  deleteReview,
  deletePromotion,
  deleteProduct,
  deleteSupplier,
  deleteUser,
  createDatabaseBackupRecord,
  createSingleTableDatabaseBackupRecord,
  deleteDatabaseBackupRecord,
  deleteDatabaseBackupSchedule,
  downloadDatabaseBackupById,
  getAuthSecurityOverview,
  getDatabaseBackupSchedule,
  getDatabaseStatus,
  listAdminReviews,
  listDatabaseBackups,
  listCatalogs,
  listProducts,
  listPromotions,
  listSuppliers,
  listUsers,
  updateBrand,
  updateClassification,
  updateProduct,
  updatePromotion,
  updateSupplier,
  updateDatabaseBackupSchedule,
  updateUser,
} from "@/services/admin";
import { logoutUser } from "@/services/auth";
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

type ProductImportRowStatusTone = "ready" | "existing" | "danger";
type ProductExportOrderOption =
  | "name-asc"
  | "name-desc"
  | "stock-desc"
  | "stock-asc"
  | "price-desc"
  | "price-asc"
  | "createdAt-desc"
  | "createdAt-asc";

type ProductExportFilters = {
  supplier: string;
  mode: ProductMode | "ALL";
  requiresPrescription: "ALL" | "YES" | "NO";
  activeStatus: "ALL" | "ACTIVE" | "INACTIVE";
  limit: "ALL" | "10" | "30" | "50" | "100";
  orderBy: ProductExportOrderOption;
};

type ProductCsvTemplateVariant = "generic" | "custom";

type ProductCsvTemplateRow = Record<ProductCsvColumnKey, string>;

type ProductCsvTemplatePreview = {
  variant: ProductCsvTemplateVariant;
  columns: ProductCsvColumnKey[];
  fileName: string;
  sampleRows: ProductCsvTemplateRow[];
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

const PRODUCT_CSV_REQUIRED_COLUMN_KEYS: ProductCsvColumnKey[] = PRODUCT_CSV_COLUMNS.filter(
  (column) => column.required,
).map((column) => column.key);

const PRODUCT_CSV_TEMPLATE_SAMPLE_ROWS: ProductCsvTemplateRow[] = [
  {
    nombre: "Silla de ruedas estandar",
    marca: "Drive",
    modelo: "SR-001",
    descripcion: "Silla de ruedas plegable de acero para uso diario.",
    precio: "4500",
    clasificacion: "Movilidad",
    stock: "12",
    proveedor: "Novavida",
    tipoAdquisicion: "VENTA",
    requiereReceta: "False",
    activo: "True",
  },
  {
    nombre: "Tanque oxigeno 680L",
    marca: "Infra",
    modelo: "TO-680L",
    descripcion: "Tanque de oxigeno portatil para renta o venta.",
    precio: "7100",
    clasificacion: "Equipo Medico",
    stock: "5",
    proveedor: "Infra",
    tipoAdquisicion: "RENTA",
    requiereReceta: "True",
    activo: "True",
  },
];

const defaultProductExportFilters: ProductExportFilters = {
  supplier: "ALL",
  mode: "ALL",
  requiresPrescription: "ALL",
  activeStatus: "ALL",
  limit: "ALL",
  orderBy: "name-asc",
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

const defaultBackupScheduleForm = {
  enabled: false,
  everyDays: "1",
  runAtTime: "03:00",
  retentionDays: "7",
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
  const fileNameMatch = backup.fileName.match(/_(\d{8})_(\d{6})(\d{0,3})\.tar$/i);
  if (fileNameMatch) {
    const [, datePart, timePart, millisecondPart] = fileNameMatch;
    const year = Number(datePart.slice(0, 4));
    const month = Number(datePart.slice(4, 6));
    const day = Number(datePart.slice(6, 8));
    const hour = Number(timePart.slice(0, 2));
    const minute = Number(timePart.slice(2, 4));
    const second = Number(timePart.slice(4, 6));
    const millisecond = Number((millisecondPart || "").padEnd(3, "0") || "0");
    const parsedFromFileName = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      millisecond,
    );

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

function formatScheduleDateTime(value: string | null) {
  if (!value) {
    return "Sin programar";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin programar";
  }

  return parsed.toLocaleString("es-MX");
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha";
  }

  return parsed.toLocaleString("es-MX");
}

function formatRelativeTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin actividad";
  }

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 60_000) {
    return "Hace un momento";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function formatAuditReason(reason: string | null) {
  switch (reason) {
    case "LOGIN_OK":
      return "Acceso correcto";
    case "USER_NOT_FOUND":
      return "Usuario no encontrado";
    case "INVALID_PASSWORD":
      return "Password incorrecto";
    case "USER_INACTIVE":
      return "Usuario inactivo";
    default:
      return reason ? reason.replace(/_/g, " ") : "Sin detalle";
  }
}

function getInitialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "NA";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function validateBackupScheduleForm(form: typeof defaultBackupScheduleForm) {
  const everyDays = Number(form.everyDays);
  const retentionDays = Number(form.retentionDays);

  if (!Number.isInteger(everyDays) || everyDays < 1 || everyDays > 365) {
    return "Cada cuantos dias debe ser un numero entero entre 1 y 365.";
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.runAtTime.trim())) {
    return "La hora debe tener formato HH:mm.";
  }

  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return "La retencion debe ser un numero entero entre 1 y 3650 dias.";
  }

  return null;
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

function getProductCsvTemplateValue(
  row: ProductCsvTemplateRow,
  column: ProductCsvColumnKey,
) {
  return row[column];
}

function createProductTemplatePreview(
  columns: ProductCsvColumnKey[],
  variant: ProductCsvTemplateVariant,
) {
  const orderedColumns = PRODUCT_CSV_COLUMNS.map((column) => column.key).filter((key) =>
    columns.includes(key),
  );

  if (orderedColumns.length === 0) {
    throw new Error("Selecciona al menos una columna para generar la plantilla.");
  }

  return {
    variant,
    columns: orderedColumns,
    fileName:
      variant === "generic"
        ? "plantilla_productos_generica.csv"
        : "plantilla_productos_personalizada.csv",
    sampleRows: PRODUCT_CSV_TEMPLATE_SAMPLE_ROWS,
  } as ProductCsvTemplatePreview;
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

function getProductImportRowStatus(row: ProductCsvImportRow): {
  label: string;
  tone: ProductImportRowStatusTone;
} {
  if (row.validationError) {
    return {
      label: row.validationError,
      tone: "danger",
    };
  }

  if (row.duplicateExistingModel) {
    return {
      label: "Modelo duplicado (ya existe)",
      tone: "existing",
    };
  }

  if (row.duplicateInFile) {
    return {
      label: "Modelo duplicado en CSV",
      tone: "danger",
    };
  }

  return {
    label: "Lista para importar",
    tone: "ready",
  };
}

function getProductCreatedAtTimestamp(product: AdminProduct) {
  if (!product.createdAt) return 0;
  const parsed = new Date(product.createdAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function applyProductExportFilters(
  items: AdminProduct[],
  filters: ProductExportFilters,
) {
  const filtered = items.filter((product) => {
    if (filters.supplier !== "ALL" && product.proveedor !== filters.supplier) {
      return false;
    }

    if (filters.mode !== "ALL" && product.tipoAdquisicion !== filters.mode) {
      return false;
    }

    if (
      filters.requiresPrescription === "YES" &&
      !product.requiereReceta
    ) {
      return false;
    }

    if (
      filters.requiresPrescription === "NO" &&
      product.requiereReceta
    ) {
      return false;
    }

    if (filters.activeStatus === "ACTIVE" && !product.activo) {
      return false;
    }

    if (filters.activeStatus === "INACTIVE" && product.activo) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filters.orderBy) {
      case "name-desc":
        return b.nombre.localeCompare(a.nombre, "es", { sensitivity: "base" });
      case "stock-desc":
        return b.stock - a.stock || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      case "stock-asc":
        return a.stock - b.stock || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      case "price-desc":
        return b.precio - a.precio || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      case "price-asc":
        return a.precio - b.precio || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      case "createdAt-desc":
        return (
          getProductCreatedAtTimestamp(b) - getProductCreatedAtTimestamp(a) ||
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
        );
      case "createdAt-asc":
        return (
          getProductCreatedAtTimestamp(a) - getProductCreatedAtTimestamp(b) ||
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
        );
      case "name-asc":
      default:
        return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    }
  });

  if (filters.limit === "ALL") {
    return sorted;
  }

  return sorted.slice(0, Number(filters.limit));
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, logout, updateUser: syncUser } = useAuth();

  const [ready, setReady] = useState(false);
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
  const [selectedExistingImportRows, setSelectedExistingImportRows] = useState<number[]>([]);
  const [importingProductsFromCsv, setImportingProductsFromCsv] = useState(false);
  const [showProductTemplateModal, setShowProductTemplateModal] = useState(false);
  const [productTemplatePreview, setProductTemplatePreview] =
    useState<ProductCsvTemplatePreview | null>(null);
  const [selectedProductTemplateColumns, setSelectedProductTemplateColumns] = useState<
    ProductCsvColumnKey[]
  >(() => PRODUCT_CSV_COLUMNS.map((column) => column.key));
  const [showProductExportModal, setShowProductExportModal] = useState(false);
  const [selectedProductExportColumns, setSelectedProductExportColumns] = useState<
    ProductCsvColumnKey[]
  >(() => PRODUCT_CSV_COLUMNS.map((column) => column.key));
  const [productExportFilters, setProductExportFilters] = useState<ProductExportFilters>(
    defaultProductExportFilters,
  );

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [classifications, setClassifications] = useState<ClassificationOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [catalogForm, setCatalogForm] = useState(defaultCatalogForm);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editingClassificationId, setEditingClassificationId] = useState<number | null>(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [selectedClassificationIds, setSelectedClassificationIds] = useState<number[]>([]);
  const [brandPage, setBrandPage] = useState(1);
  const [classificationPage, setClassificationPage] = useState(1);
  const [brandSearch, setBrandSearch] = useState("");
  const [classificationSearch, setClassificationSearch] = useState("");
  const [savingCatalog, setSavingCatalog] = useState<
    "brand" | "classification" | null
  >(null);
  const [supplierForm, setSupplierForm] = useState(defaultSupplierForm);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
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
  const [backupSchedule, setBackupSchedule] = useState<DatabaseBackupSchedule | null>(null);
  const [backupScheduleForm, setBackupScheduleForm] = useState(defaultBackupScheduleForm);
  const [loadingBackupSchedule, setLoadingBackupSchedule] = useState(false);
  const [savingBackupSchedule, setSavingBackupSchedule] = useState(false);
  const [authSecurityOverview, setAuthSecurityOverview] = useState<AuthSecurityOverview | null>(null);
  const [loadingAuthSecurityOverview, setLoadingAuthSecurityOverview] = useState(false);

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

  const exportSupplierOptions = useMemo(
    () =>
      Array.from(new Set(products.map((item) => item.proveedor.trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "es", { sensitivity: "base" }),
      ),
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

  const filteredProductsForExport = useMemo(
    () => applyProductExportFilters(products, productExportFilters),
    [productExportFilters, products],
  );

  const existingImportRowLineNumbers = useMemo(
    () =>
      (productImportPreview?.rows ?? [])
        .filter((row) => row.duplicateExistingModel)
        .map((row) => row.lineNumber),
    [productImportPreview],
  );

  const selectedExistingImportRowSet = useMemo(
    () => new Set(selectedExistingImportRows),
    [selectedExistingImportRows],
  );

  const allExistingImportRowsSelected =
    existingImportRowLineNumbers.length > 0 &&
    existingImportRowLineNumbers.every((lineNumber) =>
      selectedExistingImportRowSet.has(lineNumber),
    );

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

  const filteredBrands = useMemo(() => {
    const term = brandSearch.trim().toLowerCase();
    if (!term) return brands;

    return brands.filter((item) => item.nombre.toLowerCase().includes(term));
  }, [brandSearch, brands]);
  const totalBrandPages = Math.max(1, Math.ceil(filteredBrands.length / CATALOG_PAGE_SIZE));
  const paginatedBrands = useMemo(() => {
    const start = (brandPage - 1) * CATALOG_PAGE_SIZE;
    const end = start + CATALOG_PAGE_SIZE;
    return filteredBrands.slice(start, end);
  }, [brandPage, filteredBrands]);
  const selectedBrandIdSet = useMemo(() => new Set(selectedBrandIds), [selectedBrandIds]);
  const selectedBrandItem = useMemo(
    () =>
      selectedBrandIds.length === 1
        ? brands.find((item) => item.id === selectedBrandIds[0]) ?? null
        : null,
    [brands, selectedBrandIds],
  );
  const selectedBrandsOnPageCount = useMemo(
    () => paginatedBrands.filter((item) => selectedBrandIdSet.has(item.id)).length,
    [paginatedBrands, selectedBrandIdSet],
  );

  const filteredClassifications = useMemo(() => {
    const term = classificationSearch.trim().toLowerCase();
    if (!term) return classifications;

    return classifications.filter((item) => item.nombre.toLowerCase().includes(term));
  }, [classificationSearch, classifications]);
  const totalClassificationPages = Math.max(
    1,
    Math.ceil(filteredClassifications.length / CATALOG_PAGE_SIZE),
  );
  const paginatedClassifications = useMemo(() => {
    const start = (classificationPage - 1) * CATALOG_PAGE_SIZE;
    const end = start + CATALOG_PAGE_SIZE;
    return filteredClassifications.slice(start, end);
  }, [classificationPage, filteredClassifications]);
  const selectedClassificationIdSet = useMemo(
    () => new Set(selectedClassificationIds),
    [selectedClassificationIds],
  );
  const selectedClassificationItem = useMemo(
    () =>
      selectedClassificationIds.length === 1
        ? classifications.find((item) => item.id === selectedClassificationIds[0]) ?? null
        : null,
    [classifications, selectedClassificationIds],
  );
  const selectedClassificationsOnPageCount = useMemo(
    () =>
      paginatedClassifications.filter((item) => selectedClassificationIdSet.has(item.id)).length,
    [paginatedClassifications, selectedClassificationIdSet],
  );
  const selectedSupplierIdSet = useMemo(
    () => new Set(selectedSupplierIds),
    [selectedSupplierIds],
  );
  const selectedSupplierItem = useMemo(
    () =>
      selectedSupplierIds.length === 1
        ? suppliers.find((item) => item.id === selectedSupplierIds[0]) ?? null
        : null,
    [selectedSupplierIds, suppliers],
  );
  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    if (!term) return suppliers;

    return suppliers.filter((item) => {
      const fields = [item.nombre, item.encargado, item.repartidor, item.direccion];
      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [supplierSearch, suppliers]);

  const dbTableItems = useMemo(() => dbStatus?.tables.items ?? [], [dbStatus]);
  const heaviestDbTable = dbTableItems[0] ?? null;
  const activeSessions = useMemo<ActiveUserSession[]>(
    () => authSecurityOverview?.activeSessions ?? [],
    [authSecurityOverview],
  );
  const loginAuditItems = useMemo<LoginAuditEntry[]>(
    () => authSecurityOverview?.loginAttempts ?? [],
    [authSecurityOverview],
  );
  const visibleActiveSessions = useMemo(
    () => activeSessions.slice(0, 3),
    [activeSessions],
  );
  const visibleLoginAuditItems = useMemo(
    () => loginAuditItems.slice(0, 3),
    [loginAuditItems],
  );
  const securitySummary = authSecurityOverview?.summary ?? null;

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
    if (!backupSchedule) {
      setBackupScheduleForm(defaultBackupScheduleForm);
      return;
    }

    setBackupScheduleForm({
      enabled: backupSchedule.enabled,
      everyDays: String(backupSchedule.everyDays),
      runAtTime: backupSchedule.runAtTime,
      retentionDays: String(backupSchedule.retentionDays),
    });
  }, [backupSchedule]);

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
    if (!productImportPreview) {
      if (selectedExistingImportRows.length > 0) {
        setSelectedExistingImportRows([]);
      }
      return;
    }

    const existingRowSet = new Set(
      productImportPreview.rows
        .filter((row) => row.duplicateExistingModel)
        .map((row) => row.lineNumber),
    );

    setSelectedExistingImportRows((prev) =>
      prev.filter((lineNumber) => existingRowSet.has(lineNumber)),
    );
  }, [productImportPreview, selectedExistingImportRows.length]);

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

  useEffect(() => {
    const availableIds = new Set(brands.map((item) => item.id));
    setSelectedBrandIds((prev) => prev.filter((id) => availableIds.has(id)));

    if (editingBrandId && !availableIds.has(editingBrandId)) {
      setEditingBrandId(null);
      setCatalogForm((prev) => ({ ...prev, marca: "" }));
    }
  }, [brands, editingBrandId]);

  useEffect(() => {
    const availableIds = new Set(classifications.map((item) => item.id));
    setSelectedClassificationIds((prev) => prev.filter((id) => availableIds.has(id)));

    if (editingClassificationId && !availableIds.has(editingClassificationId)) {
      setEditingClassificationId(null);
      setCatalogForm((prev) => ({ ...prev, clasificacion: "" }));
    }
  }, [classifications, editingClassificationId]);

  useEffect(() => {
    const availableIds = new Set(suppliers.map((item) => item.id));
    setSelectedSupplierIds((prev) => prev.filter((id) => availableIds.has(id)));

    if (editingSupplierId && !availableIds.has(editingSupplierId)) {
      setEditingSupplierId(null);
      setSupplierForm(defaultSupplierForm);
    }
  }, [editingSupplierId, suppliers]);

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

  const loadDashboard = useCallback(async () => {
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
          listUsers(),
          listProducts(),
          listCatalogs(),
          listSuppliers(),
          listPromotions(),
          listAdminReviews({ status: "ALL" }),
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

  const loadDatabaseStats = useCallback(async () => {
    try {
      setLoadingDbStatus(true);
      const result = await getDatabaseStatus();
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

  const loadBackupRecords = useCallback(async () => {
    try {
      setLoadingBackupRecords(true);
      const result = await listDatabaseBackups();
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

  const loadBackupSchedule = useCallback(async () => {
    try {
      setLoadingBackupSchedule(true);
      const result = await getDatabaseBackupSchedule();
      setBackupSchedule(result.schedule);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar la programacion de respaldos";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setLoadingBackupSchedule(false);
    }
  }, [handleSessionError]);

  const loadAuthSecurityData = useCallback(async () => {
    try {
      setLoadingAuthSecurityOverview(true);
      const result = await getAuthSecurityOverview();
      setAuthSecurityOverview(result.overview);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar el estado de sesiones";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setLoadingAuthSecurityOverview(false);
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

    setProfileForm({
      nombre: String(user.nombre ?? ""),
      correo: String(user.correo ?? ""),
      telefono: String(user.telefono ?? ""),
      direccion: String(user.direccion ?? ""),
      password: "",
      confirmPassword: "",
    });
    setReady(true);
    void loadDashboard();
    void loadDatabaseStats();
    void loadBackupRecords();
    void loadBackupSchedule();
    void loadAuthSecurityData();
  }, [
    loadAuthSecurityData,
    loadBackupRecords,
    loadBackupSchedule,
    loadDashboard,
    loadDatabaseStats,
    loading,
    logout,
    router,
    user,
  ]);

  useEffect(() => {
    if (section !== "dbMonitoring" || !user) {
      return;
    }

    void loadDatabaseStats();
    void loadBackupRecords();
    void loadBackupSchedule();
    void loadAuthSecurityData();
  }, [loadAuthSecurityData, loadBackupRecords, loadBackupSchedule, loadDatabaseStats, section, user]);

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
    if (!user) return;

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
        const result = await updateUser( editingUserId, payload);
        setUsers((prev) =>
          prev.map((item) => (item.id === editingUserId ? result.user : item)),
        );
        setNotice({ type: "success", text: "Usuario actualizado." });
      } else {
        const result = await createUser( {
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
    if (!user) return;

    try {
      await deleteUser( id);
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
    if (!user) return;

    try {
      const result = await updateUser( item.id, { activo: !item.activo });
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
    if (!user) return;

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
        const result = await updateProduct( editingProductId, payload);
        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingProductId ? result.product : item,
          ),
        );
        setNotice({ type: "success", text: "Producto actualizado." });
      } else {
        const result = await createProduct( payload);
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
    if (!user) return;

    try {
      await deleteProduct( id);
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
    if (!user) return;

    try {
      const result = await updateProduct( item.id, { activo: !item.activo });
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

  const openProductTemplateModal = () => {
    setProductTemplatePreview(null);
    setSelectedProductTemplateColumns(PRODUCT_CSV_COLUMNS.map((column) => column.key));
    setShowProductTemplateModal(true);
  };

  const openProductExportModal = () => {
    if (selectedProductExportColumns.length === 0) {
      setSelectedProductExportColumns(PRODUCT_CSV_COLUMNS.map((column) => column.key));
    }
    setProductExportFilters(defaultProductExportFilters);
    setShowProductExportModal(true);
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
      setSelectedExistingImportRows([]);
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
    setSelectedExistingImportRows([]);
  };

  const closeProductTemplateModal = () => {
    setShowProductTemplateModal(false);
    setProductTemplatePreview(null);
  };

  const importProductsFromCsv = async () => {
    if (!user || !productImportPreview) return;

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
          const result = await createProduct( row.payload);
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

  const toggleTemplateColumn = (columnKey: ProductCsvColumnKey) => {
    if (PRODUCT_CSV_REQUIRED_COLUMN_KEYS.includes(columnKey)) {
      return;
    }

    setSelectedProductTemplateColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((item) => item !== columnKey)
        : [...prev, columnKey],
    );
  };

  const updateProductExportFilter = <K extends keyof ProductExportFilters>(
    key: K,
    value: ProductExportFilters[K],
  ) => {
    setProductExportFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetProductExportFilters = () => {
    setProductExportFilters(defaultProductExportFilters);
  };

  const applyTopStockExportPreset = () => {
    setProductExportFilters((prev) => ({
      ...prev,
      orderBy: "stock-desc",
      limit: prev.limit === "ALL" ? "10" : prev.limit,
    }));
  };

  const applyTopPriceExportPreset = () => {
    setProductExportFilters((prev) => ({
      ...prev,
      orderBy: "price-desc",
      limit: prev.limit === "ALL" ? "10" : prev.limit,
    }));
  };

  const generateGenericProductTemplate = () => {
    setProductTemplatePreview(
      createProductTemplatePreview(
        PRODUCT_CSV_COLUMNS.map((column) => column.key),
        "generic",
      ),
    );
  };

  const generateCustomProductTemplate = () => {
    setProductTemplatePreview(
      createProductTemplatePreview(selectedProductTemplateColumns, "custom"),
    );
  };

  const resetCustomTemplateColumns = () => {
    setSelectedProductTemplateColumns([...PRODUCT_CSV_REQUIRED_COLUMN_KEYS]);
  };

  const selectAllTemplateColumns = () => {
    setSelectedProductTemplateColumns(PRODUCT_CSV_COLUMNS.map((column) => column.key));
  };

  const downloadProductTemplate = (preview: ProductCsvTemplatePreview) => {
    const csvContent = buildCsvContent<ProductCsvTemplateRow>(
      [],
      preview.columns,
      getProductCsvTemplateValue,
    );

    downloadCsvFile(csvContent, preview.fileName);
    setShowProductTemplateModal(false);
    setProductTemplatePreview(null);
    setNotice({
      type: "success",
      text: `Plantilla descargada: ${preview.fileName}`,
    });
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
    if (filteredProductsForExport.length === 0) {
      setNotice({
        type: "error",
        text: "No hay productos que coincidan con los filtros de exportacion.",
      });
      return;
    }

    const csvContent = buildCsvContent(
      filteredProductsForExport,
      orderedColumns,
      getProductCsvValue,
    );
    const fileName = `${filePrefix}_${createFileTimestamp()}.csv`;
    downloadCsvFile(csvContent, fileName);
    setShowProductExportModal(false);
    setNotice({
      type: "success",
      text: `CSV exportado: ${fileName} (${filteredProductsForExport.length} productos).`,
    });
  };

  const onCatalogInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCatalogForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetBrandEditor = () => {
    setEditingBrandId(null);
    setCatalogForm((prev) => ({ ...prev, marca: "" }));
  };

  const resetClassificationEditor = () => {
    setEditingClassificationId(null);
    setCatalogForm((prev) => ({ ...prev, clasificacion: "" }));
  };

  const toggleBrandSelection = (id: number) => {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const toggleClassificationSelection = (id: number) => {
    setSelectedClassificationIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const toggleVisibleBrandsSelection = () => {
    const visibleIds = paginatedBrands.map((item) => item.id);
    const everyVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedBrandIdSet.has(id));

    setSelectedBrandIds((prev) =>
      everyVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const toggleVisibleClassificationsSelection = () => {
    const visibleIds = paginatedClassifications.map((item) => item.id);
    const everyVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedClassificationIdSet.has(id));

    setSelectedClassificationIds((prev) =>
      everyVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const startBrandEdit = (item: BrandOption) => {
    setEditingBrandId(item.id);
    setSelectedBrandIds([item.id]);
    setCatalogForm((prev) => ({ ...prev, marca: item.nombre }));
  };

  const startClassificationEdit = (item: ClassificationOption) => {
    setEditingClassificationId(item.id);
    setSelectedClassificationIds([item.id]);
    setCatalogForm((prev) => ({ ...prev, clasificacion: item.nombre }));
  };

  const describeSelectedCatalogItems = <
    T extends { id: number; nombre: string },
  >(
    items: T[],
    selectedIds: number[],
  ) => {
    const selectedNames = items
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => `"${item.nombre}"`);

    if (selectedNames.length <= 3) {
      return selectedNames.join(", ");
    }

    return `${selectedNames.slice(0, 3).join(", ")} y ${selectedNames.length - 3} mas`;
  };

  const removeSelectedBrands = async (ids: number[]) => {
    if (!user || ids.length === 0) return;

    try {
      setSavingCatalog("brand");
      await Promise.all(ids.map((id) => deleteBrand( id)));
      setBrands((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelectedBrandIds((prev) => prev.filter((id) => !ids.includes(id)));
      if (editingBrandId && ids.includes(editingBrandId)) {
        resetBrandEditor();
      }
      setNotice({
        type: "success",
        text: ids.length === 1 ? "Marca eliminada." : `${ids.length} marcas eliminadas.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron eliminar las marcas";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingCatalog(null);
    }
  };

  const removeSelectedClassifications = async (ids: number[]) => {
    if (!user || ids.length === 0) return;

    try {
      setSavingCatalog("classification");
      await Promise.all(ids.map((id) => deleteClassification( id)));
      setClassifications((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelectedClassificationIds((prev) => prev.filter((id) => !ids.includes(id)));
      if (editingClassificationId && ids.includes(editingClassificationId)) {
        resetClassificationEditor();
      }
      setNotice({
        type: "success",
        text:
          ids.length === 1
            ? "Clasificacion eliminada."
            : `${ids.length} clasificaciones eliminadas.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar las clasificaciones";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingCatalog(null);
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm(defaultSupplierForm);
    setEditingSupplierId(null);
  };

  const toggleSupplierSelection = (id: number) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const toggleVisibleSuppliersSelection = () => {
    const visibleIds = filteredSuppliers.map((item) => item.id);
    const everyVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedSupplierIdSet.has(id));

    setSelectedSupplierIds((prev) =>
      everyVisibleSelected ? [] : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const startSupplierEdit = (item: SupplierOption) => {
    setEditingSupplierId(item.id);
    setSelectedSupplierIds([item.id]);
    setSupplierForm({
      nombre: item.nombre,
      encargado: item.encargado,
      repartidor: item.repartidor,
      direccion: item.direccion,
    });
  };

  const removeSelectedSuppliers = async (ids: number[]) => {
    if (!user || ids.length === 0) return;

    try {
      setSavingSupplier(true);
      await Promise.all(ids.map((id) => deleteSupplier( id)));
      setSuppliers((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelectedSupplierIds((prev) => prev.filter((id) => !ids.includes(id)));
      if (editingSupplierId && ids.includes(editingSupplierId)) {
        resetSupplierForm();
      }
      setNotice({
        type: "success",
        text:
          ids.length === 1
            ? "Proveedor eliminado."
            : `${ids.length} proveedores eliminados.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron eliminar los proveedores";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingSupplier(false);
    }
  };

  const requestDeleteSuppliersConfirmation = (ids: number[]) => {
    const selectedIds = [...ids];
    if (selectedIds.length === 0) return;

    const finalConfirmation: ConfirmRequest = {
      title:
        selectedIds.length === 1
          ? "Eliminar proveedor definitivamente"
          : "Eliminar proveedores definitivamente",
      description: `Esta accion no se puede deshacer. Se eliminaran ${selectedIds.length} proveedor${
        selectedIds.length === 1 ? "" : "es"
      }: ${describeSelectedCatalogItems(suppliers, selectedIds)}.`,
      confirmLabel:
        selectedIds.length === 1 ? "Eliminar proveedor" : "Eliminar seleccionados",
      tone: "danger",
      onConfirm: () => removeSelectedSuppliers(selectedIds),
    };

    requestConfirmation({
      title:
        selectedIds.length === 1
          ? "Confirmar seleccion de proveedor"
          : "Confirmar seleccion de proveedores",
      description: `Vas a preparar la eliminacion de ${selectedIds.length} proveedor${
        selectedIds.length === 1 ? "" : "es"
      }: ${describeSelectedCatalogItems(suppliers, selectedIds)}.`,
      confirmLabel: "Continuar",
      tone: "default",
      onConfirm: async () => {
        window.setTimeout(() => {
          requestConfirmation(finalConfirmation);
        }, 0);
      },
    });
  };

  const onSupplierInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSupplierForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationError = validateCatalogName(catalogForm.marca, "Marca");
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      setSavingCatalog("brand");
      if (editingBrandId) {
        const result = await updateBrand( editingBrandId, {
          nombre: catalogForm.marca.trim(),
        });
        setBrands((prev) =>
          sortByName(prev.map((item) => (item.id === editingBrandId ? result.brand : item))),
        );
        setSelectedBrandIds([result.brand.id]);
        resetBrandEditor();
        setNotice({ type: "success", text: "Marca actualizada." });
      } else {
        const result = await createBrand( {
          nombre: catalogForm.marca.trim(),
        });
        setBrands((prev) => sortByName([...prev, result.brand]));
        setBrandPage(1);
        setCatalogForm((prev) => ({ ...prev, marca: "" }));
        setNotice({ type: "success", text: "Marca creada." });
      }
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
    if (!user) return;

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
      if (editingClassificationId) {
        const result = await updateClassification( editingClassificationId, {
          nombre: catalogForm.clasificacion.trim(),
        });
        setClassifications((prev) =>
          sortByName(
            prev.map((item) =>
              item.id === editingClassificationId ? result.classification : item,
            ),
          ),
        );
        setSelectedClassificationIds([result.classification.id]);
        resetClassificationEditor();
        setNotice({ type: "success", text: "Clasificacion actualizada." });
      } else {
        const result = await createClassification( {
          nombre: catalogForm.clasificacion.trim(),
        });
        setClassifications((prev) =>
          sortByName([...prev, result.classification]),
        );
        setClassificationPage(1);
        setCatalogForm((prev) => ({ ...prev, clasificacion: "" }));
        setNotice({ type: "success", text: "Clasificacion creada." });
      }
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
    if (!user) return;

    const validationError = validateSupplierPayload(supplierForm);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      setSavingSupplier(true);
      const payload = {
        nombre: supplierForm.nombre.trim(),
        encargado: supplierForm.encargado.trim(),
        repartidor: supplierForm.repartidor.trim(),
        direccion: supplierForm.direccion.trim(),
      };

      if (editingSupplierId) {
        const result = await updateSupplier( editingSupplierId, payload);
        setSuppliers((prev) =>
          sortByName(
            prev.map((item) => (item.id === editingSupplierId ? result.supplier : item)),
          ),
        );
        setSelectedSupplierIds([result.supplier.id]);
        resetSupplierForm();
        setNotice({ type: "success", text: "Proveedor actualizado." });
      } else {
        const result = await createSupplier( payload);
        setSuppliers((prev) => sortByName([...prev, result.supplier]));
        setSupplierForm(defaultSupplierForm);
        setNotice({ type: "success", text: "Proveedor creado." });
      }
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
    if (!user) return;

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
        const result = await updatePromotion( editingPromotionId, commonPayload);
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

        const result = await createPromotion( payload);
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
    if (!user) return;

    try {
      await deletePromotion( id);
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
    if (!user) return;

    try {
      setReviewActionId(id);
      const result = await approveReview( id);
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
    if (!user) return;

    try {
      setReviewActionId(id);
      await deleteReview( id);
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
    if (!user) return;

    const profileValidationError = validateProfilePayload(profileForm);
    if (profileValidationError) {
      setNotice({ type: "error", text: profileValidationError });
      return;
    }

    try {
      setSavingProfile(true);
      const result = await updateMyProfile({
        nombre: profileForm.nombre.trim(),
        correo: profileForm.correo.trim(),
        telefono: profileForm.telefono.trim(),
        direccion: profileForm.direccion.trim(),
        ...(profileForm.password.trim()
          ? { password: profileForm.password.trim() }
          : {}),
      });
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
    if (!user) return;

    try {
      setGeneratingBackup(true);
      const result = await createDatabaseBackupRecord();
      setBackupRecords((prev) => [result.backup, ...prev]);
      setBackupPage(1);
      void loadDatabaseStats();
      toast.success(`Respaldo creado: ${result.backup.fileName}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo de base de datos";
      if (!handleSessionError(message)) {
        toast.error(message);
      }
    } finally {
      setGeneratingBackup(false);
    }
  };

  const generateSingleTableBackup = async () => {
    if (!user) return;

    if (!selectedBackupTable) {
      toast.error("Selecciona una tabla para generar el respaldo.");
      return;
    }

    try {
      setGeneratingTableBackup(true);
      const result = await createSingleTableDatabaseBackupRecord( selectedBackupTable);
      setBackupRecords((prev) => [result.backup, ...prev]);
      setBackupPage(1);
      void loadDatabaseStats();
      toast.success(`Respaldo de tabla creado: ${result.backup.fileName}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo de la tabla seleccionada";
      if (!handleSessionError(message)) {
        toast.error(message);
      }
    } finally {
      setGeneratingTableBackup(false);
    }
  };

  const downloadBackupRecord = async (backup: DatabaseBackupRecord) => {
    if (!user) return;

    try {
      setDownloadingBackupId(backup.id);
      const download = await downloadDatabaseBackupById( backup.id);
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
    if (!user) return;

    try {
      setDeletingBackupId(backup.id);
      const result = await deleteDatabaseBackupRecord( backup.id);
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

  const toggleExistingImportRowSelection = (lineNumber: number) => {
    setSelectedExistingImportRows((prev) =>
      prev.includes(lineNumber)
        ? prev.filter((item) => item !== lineNumber)
        : [...prev, lineNumber],
    );
  };

  const toggleAllExistingImportRows = () => {
    setSelectedExistingImportRows(
      allExistingImportRowsSelected ? [] : existingImportRowLineNumbers,
    );
  };

  const removeSelectedExistingImportRows = () => {
    if (!productImportPreview || selectedExistingImportRows.length === 0) return;

    const selectedRows = new Set(selectedExistingImportRows);
    setProductImportPreview((prev) =>
      prev
        ? {
            ...prev,
            rows: prev.rows.filter((row) => !selectedRows.has(row.lineNumber)),
          }
        : prev,
    );
    setSelectedExistingImportRows([]);
  };

  const saveBackupSchedule = async () => {
    if (!user) return;

    const validationError = validateBackupScheduleForm(backupScheduleForm);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    try {
      setSavingBackupSchedule(true);
      const result = await updateDatabaseBackupSchedule( {
        enabled: backupScheduleForm.enabled,
        everyDays: Number(backupScheduleForm.everyDays),
        runAtTime: backupScheduleForm.runAtTime.trim(),
        retentionDays: Number(backupScheduleForm.retentionDays),
      });
      setBackupSchedule(result.schedule);
      setNotice({
        type: "success",
        text:
          result.message ||
          "La programacion automatica de respaldos se actualizo correctamente.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la programacion automatica de respaldos";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingBackupSchedule(false);
    }
  };

  const loadBackupScheduleIntoForm = useCallback(() => {
    if (!backupSchedule) {
      setBackupScheduleForm(defaultBackupScheduleForm);
      return;
    }

    setBackupScheduleForm({
      enabled: backupSchedule.enabled,
      everyDays: String(backupSchedule.everyDays),
      runAtTime: backupSchedule.runAtTime,
      retentionDays: String(backupSchedule.retentionDays),
    });
    setNotice({ type: "success", text: "Registro de programacion cargado para edicion." });
  }, [backupSchedule]);

  const removeBackupSchedule = async () => {
    if (!user) return;

    try {
      setSavingBackupSchedule(true);
      const result = await deleteDatabaseBackupSchedule();
      setBackupSchedule(result.schedule);
      setNotice({
        type: "success",
        text: result.message || "La programacion automatica fue eliminada.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la programacion automatica de respaldos";
      if (!handleSessionError(message)) {
        setNotice({ type: "error", text: message });
      }
    } finally {
      setSavingBackupSchedule(false);
    }
  };

  const refreshAdminData = async () => {
    if (!user) return;

    await Promise.all([
      loadDashboard(),
      loadDatabaseStats(),
      loadBackupRecords(),
      loadBackupSchedule(),
      loadAuthSecurityData(),
    ]);
  };

  const performLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Si la sesion ya no es valida, igual limpiamos el estado local.
    } finally {
      logout();
      toast.success("Sesion cerrada correctamente");
      router.push("/login");
    }
  }, [logout, router]);

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
          onClick={() => void performLogout()}
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
                    onClick={openProductTemplateModal}
                  >
                    Generar plantilla (CSV)
                  </button>
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
                    onClick={openProductExportModal}
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

                  {existingImportRowLineNumbers.length > 0 ? (
                    <div className={styles.modalPreviewToolbar}>
                      <p className={styles.modalSelectionHint}>
                        Los productos ya existentes estan sombreados. Seleccionalos para quitarlos
                        de la vista previa y dejar solo los nuevos.
                      </p>
                      <div className={styles.modalSelectionActions}>
                        <label className={styles.modalCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={allExistingImportRowsSelected}
                            onChange={toggleAllExistingImportRows}
                            disabled={importingProductsFromCsv}
                          />
                          <span>
                            Seleccionar existentes ({formatNumber(existingImportRowLineNumbers.length)})
                          </span>
                        </label>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={removeSelectedExistingImportRows}
                          disabled={
                            importingProductsFromCsv || selectedExistingImportRows.length === 0
                          }
                        >
                          Quitar seleccionados ({formatNumber(selectedExistingImportRows.length)})
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.modalTableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Sel.</th>
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
                          const status = getProductImportRowStatus(row);
                          const isExistingSelected = selectedExistingImportRowSet.has(
                            row.lineNumber,
                          );
                          const rowClassName = row.duplicateExistingModel
                            ? [
                                styles.modalExistingRow,
                                isExistingSelected ? styles.modalExistingRowSelected : "",
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "";

                          return (
                            <tr key={`${row.lineNumber}-${row.modelo}`} className={rowClassName}>
                              <td className={styles.modalSelectionCell}>
                                {row.duplicateExistingModel ? (
                                  <input
                                    type="checkbox"
                                    checked={isExistingSelected}
                                    onChange={() =>
                                      toggleExistingImportRowSelection(row.lineNumber)
                                    }
                                    disabled={importingProductsFromCsv}
                                    aria-label={`Seleccionar producto existente en la linea ${row.lineNumber}`}
                                  />
                                ) : null}
                              </td>
                              <td>{row.lineNumber}</td>
                              <td>{row.nombre}</td>
                              <td>{row.modelo}</td>
                              <td>{row.precioRaw}</td>
                              <td>{row.stockRaw}</td>
                              <td>
                                <span
                                  className={[
                                    styles.modalStatusBadge,
                                    status.tone === "ready"
                                      ? styles.modalStatusReady
                                      : status.tone === "existing"
                                        ? styles.modalStatusExisting
                                        : styles.modalStatusDanger,
                                  ].join(" ")}
                                >
                                  {status.label}
                                </span>
                              </td>
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

                  <div className={styles.exportMetaBar}>
                    <div className={styles.exportMetaCard}>
                      <span>Productos a exportar</span>
                      <strong>{formatNumber(filteredProductsForExport.length)}</strong>
                      <small>de {formatNumber(products.length)} disponibles</small>
                    </div>
                    <div className={styles.exportMetaCard}>
                      <span>Orden actual</span>
                      <strong>
                        {productExportFilters.orderBy === "name-asc"
                          ? "Nombre A-Z"
                          : productExportFilters.orderBy === "name-desc"
                            ? "Nombre Z-A"
                            : productExportFilters.orderBy === "stock-desc"
                              ? "Stock mayor a menor"
                              : productExportFilters.orderBy === "stock-asc"
                                ? "Stock menor a mayor"
                                : productExportFilters.orderBy === "price-desc"
                                  ? "Precio mayor a menor"
                                  : productExportFilters.orderBy === "price-asc"
                                    ? "Precio menor a mayor"
                                    : productExportFilters.orderBy === "createdAt-desc"
                                      ? "Mas recientes"
                                      : "Mas antiguos"}
                      </strong>
                      <small>
                        Limite:{" "}
                        {productExportFilters.limit === "ALL"
                          ? "sin limite"
                          : `${productExportFilters.limit} productos`}
                      </small>
                    </div>
                  </div>

                  <div className={styles.exportFilterPanel}>
                    <div className={styles.exportFilterHeader}>
                      <div>
                        <h4>Filtros y orden</h4>
                        <p>
                          Ajusta el conjunto antes de descargar. Los atajos de mayor stock y mayor
                          precio aplican el orden recomendado automaticamente.
                        </p>
                      </div>
                      <div className={styles.exportQuickActions}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={applyTopStockExportPreset}
                        >
                          Mayor stock
                        </button>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={applyTopPriceExportPreset}
                        >
                          Mayor precio
                        </button>
                      </div>
                    </div>

                    <div className={styles.exportFilterGrid}>
                      <label className={styles.exportFilterField}>
                        <span>Proveedor</span>
                        <select
                          value={productExportFilters.supplier}
                          onChange={(e) => updateProductExportFilter("supplier", e.target.value)}
                        >
                          <option value="ALL">Todos los proveedores</option>
                          {exportSupplierOptions.map((supplier) => (
                            <option key={supplier} value={supplier}>
                              {supplier}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.exportFilterField}>
                        <span>Tipo de adquisicion</span>
                        <select
                          value={productExportFilters.mode}
                          onChange={(e) =>
                            updateProductExportFilter(
                              "mode",
                              e.target.value as ProductExportFilters["mode"],
                            )
                          }
                        >
                          <option value="ALL">Todos</option>
                          <option value="VENTA">Solo venta</option>
                          <option value="RENTA">Solo renta</option>
                          <option value="MIXTO">Mixto</option>
                        </select>
                      </label>

                      <label className={styles.exportFilterField}>
                        <span>Receta</span>
                        <select
                          value={productExportFilters.requiresPrescription}
                          onChange={(e) =>
                            updateProductExportFilter(
                              "requiresPrescription",
                              e.target.value as ProductExportFilters["requiresPrescription"],
                            )
                          }
                        >
                          <option value="ALL">Con y sin receta</option>
                          <option value="YES">Solo requieren receta</option>
                          <option value="NO">Solo sin receta</option>
                        </select>
                      </label>

                      <label className={styles.exportFilterField}>
                        <span>Estado</span>
                        <select
                          value={productExportFilters.activeStatus}
                          onChange={(e) =>
                            updateProductExportFilter(
                              "activeStatus",
                              e.target.value as ProductExportFilters["activeStatus"],
                            )
                          }
                        >
                          <option value="ALL">Activos e inactivos</option>
                          <option value="ACTIVE">Solo activos</option>
                          <option value="INACTIVE">Solo inactivos</option>
                        </select>
                      </label>

                      <label className={styles.exportFilterField}>
                        <span>Limite</span>
                        <select
                          value={productExportFilters.limit}
                          onChange={(e) =>
                            updateProductExportFilter(
                              "limit",
                              e.target.value as ProductExportFilters["limit"],
                            )
                          }
                        >
                          <option value="ALL">Sin limite</option>
                          <option value="10">10 productos</option>
                          <option value="30">30 productos</option>
                          <option value="50">50 productos</option>
                          <option value="100">100 productos</option>
                        </select>
                      </label>

                      <label className={styles.exportFilterField}>
                        <span>Orden</span>
                        <select
                          value={productExportFilters.orderBy}
                          onChange={(e) =>
                            updateProductExportFilter(
                              "orderBy",
                              e.target.value as ProductExportOrderOption,
                            )
                          }
                        >
                          <option value="name-asc">Alfabetico A-Z</option>
                          <option value="name-desc">Alfabetico Z-A</option>
                          <option value="stock-desc">Stock mayor a menor</option>
                          <option value="stock-asc">Stock menor a mayor</option>
                          <option value="price-desc">Precio mayor a menor</option>
                          <option value="price-asc">Precio menor a mayor</option>
                          <option value="createdAt-desc">Mas recientes primero</option>
                          <option value="createdAt-asc">Mas antiguos primero</option>
                        </select>
                      </label>
                    </div>
                  </div>

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
                      onClick={resetProductExportFilters}
                    >
                      Limpiar filtros
                    </button>
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

            {showProductTemplateModal ? (
              <div className={styles.modalBackdrop}>
                <div className={`${styles.modalCard} ${styles.templateModalCard}`}>
                  <div className={styles.templateHero}>
                    <div className={styles.templateHeroContent}>
                      <span className={styles.templateHeroEyebrow}>Importacion mas rapida</span>
                      <h3>Generar plantilla CSV de productos</h3>
                      <p className={styles.modalSubtitle}>
                        Elige una plantilla generica o arma una personalizada. La vista previa usa
                        datos de ejemplo y la descarga incluye encabezados listos para capturar
                        productos.
                      </p>

                      <div className={styles.templateHeroMeta}>
                        <span className={styles.templateHeroChip}>
                          {formatNumber(PRODUCT_CSV_COLUMNS.length)} campos disponibles
                        </span>
                        <span className={styles.templateHeroChip}>
                          Compatible con importacion actual
                        </span>
                        <span className={styles.templateHeroChip}>Descarga inmediata en .csv</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={closeProductTemplateModal}
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className={styles.templateOptionGrid}>
                    <article
                      className={`${styles.templateOptionCard} ${styles.templateOptionCardPrimary}`}
                    >
                      <div className={styles.templateOptionHeader}>
                        <div className={styles.templateOptionLead}>
                          <span className={styles.templateOptionIcon}>G</span>
                          <div>
                            <h4>Plantilla generica</h4>
                            <p>
                              Incluye todas las columnas compatibles con la importacion actual.
                            </p>
                          </div>
                        </div>
                        <span className={styles.templateBadge}>Todos los campos</span>
                      </div>

                      <div className={styles.templateFeaturePanel}>
                        <div className={styles.templateFeatureGrid}>
                          <article>
                            <strong>{formatNumber(PRODUCT_CSV_COLUMNS.length)}</strong>
                            <span>columnas incluidas</span>
                          </article>
                          <article>
                            <strong>{formatNumber(PRODUCT_CSV_REQUIRED_COLUMN_KEYS.length)}</strong>
                            <span>obligatorias</span>
                          </article>
                          <article>
                            <strong>CSV</strong>
                            <span>descarga directa</span>
                          </article>
                        </div>

                        <div className={styles.templateFeatureList}>
                          <span>Encabezados estandarizados para importar sin ajustes.</span>
                          <span>Ideal si quieres compartir la plantilla con el equipo completo.</span>
                          <span>Incluye campos de receta, estado y tipo de adquisicion.</span>
                        </div>
                      </div>

                      <button type="button" onClick={generateGenericProductTemplate}>
                        Generar plantilla generica
                      </button>
                    </article>

                    <article
                      className={`${styles.templateOptionCard} ${styles.templateOptionCardSecondary}`}
                    >
                      <div className={styles.templateOptionHeader}>
                        <div className={styles.templateOptionLead}>
                          <span className={styles.templateOptionIconMuted}>P</span>
                          <div>
                            <h4>Plantilla personalizada</h4>
                            <p>
                              Puedes elegir columnas opcionales. Las obligatorias se mantienen para
                              que el CSV siga siendo importable.
                            </p>
                          </div>
                        </div>
                        <span className={styles.templateBadgeMuted}>Campos obligatorios fijos</span>
                      </div>

                      <div className={styles.templatePickerHeader}>
                        <span>Selecciona los campos que quieres incluir</span>
                        <small>
                          Los campos requeridos quedan activos para mantener compatibilidad.
                        </small>
                      </div>

                      <div className={styles.templateFieldGrid}>
                        {PRODUCT_CSV_COLUMNS.map((column) => {
                          const isRequired = PRODUCT_CSV_REQUIRED_COLUMN_KEYS.includes(column.key);

                          return (
                            <label key={column.key} className={styles.templateFieldOption}>
                              <input
                                type="checkbox"
                                checked={selectedProductTemplateColumns.includes(column.key)}
                                onChange={() => toggleTemplateColumn(column.key)}
                                disabled={isRequired}
                              />
                              <div className={styles.templateFieldText}>
                                <span>{column.key}</span>
                                <small>{column.label}</small>
                              </div>
                              <strong
                                className={
                                  isRequired
                                    ? styles.templateRequiredPill
                                    : styles.templateOptionalPill
                                }
                              >
                                {isRequired ? "Obligatorio" : "Opcional"}
                              </strong>
                            </label>
                          );
                        })}
                      </div>

                      <div className={styles.templateActionRow}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={resetCustomTemplateColumns}
                        >
                          Solo obligatorios
                        </button>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={selectAllTemplateColumns}
                        >
                          Seleccionar todo
                        </button>
                        <button type="button" onClick={generateCustomProductTemplate}>
                          Generar plantilla personalizada
                        </button>
                      </div>
                    </article>
                  </div>

                  {productTemplatePreview ? (
                    <section className={styles.templatePreviewPanel}>
                      <div className={styles.templatePreviewHeader}>
                        <div>
                          <span className={styles.templatePreviewEyebrow}>
                            Vista previa de la plantilla
                          </span>
                          <h4>
                            {productTemplatePreview.variant === "generic"
                              ? "Plantilla generica lista"
                              : "Plantilla personalizada lista"}
                          </h4>
                          <p>
                            Asi se vera la estructura de tu archivo antes de descargarlo.
                          </p>
                        </div>
                      </div>

                      <div className={styles.modalSummaryGrid}>
                        <article>
                          <span>Tipo</span>
                          <strong>
                            {productTemplatePreview.variant === "generic"
                              ? "Generica"
                              : "Personalizada"}
                          </strong>
                        </article>
                        <article>
                          <span>Columnas incluidas</span>
                          <strong>{formatNumber(productTemplatePreview.columns.length)}</strong>
                        </article>
                        <article>
                          <span>Campos obligatorios</span>
                          <strong>
                            {formatNumber(
                              productTemplatePreview.columns.filter((column) =>
                                PRODUCT_CSV_REQUIRED_COLUMN_KEYS.includes(column),
                              ).length,
                            )}
                          </strong>
                        </article>
                        <article>
                          <span>Formato</span>
                          <strong>.csv</strong>
                        </article>
                      </div>

                      <div className={styles.templateChipList}>
                        {productTemplatePreview.columns.map((column) => {
                          const isRequired = PRODUCT_CSV_REQUIRED_COLUMN_KEYS.includes(column);

                          return (
                            <span
                              key={column}
                              className={
                                isRequired
                                  ? styles.templateColumnChipRequired
                                  : styles.templateColumnChip
                              }
                            >
                              {column}
                            </span>
                          );
                        })}
                      </div>

                      <div className={`${styles.modalTableWrap} ${styles.templatePreviewTableWrap}`}>
                        <table>
                          <thead>
                            <tr>
                              {productTemplatePreview.columns.map((column) => (
                                <th key={column}>{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {productTemplatePreview.sampleRows.map((row, index) => (
                              <tr key={`template-row-${index + 1}`}>
                                {productTemplatePreview.columns.map((column) => (
                                  <td key={`${column}-${index + 1}`}>{row[column]}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className={styles.templatePreviewActions}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => setProductTemplatePreview(null)}
                        >
                          Limpiar vista previa
                        </button>
                        <button
                          type="button"
                          className={styles.templateDownloadBtn}
                          onClick={() => downloadProductTemplate(productTemplatePreview)}
                        >
                          <span className={styles.templateDownloadBtnIcon}>CSV</span>
                          <span className={styles.templateDownloadBtnText}>
                            Descargar plantilla
                          </span>
                        </button>
                      </div>
                    </section>
                  ) : null}
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
                      placeholder={
                        editingBrandId ? "Editar nombre de la marca" : "Nombre de la marca"
                      }
                      value={catalogForm.marca}
                      onChange={onCatalogInput}
                    />
                    <button type="submit" disabled={savingCatalog === "brand"}>
                      {savingCatalog === "brand"
                        ? "Guardando..."
                        : editingBrandId
                          ? "Guardar cambios"
                          : "Agregar"}
                    </button>
                  </form>
                  <label className={styles.catalogSearchField}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="M16 16 L21 21" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Buscar marca..."
                      value={brandSearch}
                      onChange={(e) => {
                        setBrandSearch(e.target.value);
                        setBrandPage(1);
                      }}
                    />
                  </label>
                  <div className={styles.catalogToolbar}>
                    <div className={styles.catalogToolbarMeta}>
                      <span className={styles.catalogSelectionCount}>
                        {selectedBrandIds.length === 0
                          ? "Ninguna marca seleccionada"
                          : `${formatNumber(selectedBrandIds.length)} marca${
                              selectedBrandIds.length === 1 ? "" : "s"
                            } seleccionada${selectedBrandIds.length === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <div className={styles.catalogToolbarActions}>
                      {editingBrandId ? (
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={resetBrandEditor}
                          disabled={savingCatalog === "brand"}
                        >
                          Cancelar edicion
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => selectedBrandItem && startBrandEdit(selectedBrandItem)}
                        disabled={selectedBrandIds.length !== 1 || savingCatalog === "brand"}
                      >
                        Editar seleccionada
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() =>
                          requestConfirmation({
                            title:
                              selectedBrandIds.length === 1
                                ? "Confirmar eliminacion de marca"
                                : "Confirmar eliminacion de marcas",
                            description: `Se eliminaran ${selectedBrandIds.length} marca${
                              selectedBrandIds.length === 1 ? "" : "s"
                            }: ${describeSelectedCatalogItems(brands, selectedBrandIds)}.`,
                            confirmLabel:
                              selectedBrandIds.length === 1
                                ? "Eliminar marca"
                                : "Eliminar seleccionadas",
                            tone: "danger",
                            onConfirm: () => removeSelectedBrands(selectedBrandIds),
                          })
                        }
                        disabled={selectedBrandIds.length === 0 || savingCatalog === "brand"}
                      >
                        Eliminar seleccionadas
                      </button>
                    </div>
                  </div>
                  <div className={styles.catalogTableWrap}>
                    <table className={styles.catalogTable}>
                      <thead>
                        <tr>
                          <th className={styles.catalogSelectColumn}>
                            <input
                              type="checkbox"
                              aria-label="Seleccionar marcas visibles"
                              checked={
                                paginatedBrands.length > 0 &&
                                selectedBrandsOnPageCount === paginatedBrands.length
                              }
                              onChange={toggleVisibleBrandsSelection}
                              disabled={paginatedBrands.length === 0}
                            />
                          </th>
                          <th>Marca</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBrands.length === 0 ? (
                          <tr>
                            <td className={styles.emptyCell} colSpan={2}>
                              {filteredBrands.length === 0 && brandSearch.trim()
                                ? "No hay marcas que coincidan con la busqueda."
                                : "Sin marcas registradas."}
                            </td>
                          </tr>
                        ) : (
                          paginatedBrands.map((item) => (
                            <tr key={item.id}>
                              <td className={styles.catalogSelectColumn}>
                                <input
                                  type="checkbox"
                                  aria-label={`Seleccionar marca ${item.nombre}`}
                                  checked={selectedBrandIdSet.has(item.id)}
                                  onChange={() => toggleBrandSelection(item.id)}
                                />
                              </td>
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
                      {filteredBrands.length === 0 ? 0 : (brandPage - 1) * CATALOG_PAGE_SIZE + 1}
                      -{Math.min(brandPage * CATALOG_PAGE_SIZE, filteredBrands.length)} de{" "}
                      {formatNumber(filteredBrands.length)}
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
                      placeholder={
                        editingClassificationId
                          ? "Editar nombre de la clasificacion"
                          : "Nombre de la clasificacion"
                      }
                      value={catalogForm.clasificacion}
                      onChange={onCatalogInput}
                    />
                    <button
                      type="submit"
                      disabled={savingCatalog === "classification"}
                    >
                      {savingCatalog === "classification"
                        ? "Guardando..."
                        : editingClassificationId
                          ? "Guardar cambios"
                          : "Agregar"}
                    </button>
                  </form>
                  <label className={styles.catalogSearchField}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="M16 16 L21 21" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Buscar clasificacion..."
                      value={classificationSearch}
                      onChange={(e) => {
                        setClassificationSearch(e.target.value);
                        setClassificationPage(1);
                      }}
                    />
                  </label>
                  <div className={styles.catalogToolbar}>
                    <div className={styles.catalogToolbarMeta}>
                      <span className={styles.catalogSelectionCount}>
                        {selectedClassificationIds.length === 0
                          ? "Ninguna clasificacion seleccionada"
                          : `${formatNumber(selectedClassificationIds.length)} clasificacion${
                              selectedClassificationIds.length === 1 ? "" : "es"
                            } seleccionada${
                              selectedClassificationIds.length === 1 ? "" : "s"
                            }`}
                      </span>
                    </div>
                    <div className={styles.catalogToolbarActions}>
                      {editingClassificationId ? (
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={resetClassificationEditor}
                          disabled={savingCatalog === "classification"}
                        >
                          Cancelar edicion
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() =>
                          selectedClassificationItem &&
                          startClassificationEdit(selectedClassificationItem)
                        }
                        disabled={
                          selectedClassificationIds.length !== 1 ||
                          savingCatalog === "classification"
                        }
                      >
                        Editar seleccionada
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() =>
                          requestConfirmation({
                            title:
                              selectedClassificationIds.length === 1
                                ? "Confirmar eliminacion de clasificacion"
                                : "Confirmar eliminacion de clasificaciones",
                            description: `Se eliminaran ${selectedClassificationIds.length} clasificacion${
                              selectedClassificationIds.length === 1 ? "" : "es"
                            }: ${describeSelectedCatalogItems(
                              classifications,
                              selectedClassificationIds,
                            )}.`,
                            confirmLabel:
                              selectedClassificationIds.length === 1
                                ? "Eliminar clasificacion"
                                : "Eliminar seleccionadas",
                            tone: "danger",
                            onConfirm: () =>
                              removeSelectedClassifications(selectedClassificationIds),
                          })
                        }
                        disabled={
                          selectedClassificationIds.length === 0 ||
                          savingCatalog === "classification"
                        }
                      >
                        Eliminar seleccionadas
                      </button>
                    </div>
                  </div>
                  <div className={styles.catalogTableWrap}>
                    <table className={styles.catalogTable}>
                      <thead>
                        <tr>
                          <th className={styles.catalogSelectColumn}>
                            <input
                              type="checkbox"
                              aria-label="Seleccionar clasificaciones visibles"
                              checked={
                                paginatedClassifications.length > 0 &&
                                selectedClassificationsOnPageCount ===
                                  paginatedClassifications.length
                              }
                              onChange={toggleVisibleClassificationsSelection}
                              disabled={paginatedClassifications.length === 0}
                            />
                          </th>
                          <th>Clasificacion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedClassifications.length === 0 ? (
                          <tr>
                            <td className={styles.emptyCell} colSpan={2}>
                              {filteredClassifications.length === 0 &&
                              classificationSearch.trim()
                                ? "No hay clasificaciones que coincidan con la busqueda."
                                : "Sin clasificaciones registradas."}
                            </td>
                          </tr>
                        ) : (
                          paginatedClassifications.map((item) => (
                            <tr key={item.id}>
                              <td className={styles.catalogSelectColumn}>
                                <input
                                  type="checkbox"
                                  aria-label={`Seleccionar clasificacion ${item.nombre}`}
                                  checked={selectedClassificationIdSet.has(item.id)}
                                  onChange={() => toggleClassificationSelection(item.id)}
                                />
                              </td>
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
                      {filteredClassifications.length === 0
                        ? 0
                        : (classificationPage - 1) * CATALOG_PAGE_SIZE + 1}
                      -{Math.min(
                        classificationPage * CATALOG_PAGE_SIZE,
                        filteredClassifications.length,
                      )}{" "}
                      de {formatNumber(filteredClassifications.length)}
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
            <div className={styles.sectionHeader}>
              <h2>Gestionar proveedores</h2>
              <p className={styles.pendingCounter}>
                Registros: <strong>{formatNumber(suppliers.length)}</strong>
              </p>
            </div>
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
                  {savingSupplier
                    ? "Guardando..."
                    : editingSupplierId
                      ? "Guardar cambios"
                      : "Agregar proveedor"}
                </button>
              </div>
              <label className={styles.catalogSearchField}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16 L21 21" />
                </svg>
                <input
                  type="search"
                  placeholder="Buscar proveedor..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
              </label>
              <div className={styles.catalogToolbarMeta}>
                <span className={styles.catalogSelectionCount}>
                  {selectedSupplierIds.length === 0
                    ? "Ningun proveedor seleccionado"
                    : `${formatNumber(selectedSupplierIds.length)} proveedor${
                        selectedSupplierIds.length === 1 ? "" : "es"
                      } seleccionado${selectedSupplierIds.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className={styles.catalogToolbarActions}>
                {editingSupplierId ? (
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={resetSupplierForm}
                    disabled={savingSupplier}
                  >
                    Cancelar edicion
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => selectedSupplierItem && startSupplierEdit(selectedSupplierItem)}
                  disabled={selectedSupplierIds.length !== 1 || savingSupplier}
                >
                  Editar seleccionado
                </button>
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() => requestDeleteSuppliersConfirmation(selectedSupplierIds)}
                  disabled={selectedSupplierIds.length === 0 || savingSupplier}
                >
                  Eliminar seleccionados
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th className={styles.catalogSelectColumn}>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar proveedores visibles"
                        checked={
                          filteredSuppliers.length > 0 &&
                          filteredSuppliers.every((item) => selectedSupplierIdSet.has(item.id))
                        }
                        onChange={toggleVisibleSuppliersSelection}
                        disabled={filteredSuppliers.length === 0}
                      />
                    </th>
                    <th>Nombre</th>
                    <th>Encargado</th>
                    <th>Repartidor</th>
                    <th>Direccion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyCell}>
                        {supplierSearch.trim()
                          ? "No hay proveedores que coincidan con la busqueda."
                          : "No hay proveedores registrados."}
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((item) => (
                      <tr key={item.id}>
                        <td className={styles.catalogSelectColumn}>
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar proveedor ${item.nombre}`}
                            checked={selectedSupplierIdSet.has(item.id)}
                            onChange={() => toggleSupplierSelection(item.id)}
                          />
                        </td>
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
                  void (user &&
                    Promise.all([
                      loadAuthSecurityData(),
                      loadDatabaseStats(),
                      loadBackupRecords(),
                      loadBackupSchedule(),
                    ]))
                }
                disabled={
                  loadingAuthSecurityOverview ||
                  loadingDbStatus ||
                  loadingBackupRecords ||
                  loadingBackupSchedule
                }
              >
                {loadingAuthSecurityOverview ||
                loadingDbStatus ||
                loadingBackupRecords ||
                loadingBackupSchedule
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

            <div className={styles.monitoringColumns}>
              <div className={`${styles.tableInsights} ${styles.tableInsightsCompact}`}>
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

              <div className={styles.monitorAside}>
                <div className={styles.sidePanel}>
                  <div className={styles.sidePanelHeader}>
                    <div>
                      <h3>Usuarios logeados</h3>
                      <p>Sesiones activas detectadas en el sistema</p>
                    </div>
                    <span className={styles.sidePanelBadge}>
                      {formatNumber(securitySummary?.activeSessions ?? activeSessions.length)}
                    </span>
                  </div>

                  {loadingAuthSecurityOverview && visibleActiveSessions.length === 0 ? (
                    <p className={styles.tableInsightsEmpty}>Consultando sesiones activas...</p>
                  ) : visibleActiveSessions.length === 0 ? (
                    <p className={styles.tableInsightsEmpty}>
                      No hay sesiones activas registradas.
                    </p>
                  ) : (
                    <div className={styles.sessionList}>
                      {visibleActiveSessions.map((session) => (
                        <article key={session.sessionId} className={styles.sessionItem}>
                          <div className={styles.sessionAvatar}>
                            {getInitialsFromName(session.nombre)}
                          </div>
                          <div className={styles.sessionContent}>
                            <div className={styles.sessionTop}>
                              <strong>{session.nombre}</strong>
                              <span className={styles.sessionRole}>
                                {session.rol === "ADMIN" ? "Admin" : "Cliente"}
                              </span>
                            </div>
                            <span>{session.correo}</span>
                            <p>
                              Activa desde {formatDateTime(session.createdAt)} ·{" "}
                              {formatRelativeTime(session.lastSeenAt)}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.sidePanel}>
                  <div className={styles.sidePanelHeader}>
                    <div>
                      <h3>Seguridad y auditoria</h3>
                      <p>Usuario, exito o fallo y fecha del ultimo acceso</p>
                    </div>
                    <span
                      className={`${styles.auditCounter} ${
                        (securitySummary?.failedAttempts ?? 0) > 0
                          ? styles.auditCounterWarn
                          : styles.auditCounterOk
                      }`}
                    >
                      {formatNumber(securitySummary?.failedAttempts ?? 0)} fallidos
                    </span>
                  </div>

                  {loadingAuthSecurityOverview && visibleLoginAuditItems.length === 0 ? (
                    <p className={styles.tableInsightsEmpty}>Cargando auditoria...</p>
                  ) : visibleLoginAuditItems.length === 0 ? (
                    <p className={styles.tableInsightsEmpty}>
                      Sin eventos de inicio de sesion por el momento.
                    </p>
                  ) : (
                    <div className={styles.auditList}>
                      {visibleLoginAuditItems.map((attempt) => (
                        <article key={attempt.id} className={styles.auditItem}>
                          <div className={styles.auditTop}>
                            <div>
                              <strong>{attempt.nombre}</strong>
                              <span>{attempt.correo}</span>
                            </div>
                            <span
                              className={`${styles.auditStatus} ${
                                attempt.success ? styles.auditStatusOk : styles.auditStatusWarn
                              }`}
                            >
                              {attempt.success ? "Exito" : "Fallido"}
                            </span>
                          </div>
                          <div className={styles.auditMeta}>
                            <span>{formatDateTime(attempt.attemptedAt)}</span>
                            <small>{formatAuditReason(attempt.reason)}</small>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.backupPanel}>
              <div className={styles.backupPanelHeader}>
                <div className={styles.backupPanelLead}>
                  <span className={styles.backupEyebrow}>Respaldo y continuidad</span>
                  <h3>Generar respaldo de la base de datos</h3>
                  <p>
                    Centraliza respaldos manuales y automaticos sin salir del panel. Todos los
                    archivos se registran en historial y se guardan en Google Drive para mantener
                    trazabilidad y recuperacion rapida.
                  </p>
                </div>

                <div className={styles.backupPanelAside}>
                  <div className={styles.backupStatPill}>
                    <span>Formato</span>
                    <strong>
                      {dbStatus?.backup.fileExtension
                        ? dbStatus.backup.fileExtension.toUpperCase()
                        : "TAR"}
                    </strong>
                  </div>
                  <div className={styles.backupStatPill}>
                    <span>Historial</span>
                    <strong>{formatNumber(backupRecords.length)} archivos</strong>
                  </div>
                </div>
              </div>

              <div className={styles.backupActionGrid}>
                <button
                  type="button"
                  className={styles.backupPrimaryAction}
                  onClick={() => void generateBackup()}
                  disabled={generatingBackup || generatingTableBackup}
                >
                  <span>Respaldo completo</span>
                  <strong>
                    {generatingBackup
                      ? "Generando respaldo..."
                      : "Generar respaldo de la base de datos"}
                  </strong>
                  <small>Crea una copia completa lista para descarga y resguardo.</small>
                </button>

                <button
                  type="button"
                  className={`${styles.backupSecondaryAction} ${
                    showTableBackupOptions ? styles.backupSecondaryActionActive : ""
                  }`}
                  onClick={() => setShowTableBackupOptions((prev) => !prev)}
                  disabled={loadingDbStatus || generatingBackup || generatingTableBackup}
                >
                  <span>Respaldo selectivo</span>
                  <strong>
                    {showTableBackupOptions
                      ? "Ocultar respaldo por tabla"
                      : "Generar respaldo de una sola tabla"}
                  </strong>
                  <small>Ideal para cambios puntuales o exportaciones de revision.</small>
                </button>
              </div>

              <div className={styles.backupToolbar}>
                <div className={styles.backupToolbarCopy}>
                  <p>
                    Nombres esperados: <code>cemydi_backup_fecha_hora</code> y{" "}
                    <code>cemydi_nombre_tabla_backup_fecha_hora</code>.
                  </p>
                </div>
                <div className={styles.backupToolbarActions}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => void (user && loadBackupRecords())}
                    disabled={loadingBackupRecords || generatingBackup || generatingTableBackup}
                  >
                    {loadingBackupRecords ? "Recargando..." : "Recargar historial"}
                  </button>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => void refreshAdminData()}
                  >
                    Recargar datos
                  </button>
                </div>
              </div>

              <div className={styles.schedulePanel}>
                <div className={styles.scheduleHeader}>
                  <div>
                    <h4>Programacion automatica de respaldos</h4>
                    <p>
                      Los respaldos automaticos se guardan en una carpeta de Google Drive y la
                      retencion elimina tanto el archivo en Drive como su registro en el historial.
                    </p>
                  </div>
                  <label className={styles.scheduleToggle}>
                    <input
                      type="checkbox"
                      checked={backupScheduleForm.enabled}
                      onChange={(e) =>
                        setBackupScheduleForm((prev) => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                      disabled={savingBackupSchedule}
                    />
                    <span>{backupScheduleForm.enabled ? "Automaticos activos" : "Solo manual"}</span>
                  </label>
                </div>

                <div className={styles.scheduleGrid}>
                  <label className={styles.scheduleField}>
                    <span>Cada</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={backupScheduleForm.everyDays}
                      onChange={(e) =>
                        setBackupScheduleForm((prev) => ({
                          ...prev,
                          everyDays: e.target.value,
                        }))
                      }
                      disabled={savingBackupSchedule}
                    />
                    <small>Indica cada cuantos dias se generara el respaldo.</small>
                  </label>

                  <label className={styles.scheduleField}>
                    <span>Hora</span>
                    <input
                      type="time"
                      value={backupScheduleForm.runAtTime}
                      onChange={(e) =>
                        setBackupScheduleForm((prev) => ({
                          ...prev,
                          runAtTime: e.target.value,
                        }))
                      }
                      disabled={savingBackupSchedule}
                    />
                    <small>Se usa el horario local del servidor.</small>
                  </label>

                  <label className={styles.scheduleField}>
                    <span>Retencion en Drive</span>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={backupScheduleForm.retentionDays}
                      onChange={(e) =>
                        setBackupScheduleForm((prev) => ({
                          ...prev,
                          retentionDays: e.target.value,
                        }))
                      }
                      disabled={savingBackupSchedule}
                    />
                    <small>Los respaldos mas antiguos se eliminaran automaticamente.</small>
                  </label>
                </div>

                <div className={styles.scheduleMeta}>
                  <article>
                    <span>Ultima ejecucion</span>
                    <strong>{formatScheduleDateTime(backupSchedule?.lastRunAt ?? null)}</strong>
                  </article>
                  <article>
                    <span>Proxima ejecucion</span>
                    <strong>{formatScheduleDateTime(backupSchedule?.nextRunAt ?? null)}</strong>
                  </article>
                  <article>
                    <span>Estado</span>
                    <strong>
                      {backupSchedule?.enabled ? "Programado" : "Solo manual por ahora"}
                    </strong>
                  </article>
                </div>

                <div className={styles.scheduleActions}>
                  <button
                    type="button"
                    className={styles.schedulePrimaryAction}
                    onClick={() => void saveBackupSchedule()}
                    disabled={savingBackupSchedule || loadingBackupSchedule}
                  >
                    {savingBackupSchedule
                      ? "Guardando programacion..."
                      : "Guardar programacion automatica"}
                  </button>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => void (user && loadBackupSchedule())}
                    disabled={loadingBackupSchedule || savingBackupSchedule}
                  >
                    {loadingBackupSchedule ? "Recargando..." : "Recargar programacion"}
                  </button>
                </div>

                <div className={styles.scheduleRecordPanel}>
                  <div className={styles.scheduleRecordHeader}>
                    <div>
                      <h5>Registro actual de programacion</h5>
                      <p>
                        Esta tabla siempre refleja la unica tarea programada disponible para los
                        respaldos automaticos.
                      </p>
                    </div>
                  </div>

                  <div className={styles.scheduleRecordTableWrap}>
                    <table className={styles.scheduleRecordTable}>
                      <thead>
                        <tr>
                          <th>Estado</th>
                          <th>Cada</th>
                          <th>Hora</th>
                          <th>Retencion</th>
                          <th>Ultima ejecucion</th>
                          <th>Proxima ejecucion</th>
                          <th>Actualizado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span
                              className={
                                backupSchedule?.enabled
                                  ? styles.statusActive
                                  : styles.statusInactive
                              }
                            >
                              {backupSchedule?.enabled ? "Programado" : "Solo manual"}
                            </span>
                          </td>
                          <td>Cada {backupSchedule?.everyDays ?? 1} dia(s)</td>
                          <td>{backupSchedule?.runAtTime ?? defaultBackupScheduleForm.runAtTime}</td>
                          <td>{backupSchedule?.retentionDays ?? 7} dia(s)</td>
                          <td>{formatScheduleDateTime(backupSchedule?.lastRunAt ?? null)}</td>
                          <td>{formatScheduleDateTime(backupSchedule?.nextRunAt ?? null)}</td>
                          <td>
                            {backupSchedule?.updatedAt
                              ? formatDateTime(backupSchedule.updatedAt)
                              : "Sin cambios"}
                          </td>
                          <td className={styles.actionsCell}>
                            <button
                              type="button"
                              onClick={loadBackupScheduleIntoForm}
                              disabled={savingBackupSchedule || loadingBackupSchedule}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={styles.danger}
                              onClick={() =>
                                requestConfirmation({
                                  title: "Eliminar programacion automatica",
                                  description:
                                    "Se restablecera la unica tarea programada a modo manual y podras crear una nueva configuracion cuando quieras.",
                                  confirmLabel: "Eliminar programacion",
                                  tone: "danger",
                                  onConfirm: () => removeBackupSchedule(),
                                })
                              }
                              disabled={savingBackupSchedule || loadingBackupSchedule}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
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
                                  description: `Se eliminara el archivo "${item.fileName}" de Google Drive y tambien su registro del historial.`,
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
                onClick={() => void performLogout()}
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
