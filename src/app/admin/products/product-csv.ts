import type { AdminProduct, ProductMode } from "@/services/admin";

export const PRODUCT_CSV_COLUMNS = [
  { key: "nombre", label: "Nombre", required: true },
  { key: "marca", label: "Marca", required: true },
  { key: "modelo", label: "Modelo", required: true },
  { key: "descripcion", label: "Descripción", required: true },
  { key: "precio", label: "Precio", required: true },
  { key: "clasificacion", label: "Clasificación", required: true },
  { key: "stock", label: "Stock", required: true },
  { key: "proveedor", label: "Proveedor", required: true },
  { key: "tipoAdquisicion", label: "TipoAdquisición", required: true },
  { key: "requiereReceta", label: "RequiereReceta", required: false },
  { key: "activo", label: "Activo", required: false },
  { key: "imageUrls", label: "ImageUrls", required: false },
] as const;

export type ProductCsvColumnKey = (typeof PRODUCT_CSV_COLUMNS)[number]["key"];

export type ProductImportPayload = {
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

export type ProductCsvImportRow = {
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

export type ProductCsvImportPreview = {
  fileName: string;
  rows: ProductCsvImportRow[];
};

export type ProductImportRowStatusTone = "ready" | "existing" | "danger";

export type ProductExportOrderOption =
  | "name-asc"
  | "name-desc"
  | "stock-desc"
  | "stock-asc"
  | "price-desc"
  | "price-asc"
  | "createdAt-desc"
  | "createdAt-asc";

export type ProductExportFilters = {
  supplier: string;
  mode: ProductMode | "ALL";
  requiresPrescription: "ALL" | "YES" | "NO";
  activeStatus: "ALL" | "ACTIVE" | "INACTIVE";
  limit: "ALL" | "10" | "30" | "50" | "100";
  orderBy: ProductExportOrderOption;
};

export type ProductCsvTemplateVariant = "generic" | "custom";

export type ProductCsvTemplateRow = Record<ProductCsvColumnKey, string>;

export type ProductCsvTemplatePreview = {
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
  imageUrls: ["imageurls", "imageurl", "imagenes", "imagenurls", "imagenurl"],
};

export const PRODUCT_CSV_REQUIRED_COLUMN_KEYS: ProductCsvColumnKey[] =
  PRODUCT_CSV_COLUMNS.filter((column) => column.required).map((column) => column.key);

const PRODUCT_CSV_TEMPLATE_SAMPLE_ROWS: ProductCsvTemplateRow[] = [
  {
    nombre: "Silla de ruedas estándar",
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
    imageUrls: "https://example.com/silla-ruedas-1.jpg|https://example.com/silla-ruedas-2.jpg",
  },
  {
    nombre: "Tanque oxígeno 680L",
    marca: "Infra",
    modelo: "TO-680L",
    descripcion: "Tanque de oxígeno portátil para renta o venta.",
    precio: "7100",
    clasificacion: "Equipo Médico",
    stock: "5",
    proveedor: "Infra",
    tipoAdquisicion: "RENTA",
    requiereReceta: "True",
    activo: "True",
    imageUrls: "https://example.com/tanque-oxigeno-1.jpg|https://example.com/tanque-oxigeno-2.jpg",
  },
];

export const defaultProductExportFilters: ProductExportFilters = {
  supplier: "ALL",
  mode: "ALL",
  requiresPrescription: "ALL",
  activeStatus: "ALL",
  limit: "ALL",
  orderBy: "name-asc",
};

function normalizeCsvHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s._-]+/g, "");
}

export function parseCsvText(text: string) {
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

export function isValidImageUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseProductImageUrlsCell(value: string) {
  return value
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

type CsvRowFormCandidate = {
  nombre: string;
  marca: string;
  modelo: string;
  descripcion: string;
  precio: string;
  clasificacion: string;
  stock: string;
  proveedor: string;
  tipoAdquisicion: ProductMode;
  requiereReceta: boolean;
  activo: boolean;
};

function validateCsvProductRow(form: CsvRowFormCandidate) {
  const nombre = form.nombre.trim();
  const descripcion = form.descripcion.trim();
  const precioRaw = form.precio.trim();
  const stockRaw = form.stock.trim();

  if (nombre.length < 2 || nombre.length > 120) {
    return "Nombre de producto inválido.";
  }

  if (
    !form.marca.trim() ||
    !form.modelo.trim() ||
    !form.clasificacion.trim() ||
    !form.proveedor.trim()
  ) {
    return "Selecciona marca, modelo, clasificación y proveedor.";
  }

  if (descripcion.length < 5 || descripcion.length > 400) {
    return "Descripción inválida. Entre 5 y 400 caracteres.";
  }

  if (precioRaw === "" || stockRaw === "") {
    return "Precio y stock son obligatorios.";
  }

  const precio = Number(precioRaw.replace(/,/g, ""));
  const stock = Number(stockRaw.replace(/,/g, ""));

  if (!Number.isFinite(precio) || precio < 0) {
    return "Precio inválido. Puede ser 0 o mayor.";
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return "Stock inválido. Debe ser entero 0 o mayor.";
  }

  return null;
}

export function getProductCsvValue(product: AdminProduct, column: ProductCsvColumnKey) {
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
  if (column === "imageUrls") {
    return product.images.map((image) => image.imageUrl).join("|");
  }
  return product.activo ? "True" : "False";
}

export function getProductCsvTemplateValue(
  row: ProductCsvTemplateRow,
  column: ProductCsvColumnKey,
) {
  return row[column];
}

export function createProductTemplatePreview(
  columns: ProductCsvColumnKey[],
  variant: ProductCsvTemplateVariant,
): ProductCsvTemplatePreview {
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
  };
}

function escapeCsvCell(value: string) {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function buildCsvContent<T>(
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

export function createFileTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export function downloadCsvFile(content: string, fileName: string) {
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

export function createProductImportPreview(
  fileName: string,
  csvText: string,
  existingModelCodes: Set<string>,
): ProductCsvImportPreview {
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
    imageUrls: -1,
  };

  PRODUCT_CSV_COLUMNS.forEach((column) => {
    const aliases = PRODUCT_CSV_HEADER_ALIASES[column.key];
    const foundIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
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
    const imageUrlsRaw = readCell("imageUrls");

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
      imageUrlsRaw,
    ]
      .join("")
      .trim();

    if (!joinedRow) {
      continue;
    }

    let validationError: string | null = null;
    const tipoAdquisicion = normalizeProductMode(tipoAdquisicionRaw);
    if (!tipoAdquisicion) {
      validationError = "Tipo de adquisición inválido. Usa VENTA, RENTA o MIXTO.";
    }

    const requiereReceta = normalizeBooleanCell(requiereRecetaRaw, false);
    if (requiereReceta === null && !validationError) {
      validationError = "Valor inválido en requiereReceta. Usa true o false.";
    }

    const activo = normalizeBooleanCell(activoRaw, true);
    if (activo === null && !validationError) {
      validationError = "Valor inválido en activo. Usa true o false.";
    }

    const imageUrls = parseProductImageUrlsCell(imageUrlsRaw);
    if (!validationError && imageUrls.some((item) => !isValidImageUrl(item))) {
      validationError =
        "Las imágenes del CSV deben ser URLs http o https separadas por |.";
    }

    const formCandidate: CsvRowFormCandidate = {
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

    const payloadError = validateCsvProductRow(formCandidate);
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
      imageUrls,
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
    modelCountMap.set(row.normalizedModel, (modelCountMap.get(row.normalizedModel) ?? 0) + 1);
  });

  parsedRows.forEach((row) => {
    if (!row.normalizedModel) return;
    row.duplicateInFile = (modelCountMap.get(row.normalizedModel) ?? 0) > 1;
    row.duplicateExistingModel = existingModelCodes.has(row.normalizedModel);
  });

  return {
    fileName,
    rows: parsedRows,
  };
}

export function getProductImportRowStatus(row: ProductCsvImportRow): {
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

export function applyProductExportFilters(items: AdminProduct[], filters: ProductExportFilters) {
  const filtered = items.filter((product) => {
    if (filters.supplier !== "ALL" && product.proveedor !== filters.supplier) {
      return false;
    }

    if (filters.mode !== "ALL" && product.tipoAdquisicion !== filters.mode) {
      return false;
    }

    if (filters.requiresPrescription === "YES" && !product.requiereReceta) {
      return false;
    }

    if (filters.requiresPrescription === "NO" && product.requiereReceta) {
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
