"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  FileDown,
  FileSearch,
  FileSpreadsheet,
  FileUp,
  MoreHorizontal,
  PackagePlus,
  PencilLine,
  Search,
  ShieldCheck,
  TableProperties,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type AdminProduct,
  type ProductMode,
} from "@/services/admin";
import { ConfirmDialog } from "@/components/feedback";

import { formatNumberEsMx, getPaginationWindow } from "../lib/admin-list-utils";
import { useAdminDataBootstrap } from "../hooks/use-admin-data-bootstrap";
import { useClampPage, useResetPageOnChange } from "../hooks/use-admin-pagination";
import { AdminPageLoading } from "../components/admin-page-loading";
import { AdminMetricCard } from "../components/admin-metric-card";
import { AdminTablePagination } from "../components/admin-table-pagination";
import { AdminTableSortHeader } from "../components/admin-table-sort-header";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  PRODUCT_CSV_COLUMNS,
  PRODUCT_CSV_REQUIRED_COLUMN_KEYS,
  applyProductExportFilters,
  buildCsvContent,
  createFileTimestamp,
  createProductImportPreview,
  createProductTemplatePreview,
  defaultProductExportFilters,
  downloadCsvFile,
  getProductCsvTemplateValue,
  getProductCsvValue,
  getProductImportRowStatus,
  type ProductCsvColumnKey,
  type ProductCsvImportPreview,
  type ProductCsvTemplatePreview,
  type ProductCsvTemplateRow,
  type ProductExportFilters,
  type ProductExportOrderOption,
} from "./product-csv";
import {
  PRODUCT_PAGE_SIZE,
  formatCurrency,
  formatDate,
  getModeLabel,
  getRecipeBadgeVariant,
  getStatusLabel,
  getStockBadgeVariant,
  loadProductReferenceData,
  normalizeAdminProduct,
  normalizeAdminProducts,
  productFieldClassName,
} from "./product-shared";

type ProductColumnId =
  | "detalle"
  | "clasificacion"
  | "proveedor"
  | "precio"
  | "stock"
  | "modo"
  | "estado"
  | "alta";

type ProductSortState = {
  column: ProductColumnId;
  direction: "asc" | "desc";
};

const DEFAULT_PRODUCT_SORT: ProductSortState = {
  column: "alta",
  direction: "desc",
};

const DEFAULT_PRODUCT_VISIBLE_COLUMNS: Record<ProductColumnId, boolean> = {
  detalle: true,
  clasificacion: true,
  proveedor: true,
  precio: true,
  stock: true,
  modo: true,
  estado: true,
  alta: true,
};

const PRODUCT_COLUMN_ORDER: ProductColumnId[] = [
  "detalle",
  "clasificacion",
  "proveedor",
  "precio",
  "stock",
  "modo",
  "estado",
  "alta",
];

const PRODUCT_COLUMN_WIDTHS: Record<ProductColumnId, number> = {
  detalle: 300,
  clasificacion: 150,
  proveedor: 168,
  precio: 120,
  stock: 128,
  modo: 110,
  estado: 120,
  alta: 130,
};

const PRODUCT_COLUMN_LABELS: Record<ProductColumnId, string> = {
  detalle: "Producto",
  clasificacion: "Clasificación",
  proveedor: "Proveedor",
  precio: "Precio",
  stock: "Stock",
  modo: "Modo",
  estado: "Estado",
  alta: "Alta",
};

type SortComparable = string | number | boolean;

function compareProductSortValues(first: SortComparable, second: SortComparable) {
  if (typeof first === "number" && typeof second === "number") {
    return first - second;
  }
  if (typeof first === "boolean" && typeof second === "boolean") {
    return Number(first) - Number(second);
  }
  return String(first).localeCompare(String(second), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function getProductSortValue(product: AdminProduct, column: ProductColumnId): SortComparable {
  switch (column) {
    case "detalle":
      return product.nombre;
    case "clasificacion":
      return product.clasificacion;
    case "proveedor":
      return product.proveedor;
    case "precio":
      return product.precio;
    case "stock":
      return product.stock;
    case "modo":
      return product.tipoAdquisicion;
    case "estado":
      return product.activo ? 1 : 0;
    case "alta":
      return product.createdAt ? new Date(product.createdAt).getTime() : 0;
    default:
      return "";
  }
}

function getDefaultProductSortDirection(column: ProductColumnId): "asc" | "desc" {
  return column === "alta" || column === "precio" || column === "stock" ? "desc" : "asc";
}

type ProductQuickFilterId = "ALL" | "ACTIVE" | "INACTIVE" | "RECIPE" | "LOW_STOCK";

const PRODUCT_QUICK_FILTERS: { id: ProductQuickFilterId; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVE", label: "Activos" },
  { id: "INACTIVE", label: "Inactivos" },
  { id: "RECIPE", label: "Con receta" },
  { id: "LOW_STOCK", label: "Stock bajo" },
];

type ProductTableAdvancedFilters = {
  supplier: string;
  classification: string;
  brand: string;
  mode: ProductMode | "ALL";
  recipe: "ALL" | "YES" | "NO";
  stockBand: "ALL" | "OUT" | "LOW" | "OK";
};

const DEFAULT_TABLE_ADVANCED_FILTERS: ProductTableAdvancedFilters = {
  supplier: "ALL",
  classification: "ALL",
  brand: "ALL",
  mode: "ALL",
  recipe: "ALL",
  stockBand: "ALL",
};

function productPassesQuickFilter(product: AdminProduct, quick: ProductQuickFilterId) {
  switch (quick) {
    case "ACTIVE":
      return product.activo;
    case "INACTIVE":
      return !product.activo;
    case "RECIPE":
      return product.requiereReceta;
    case "LOW_STOCK":
      return product.stock <= 5;
    case "ALL":
    default:
      return true;
  }
}

function productPassesAdvancedFilters(
  product: AdminProduct,
  filters: ProductTableAdvancedFilters,
) {
  if (filters.supplier !== "ALL" && product.proveedor !== filters.supplier) {
    return false;
  }
  if (filters.classification !== "ALL" && product.clasificacion !== filters.classification) {
    return false;
  }
  if (filters.brand !== "ALL" && product.marca !== filters.brand) {
    return false;
  }
  if (filters.mode !== "ALL" && product.tipoAdquisicion !== filters.mode) {
    return false;
  }
  if (filters.recipe === "YES" && !product.requiereReceta) {
    return false;
  }
  if (filters.recipe === "NO" && product.requiereReceta) {
    return false;
  }
  if (filters.stockBand === "OUT" && product.stock !== 0) {
    return false;
  }
  if (filters.stockBand === "LOW" && (product.stock < 1 || product.stock > 5)) {
    return false;
  }
  if (filters.stockBand === "OK" && product.stock <= 5) {
    return false;
  }
  return true;
}

function productPassesSearch(product: AdminProduct, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    product.nombre,
    product.marca,
    product.modelo,
    product.descripcion,
    product.clasificacion,
    product.proveedor,
    product.tipoAdquisicion,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function getProductGalleryImages(product: AdminProduct) {
  if (product.images.length > 0) {
    return product.images;
  }

  return product.imageUrl
    ? [{ id: 0, imageUrl: product.imageUrl, sortOrder: 0, createdAt: product.createdAt ?? "" }]
    : [];
}

export default function AdminProductsPage() {
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<ProductQuickFilterId>("ALL");
  const [tableAdvancedFilters, setTableAdvancedFilters] =
    useState<ProductTableAdvancedFilters>(DEFAULT_TABLE_ADVANCED_FILTERS);
  const [draftTableAdvancedFilters, setDraftTableAdvancedFilters] =
    useState<ProductTableAdvancedFilters>(DEFAULT_TABLE_ADVANCED_FILTERS);
  const [tableFiltersMenuOpen, setTableFiltersMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<ProductSortState>(DEFAULT_PRODUCT_SORT);
  const [visibleProductColumns, setVisibleProductColumns] = useState<
    Record<ProductColumnId, boolean>
  >(DEFAULT_PRODUCT_VISIBLE_COLUMNS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [imageDialogProduct, setImageDialogProduct] = useState<AdminProduct | null>(null);
  const [imageDialogIndex, setImageDialogIndex] = useState(0);

  const productCsvInputRef = useRef<HTMLInputElement | null>(null);
  const [productImportPreview, setProductImportPreview] =
    useState<ProductCsvImportPreview | null>(null);
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

  const loadProductList = useCallback(async () => {
    const [productsResponse, referenceData] = await Promise.all([
      listProducts(),
      loadProductReferenceData(),
    ]);
    setProducts(normalizeAdminProducts(productsResponse.products));
    setBrands(referenceData.brands);
    setClassifications(referenceData.classifications);
  }, []);

  const { blockingFullPage } = useAdminDataBootstrap({
    load: loadProductList,
    loadErrorFallback: "No se pudieron cargar los productos",
  });

  const quickFilterCounts = useMemo(
    () => ({
      ALL: products.length,
      ACTIVE: products.filter((p) => p.activo).length,
      INACTIVE: products.filter((p) => !p.activo).length,
      RECIPE: products.filter((p) => p.requiereReceta).length,
      LOW_STOCK: products.filter((p) => p.stock <= 5).length,
    }),
    [products],
  );

  const tableBrandOptions = useMemo(() => {
    const merge = new Set<string>();
    brands.forEach((b) => merge.add(b.trim()));
    products.forEach((p) => {
      if (p.marca.trim()) merge.add(p.marca.trim());
    });
    return Array.from(merge).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [brands, products]);

  const tableClassificationOptions = useMemo(() => {
    const merge = new Set<string>();
    classifications.forEach((c) => merge.add(c.trim()));
    products.forEach((p) => {
      if (p.clasificacion.trim()) merge.add(p.clasificacion.trim());
    });
    return Array.from(merge).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [classifications, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        productPassesQuickFilter(product, quickFilter) &&
        productPassesAdvancedFilters(product, tableAdvancedFilters) &&
        productPassesSearch(product, search),
    );
  }, [products, quickFilter, tableAdvancedFilters, search]);

  const sortedProducts = useMemo(() => {
    const { column, direction } = sortState;
    return [...filteredProducts].sort((a, b) => {
      const cmp = compareProductSortValues(
        getProductSortValue(a, column),
        getProductSortValue(b, column),
      );
      return direction === "asc" ? cmp : -cmp;
    });
  }, [filteredProducts, sortState]);

  const visibleOrderedProductColumns = useMemo(
    () => PRODUCT_COLUMN_ORDER.filter((id) => visibleProductColumns[id]),
    [visibleProductColumns],
  );

  const productTableMinWidth = useMemo(() => {
    const cols = visibleOrderedProductColumns.reduce(
      (total, id) => total + (PRODUCT_COLUMN_WIDTHS[id] ?? 140),
      0,
    );
    const actionCol = 104;
    const floor = 320;
    return Math.max(floor, cols + actionCol);
  }, [visibleOrderedProductColumns]);

  const productTableColPercents = useMemo(() => {
    const actionW = 104;
    const dataTotal = visibleOrderedProductColumns.reduce(
      (s, id) => s + PRODUCT_COLUMN_WIDTHS[id],
      0,
    );
    const total = dataTotal + actionW;
    if (total <= 0) {
      return { columns: [] as { id: ProductColumnId; percent: string }[], action: "12%" };
    }
    return {
      columns: visibleOrderedProductColumns.map((id) => ({
        id,
        percent: `${((PRODUCT_COLUMN_WIDTHS[id] / total) * 100).toFixed(3)}%`,
      })),
      action: `${((actionW / total) * 100).toFixed(3)}%`,
    };
  }, [visibleOrderedProductColumns]);

  const activeTableAdvancedFilterLabels = useMemo(() => {
    const items: string[] = [];
    const f = tableAdvancedFilters;

    if (f.supplier !== "ALL") {
      items.push(`Proveedor: ${f.supplier}`);
    }
    if (f.classification !== "ALL") {
      items.push(`Clasificación: ${f.classification}`);
    }
    if (f.brand !== "ALL") {
      items.push(`Marca: ${f.brand}`);
    }
    if (f.mode !== "ALL") {
      items.push(`Modo: ${getModeLabel(f.mode)}`);
    }
    if (f.recipe === "YES") {
      items.push("Solo con receta");
    }
    if (f.recipe === "NO") {
      items.push("Solo sin receta");
    }
    if (f.stockBand === "OUT") {
      items.push("Sin stock (0)");
    }
    if (f.stockBand === "LOW") {
      items.push("Stock bajo (1–5)");
    }
    if (f.stockBand === "OK") {
      items.push("Stock disponible (>5)");
    }

    return items;
  }, [tableAdvancedFilters]);

  const { totalPages, resultStart, resultEnd } = getPaginationWindow(
    page,
    PRODUCT_PAGE_SIZE,
    sortedProducts.length,
  );
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCT_PAGE_SIZE;
    return sortedProducts.slice(start, start + PRODUCT_PAGE_SIZE);
  }, [sortedProducts, page]);

  const activeProducts = products.filter((product) => product.activo).length;
  const totalStock = products.reduce((acc, product) => acc + product.stock, 0);
  const recipeProducts = products.filter((product) => product.requiereReceta).length;
  const imageDialogImages = useMemo(
    () => (imageDialogProduct ? getProductGalleryImages(imageDialogProduct) : []),
    [imageDialogProduct],
  );
  const currentDialogImage = imageDialogImages[imageDialogIndex] ?? null;

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
      duplicateExistingModels: Array.from(new Set(duplicateExistingRows.map((row) => row.modelo))),
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

  useClampPage(page, setPage, totalPages);
  useResetPageOnChange(setPage, [search, quickFilter, tableAdvancedFilters]);

  const applyTableAdvancedFilters = () => {
    setTableAdvancedFilters(draftTableAdvancedFilters);
    setTableFiltersMenuOpen(false);
  };

  const clearTableAdvancedFilters = () => {
    setTableAdvancedFilters(DEFAULT_TABLE_ADVANCED_FILTERS);
    setDraftTableAdvancedFilters(DEFAULT_TABLE_ADVANCED_FILTERS);
  };

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

  const handleToggleActive = async (product: AdminProduct) => {
    try {
      setSaving(true);
      const response = await updateProduct(product.id, { activo: !product.activo });
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? normalizeAdminProduct(response.product) : item,
        ),
      );
      toast.success(response.message || "Estado del producto actualizado");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      setSaving(true);
      const response = await deleteProduct(productToDelete.id);
      setProducts((current) =>
        current.filter((item) => item.id !== productToDelete.id),
      );
      toast.success(response.message || "Producto eliminado");
      setConfirmOpen(false);
      setProductToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el producto";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openImageDialog = (product: AdminProduct, index = 0) => {
    const images = getProductGalleryImages(product);
    if (images.length === 0) return;

    setImageDialogProduct(product);
    setImageDialogIndex(Math.max(0, Math.min(index, images.length - 1)));
  };

  const closeImageDialog = () => {
    setImageDialogProduct(null);
    setImageDialogIndex(0);
  };

  const showPreviousDialogImage = useCallback(() => {
    if (imageDialogImages.length <= 1) return;
    setImageDialogIndex((current) =>
      current === 0 ? imageDialogImages.length - 1 : current - 1,
    );
  }, [imageDialogImages.length]);

  const showNextDialogImage = useCallback(() => {
    if (imageDialogImages.length <= 1) return;
    setImageDialogIndex((current) =>
      current === imageDialogImages.length - 1 ? 0 : current + 1,
    );
  }, [imageDialogImages.length]);

  useEffect(() => {
    if (!imageDialogProduct) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousDialogImage();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextDialogImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageDialogProduct, showNextDialogImage, showPreviousDialogImage]);

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

  const onProductCsvSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Selecciona un archivo .csv valido.");
      return;
    }

    try {
      const csvText = await file.text();
      const preview = createProductImportPreview(file.name, csvText, existingProductModelCodes);
      setProductImportPreview(preview);
      setSelectedExistingImportRows([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo procesar el archivo CSV de productos";
      toast.error(message);
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
    if (!productImportPreview) return;

    const rowsToImport = productImportSummary.validRows;
    if (rowsToImport.length === 0) {
      toast.error(
        "No hay filas validas para importar. Revisa modelos repetidos o errores.",
      );
      return;
    }

    try {
      setImportingProductsFromCsv(true);
      const createdProducts: AdminProduct[] = [];
      let failedRows = 0;

      for (const row of rowsToImport) {
        try {
          const result = await createProduct(row.payload);
          createdProducts.push(result.product);
        } catch {
          failedRows += 1;
        }
      }

      if (createdProducts.length > 0) {
        setProducts((prev) => [...normalizeAdminProducts(createdProducts), ...prev]);
        setPage(1);
      }

      setProductImportPreview(null);
      if (createdProducts.length > 0 && failedRows === 0) {
        toast.success(`Importacion completada: ${createdProducts.length} productos creados.`);
      } else if (createdProducts.length > 0) {
        toast.success(
          `Importacion parcial: ${createdProducts.length} creados, ${failedRows} filas no se pudieron guardar.`,
        );
      } else {
        toast.error("No se pudo importar ningun producto del CSV.");
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
    closeProductTemplateModal();
    toast.success(`Plantilla descargada: ${preview.fileName}`);
  };

  const exportProductsCsv = (columns: ProductCsvColumnKey[], filePrefix: string) => {
    if (columns.length === 0) {
      toast.error("Selecciona al menos una columna para exportar.");
      return;
    }

    const orderedColumns = PRODUCT_CSV_COLUMNS.map((column) => column.key).filter((key) =>
      columns.includes(key),
    );
    if (filteredProductsForExport.length === 0) {
      toast.error("No hay productos que coincidan con los filtros de exportacion.");
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
    toast.success(
      `CSV exportado: ${fileName} (${filteredProductsForExport.length} productos).`,
    );
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

  const handleProductSortChange = (columnId: ProductColumnId) => {
    setSortState((current) => {
      if (current.column === columnId) {
        return {
          column: columnId,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        column: columnId,
        direction: getDefaultProductSortDirection(columnId),
      };
    });
  };

  const toggleProductColumnVisibility = (columnId: ProductColumnId, checked: boolean) => {
    const visibleCount = PRODUCT_COLUMN_ORDER.filter((id) => visibleProductColumns[id]).length;
    if (!checked && visibleCount === 1 && visibleProductColumns[columnId]) {
      toast.error("Debes mantener al menos una columna visible");
      return;
    }
    setVisibleProductColumns((current) => ({
      ...current,
      [columnId]: checked,
    }));
  };

  const resetProductVisibleColumns = () => {
    setVisibleProductColumns(DEFAULT_PRODUCT_VISIBLE_COLUMNS);
  };

  const renderProductTableCell = (columnId: ProductColumnId, product: AdminProduct) => {
    switch (columnId) {
      case "detalle":
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[var(--surface)]">
              {product.imageUrl ? (
                <button
                  type="button"
                  className="relative block h-full w-full cursor-zoom-in"
                  onClick={() => openImageDialog(product)}
                  aria-label={`Ver imágenes de ${product.nombre}`}
                >
                  <Image
                    src={product.imageUrl}
                    alt={product.nombre}
                    fill
                    sizes="56px"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--surface)]">
                  <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                    Sin foto
                  </span>
                </div>
              )}
            </div>
            <div className="grid gap-1">
              <p className="font-semibold text-[var(--text-main)]">{product.nombre}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {product.marca} - {product.modelo}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={getRecipeBadgeVariant(product.requiereReceta)}>
                  {product.requiereReceta ? "Con receta" : "Libre"}
                </Badge>
              </div>
            </div>
          </div>
        );
      case "clasificacion":
        return <span className="text-[var(--text-main)]">{product.clasificacion}</span>;
      case "proveedor":
        return <span className="text-[var(--text-main)]">{product.proveedor}</span>;
      case "precio":
        return formatCurrency(product.precio);
      case "stock":
        return (
          <Badge variant={getStockBadgeVariant(product.stock)}>{product.stock} unidades</Badge>
        );
      case "modo":
        return getModeLabel(product.tipoAdquisicion);
      case "estado":
        return (
          <Badge variant={product.activo ? "emerald" : "slate"}>
            {getStatusLabel(product.activo)}
          </Badge>
        );
      case "alta":
        return (
          <span className="text-sm text-[var(--text-muted)]">
            {formatDate(product.createdAt)}
          </span>
        );
      default:
        return null;
    }
  };

  if (blockingFullPage) {
    return <AdminPageLoading layout="viewport" />;
  }

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Gestiona el inventario: busca, filtra, edita precios y existencias, e importa o exporta listados en CSV."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard context="products-active" label="Productos activos" value={activeProducts} />
        <AdminMetricCard context="products-stock" label="Inventario total" value={totalStock} />
        <AdminMetricCard context="products-recipe" label="Requieren receta" value={recipeProducts} />
      </section>

      <Card className="w-full min-w-0 max-w-full rounded-xl border-[var(--border-soft)] shadow-sm">
        <CardHeader className="min-w-0 gap-5 border-b border-[var(--border-soft)] bg-[var(--card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Todos los productos</CardTitle>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Usa los tabs, los filtros y la búsqueda para acotar el listado.
              </p>
            </div>
            <Button asChild className="h-11 shrink-0 rounded-md px-4 shadow-none sm:mt-0">
              <Link href="/admin/products/new">
                <PackagePlus className="size-4" />
                Nuevo producto
              </Link>
            </Button>
          </div>

          <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-[var(--surface)] p-1">
            {PRODUCT_QUICK_FILTERS.map((tab) => {
              const isActive = quickFilter === tab.id;
              const count = quickFilterCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQuickFilter(tab.id)}
                  className={cn(
                    "inline-flex min-h-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--card)] text-[var(--brand-900)] shadow-[0_1px_3px_rgba(15,61,59,0.14)]"
                      : "text-[var(--text-muted)] hover:text-[var(--brand-800)]",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-xs",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--brand-600)_12%,var(--surface))] text-[var(--brand-800)]"
                        : "bg-[var(--card)] text-[var(--brand-800)]",
                    )}
                  >
                    {formatNumberEsMx(count)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md xl:shrink-0">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar productos..."
                className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--surface)] pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <DropdownMenu
                open={tableFiltersMenuOpen}
                onOpenChange={(open) => {
                  setTableFiltersMenuOpen(open);
                  if (open) {
                    setDraftTableAdvancedFilters(tableAdvancedFilters);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--card)] px-4 text-[var(--brand-800)] shadow-none hover:bg-[var(--surface)]"
                  >
                    <FileSearch className="size-4" />
                    Filtros
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[min(440px,calc(100vw-1.5rem))] rounded-lg border-[var(--border-soft)] bg-[var(--card)] p-0 shadow-[var(--shadow-md)]"
                >
                  <div className="grid gap-4 p-4">
                    <DropdownMenuLabel className="p-0 text-base font-semibold">
                      Filtros de tabla
                    </DropdownMenuLabel>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Proveedor
                        <select
                          className={productFieldClassName}
                          value={draftTableAdvancedFilters.supplier}
                          onChange={(event) =>
                            setDraftTableAdvancedFilters((current) => ({
                              ...current,
                              supplier: event.target.value,
                            }))
                          }
                        >
                          <option value="ALL">Todos</option>
                          {exportSupplierOptions.map((supplier) => (
                            <option key={supplier} value={supplier}>
                              {supplier}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Clasificación
                        <select
                          className={productFieldClassName}
                          value={draftTableAdvancedFilters.classification}
                          onChange={(event) =>
                            setDraftTableAdvancedFilters((current) => ({
                              ...current,
                              classification: event.target.value,
                            }))
                          }
                        >
                          <option value="ALL">Todas</option>
                          {tableClassificationOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Marca
                        <select
                          className={productFieldClassName}
                          value={draftTableAdvancedFilters.brand}
                          onChange={(event) =>
                            setDraftTableAdvancedFilters((current) => ({
                              ...current,
                              brand: event.target.value,
                            }))
                          }
                        >
                          <option value="ALL">Todas</option>
                          {tableBrandOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Modo de adquisición
                        <select
                          className={productFieldClassName}
                          value={draftTableAdvancedFilters.mode}
                          onChange={(event) =>
                            setDraftTableAdvancedFilters((current) => ({
                              ...current,
                              mode: event.target.value as ProductTableAdvancedFilters["mode"],
                            }))
                          }
                        >
                          <option value="ALL">Todos</option>
                          <option value="VENTA">Venta</option>
                          <option value="RENTA">Renta</option>
                          <option value="MIXTO">Mixto</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Receta
                        <select
                          className={productFieldClassName}
                          value={draftTableAdvancedFilters.recipe}
                          onChange={(event) =>
                            setDraftTableAdvancedFilters((current) => ({
                              ...current,
                              recipe: event.target.value as ProductTableAdvancedFilters["recipe"],
                            }))
                          }
                        >
                          <option value="ALL">Todas</option>
                          <option value="YES">Con receta</option>
                          <option value="NO">Sin receta</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Stock
                        <select
                          className={productFieldClassName}
                          value={draftTableAdvancedFilters.stockBand}
                          onChange={(event) =>
                            setDraftTableAdvancedFilters((current) => ({
                              ...current,
                              stockBand: event.target.value as ProductTableAdvancedFilters["stockBand"],
                            }))
                          }
                        >
                          <option value="ALL">Cualquiera</option>
                          <option value="OUT">Sin stock (0)</option>
                          <option value="LOW">Bajo (1–5)</option>
                          <option value="OK">Disponible (&gt;5)</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDraftTableAdvancedFilters(DEFAULT_TABLE_ADVANCED_FILTERS)}
                        className="rounded-md"
                      >
                        Limpiar borrador
                      </Button>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setTableFiltersMenuOpen(false)}
                          className="rounded-md"
                        >
                          Cerrar
                        </Button>
                        <Button type="button" onClick={applyTableAdvancedFilters} className="rounded-md">
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--card)] px-4 text-[var(--brand-800)] shadow-none hover:bg-[var(--surface)]"
                  >
                    <TableProperties className="size-4" />
                    Columnas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-lg border-[var(--border-soft)] bg-[var(--card)] p-1.5 shadow-[var(--shadow-md)]"
                >
                  <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRODUCT_COLUMN_ORDER.map((columnId) => (
                    <DropdownMenuCheckboxItem
                      key={columnId}
                      checked={visibleProductColumns[columnId]}
                      onCheckedChange={(checked) =>
                        toggleProductColumnVisibility(columnId, checked === true)
                      }
                    >
                      {PRODUCT_COLUMN_LABELS[columnId]}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={resetProductVisibleColumns}>
                    <EyeOff className="size-4" />
                    Restaurar columnas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--card)] px-4 text-[var(--brand-800)] shadow-none hover:bg-[var(--surface)]"
                onClick={openProductTemplateModal}
              >
                <FileSpreadsheet className="size-4" />
                Plantilla CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--card)] px-4 text-[var(--brand-800)] shadow-none hover:bg-[var(--surface)]"
                onClick={openProductImportPicker}
              >
                <FileUp className="size-4" />
                Importar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--card)] px-4 text-[var(--brand-800)] shadow-none hover:bg-[var(--surface)]"
                onClick={openProductExportModal}
              >
                <FileDown className="size-4" />
                Exportar CSV
              </Button>
              <input
                ref={productCsvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onProductCsvSelected}
                className="sr-only"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Boxes className="size-4 opacity-70" />
              {filteredProducts.length} resultado{filteredProducts.length === 1 ? "" : "s"}
              {search.trim() ? ` para "${search.trim()}"` : ""}
            </div>

            {activeTableAdvancedFilterLabels.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                <span>Filtros:</span>
                {activeTableAdvancedFilterLabels.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[var(--brand-800)]"
                  >
                    {item}
                  </span>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearTableAdvancedFilters}
                  className="rounded-md"
                >
                  <X className="size-3.5" />
                  Limpiar
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="w-full min-w-0 max-w-full pb-2">
          {filteredProducts.length === 0 ? (
            <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
              <div className="max-w-md">
                <h2 className="text-xl font-semibold text-[var(--brand-900)]">
                  No encontramos productos
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {products.length === 0
                    ? "Todavia no has creado productos. Usa el boton superior para abrir la pagina de alta."
                    : "Prueba otro tab, quita filtros, ajusta la busqueda o crea un producto nuevo."}
                </p>
                <Button asChild className="mt-4 rounded-md">
                  <Link href="/admin/products/new">
                    <PackagePlus className="size-4" />
                    Ir a crear producto
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <Table
                className="min-w-0"
                style={{
                  width: "100%",
                  minWidth: `${productTableMinWidth}px`,
                }}
              >
                <colgroup>
                  {productTableColPercents.columns.map(({ id, percent }) => (
                    <col key={id} style={{ width: percent }} />
                  ))}
                  <col style={{ width: productTableColPercents.action }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="border-b border-[color-mix(in_srgb,var(--brand-700)_24%,var(--border-soft))] bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))]">
                    {visibleOrderedProductColumns.map((columnId) => (
                      <TableHead
                        key={columnId}
                        className="whitespace-nowrap text-[var(--brand-900)]"
                      >
                        <AdminTableSortHeader
                          column={columnId}
                          activeColumn={sortState.column}
                          direction={sortState.direction}
                          onSort={handleProductSortChange}
                          className="min-h-0 transition hover:bg-[color-mix(in_srgb,var(--brand-700)_14%,var(--card))] hover:text-[var(--brand-700)]"
                        >
                          {PRODUCT_COLUMN_LABELS[columnId]}
                        </AdminTableSortHeader>
                      </TableHead>
                    ))}
                    <TableHead className="w-[88px] whitespace-nowrap text-right text-[var(--brand-900)]">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      {visibleOrderedProductColumns.map((columnId) => (
                        <TableCell key={columnId}>
                          {renderProductTableCell(columnId, product)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-md text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--brand-800)]"
                                  aria-label={`Acciones para ${product.nombre}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Acciones</TooltipContent>
                          </Tooltip>

                          <DropdownMenuContent
                            align="end"
                            className="w-52 rounded-lg border-[var(--border-soft)] bg-[var(--card)] p-1.5 shadow-[var(--shadow-md)]"
                          >
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${product.id}/edit`}>
                                <PencilLine className="size-4" />
                                Editar producto
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void handleToggleActive(product)}
                              disabled={saving}
                            >
                              <ShieldCheck className="size-4" />
                              {product.activo ? "Desactivar" : "Activar"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={saving}
                              onSelect={() => {
                                setProductToDelete(product);
                                setConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--card)] md:flex-row md:items-center md:justify-between">
          <AdminTablePagination
            resultStart={resultStart}
            resultEnd={resultEnd}
            totalCount={sortedProducts.length}
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </CardFooter>
      </Card>

      <Dialog
        open={productImportPreview !== null}
        onOpenChange={(open) => {
          if (!open) closeProductImportModal();
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[min(920px,calc(100vw-1.5rem))] flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Previsualizacion de importacion</DialogTitle>
            <DialogDescription>
              Archivo:{" "}
              <strong className="text-foreground">{productImportPreview?.fileName}</strong>
            </DialogDescription>
          </DialogHeader>

          {productImportPreview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[var(--border-soft)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Total de filas</p>
                  <p className="text-lg font-semibold">{formatNumberEsMx(productImportSummary.total)}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-soft)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Validas para importar</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatNumberEsMx(productImportSummary.validRows.length)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border-soft)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Con errores</p>
                  <p className="text-lg font-semibold">{formatNumberEsMx(productImportSummary.invalidCount)}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-soft)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Modelos repetidos</p>
                  <p className="text-lg font-semibold">
                    {formatNumberEsMx(
                      productImportSummary.duplicateExistingCount +
                        productImportSummary.duplicateInFileCount,
                    )}
                  </p>
                </div>
              </div>

              {productImportSummary.duplicateExistingModels.length > 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Modelos ya existentes:{" "}
                  {productImportSummary.duplicateExistingModels.slice(0, 8).join(", ")}
                  {productImportSummary.duplicateExistingModels.length > 8 ? ", ..." : ""}
                </p>
              ) : null}

              {productImportSummary.duplicateInFileModels.length > 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Modelos repetidos dentro del CSV:{" "}
                  {productImportSummary.duplicateInFileModels.slice(0, 8).join(", ")}
                  {productImportSummary.duplicateInFileModels.length > 8 ? ", ..." : ""}
                </p>
              ) : null}

              {existingImportRowLineNumbers.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">
                    Los productos ya existentes estan resaltados. Puedes seleccionarlos y quitarlos
                    de la vista previa.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={allExistingImportRowsSelected}
                        onChange={toggleAllExistingImportRows}
                        disabled={importingProductsFromCsv}
                      />
                      <span>
                        Seleccionar existentes (
                        {formatNumberEsMx(existingImportRowLineNumbers.length)})
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={removeSelectedExistingImportRows}
                      disabled={
                        importingProductsFromCsv || selectedExistingImportRows.length === 0
                      }
                    >
                      Quitar seleccionados ({formatNumberEsMx(selectedExistingImportRows.length)})
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border-soft)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Sel.</TableHead>
                      <TableHead>Linea</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productImportPreview.rows.slice(0, 40).map((row) => {
                      const status = getProductImportRowStatus(row);
                      const isExistingSelected = selectedExistingImportRowSet.has(row.lineNumber);
                      const badgeVariant =
                        status.tone === "ready"
                          ? ("emerald" as const)
                          : status.tone === "existing"
                            ? ("amber" as const)
                            : ("red" as const);

                      return (
                        <TableRow
                          key={`${row.lineNumber}-${row.modelo}`}
                          className={
                            row.duplicateExistingModel
                              ? isExistingSelected
                                ? "bg-amber-500/15"
                                : "bg-muted/50"
                              : undefined
                          }
                        >
                          <TableCell>
                            {row.duplicateExistingModel ? (
                              <input
                                type="checkbox"
                                className="size-4 rounded border-input"
                                checked={isExistingSelected}
                                onChange={() => toggleExistingImportRowSelection(row.lineNumber)}
                                disabled={importingProductsFromCsv}
                                aria-label={`Seleccionar linea ${row.lineNumber}`}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>{row.lineNumber}</TableCell>
                          <TableCell>{row.nombre}</TableCell>
                          <TableCell>{row.modelo}</TableCell>
                          <TableCell>{row.precioRaw}</TableCell>
                          <TableCell>{row.stockRaw}</TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant} className="max-w-[220px] truncate">
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-soft)] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  onClick={closeProductImportModal}
                  disabled={importingProductsFromCsv}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="rounded-md"
                  onClick={() => void importProductsFromCsv()}
                  disabled={
                    importingProductsFromCsv || productImportSummary.validRows.length === 0
                  }
                >
                  {importingProductsFromCsv
                    ? "Importando..."
                    : `Importar ${productImportSummary.validRows.length} productos`}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showProductExportModal} onOpenChange={setShowProductExportModal}>
        <DialogContent className="flex max-h-[min(90vh,760px)] w-[min(720px,calc(100vw-1.5rem))] flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Exportar productos a CSV</DialogTitle>
            <DialogDescription>
              Filtra, ordena y elige columnas. Tambien puedes exportar todo en formato compatible
              con la importacion.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-soft)] p-3 text-sm">
              <p className="text-[var(--text-muted)]">Productos a exportar</p>
              <p className="text-lg font-semibold">
                {formatNumberEsMx(filteredProductsForExport.length)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                de {formatNumberEsMx(products.length)} disponibles
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] p-3 text-sm">
              <p className="text-[var(--text-muted)]">Atajos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={applyTopStockExportPreset}
                >
                  Mayor stock
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={applyTopPriceExportPreset}
                >
                  Mayor precio
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Proveedor</span>
              <select
                className={productFieldClassName}
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
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Tipo de adquisicion</span>
              <select
                className={productFieldClassName}
                value={productExportFilters.mode}
                onChange={(e) =>
                  updateProductExportFilter("mode", e.target.value as ProductExportFilters["mode"])
                }
              >
                <option value="ALL">Todos</option>
                <option value="VENTA">Solo venta</option>
                <option value="RENTA">Solo renta</option>
                <option value="MIXTO">Mixto</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Receta</span>
              <select
                className={productFieldClassName}
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
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Estado</span>
              <select
                className={productFieldClassName}
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
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Limite</span>
              <select
                className={productFieldClassName}
                value={productExportFilters.limit}
                onChange={(e) =>
                  updateProductExportFilter("limit", e.target.value as ProductExportFilters["limit"])
                }
              >
                <option value="ALL">Sin limite</option>
                <option value="10">10 productos</option>
                <option value="30">30 productos</option>
                <option value="50">50 productos</option>
                <option value="100">100 productos</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Orden</span>
              <select
                className={productFieldClassName}
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

          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="mb-2 text-sm font-medium">Columnas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRODUCT_CSV_COLUMNS.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border-soft)] px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={selectedProductExportColumns.includes(column.key)}
                    onChange={() => toggleExportColumn(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={resetProductExportFilters}
            >
              Limpiar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => setSelectedProductExportColumns([])}
            >
              Limpiar seleccion
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() =>
                setSelectedProductExportColumns(PRODUCT_CSV_COLUMNS.map((c) => c.key))
              }
            >
              Seleccionar todo
            </Button>
            <Button
              type="button"
              size="sm"
              className="ms-auto rounded-md"
              onClick={() =>
                exportProductsCsv(
                  PRODUCT_CSV_COLUMNS.map((c) => c.key),
                  "productos_cemydi_importacion",
                )
              }
            >
              Exportar todo (importacion)
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-md"
              onClick={() =>
                exportProductsCsv(selectedProductExportColumns, "productos_cemydi_columnas")
              }
            >
              Exportar columnas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showProductTemplateModal}
        onOpenChange={(open) => {
          if (!open) closeProductTemplateModal();
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,800px)] w-[min(720px,calc(100vw-1.5rem))] flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Plantilla CSV de productos</DialogTitle>
            <DialogDescription>
              Genera una plantilla generica o personalizada con los encabezados listos para llenar e
              importar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-base">Plantilla generica</CardTitle>
                <p className="text-sm text-[var(--text-muted)]">
                  Todas las columnas compatibles con la importacion actual.
                </p>
              </CardHeader>
              <CardFooter>
                <Button
                  type="button"
                  className="w-full rounded-md"
                  onClick={generateGenericProductTemplate}
                >
                  Generar plantilla generica
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-base">Plantilla personalizada</CardTitle>
                <p className="text-sm text-[var(--text-muted)]">
                  Las columnas obligatorias no se pueden quitar.
                </p>
              </CardHeader>
              <CardContent className="grid max-h-48 gap-2 overflow-y-auto">
                {PRODUCT_CSV_COLUMNS.map((column) => {
                  const isRequired = PRODUCT_CSV_REQUIRED_COLUMN_KEYS.includes(column.key);
                  return (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={selectedProductTemplateColumns.includes(column.key)}
                        onChange={() => toggleTemplateColumn(column.key)}
                        disabled={isRequired}
                      />
                      <span>
                        {column.label}
                        {isRequired ? (
                          <span className="text-[var(--text-muted)]"> (obligatorio)</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={resetCustomTemplateColumns}
                >
                  Solo obligatorios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={selectAllTemplateColumns}
                >
                  Seleccionar todo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-md"
                  onClick={generateCustomProductTemplate}
                >
                  Generar personalizada
                </Button>
              </CardFooter>
            </Card>
          </div>

          {productTemplatePreview ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-[var(--border-soft)] p-3">
              <p className="text-sm font-medium">
                Vista previa:{" "}
                {productTemplatePreview.variant === "generic" ? "Generica" : "Personalizada"} (
                {formatNumberEsMx(productTemplatePreview.columns.length)} columnas)
              </p>
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {productTemplatePreview.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productTemplatePreview.sampleRows.map((row, index) => (
                      <TableRow key={`template-${index + 1}`}>
                        {productTemplatePreview.columns.map((column) => (
                          <TableCell key={column}>{row[column]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  onClick={() => setProductTemplatePreview(null)}
                >
                  Limpiar vista previa
                </Button>
                <Button
                  type="button"
                  className="rounded-md"
                  onClick={() => downloadProductTemplate(productTemplatePreview)}
                >
                  Descargar CSV
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(imageDialogProduct)}
        onOpenChange={(open) => {
          if (!open) closeImageDialog();
        }}
      >
        <DialogContent className="flex h-[min(92vh,860px)] w-[min(96vw,1380px)] max-w-none flex-col gap-0 overflow-hidden border-white/10 bg-[rgba(8,10,12,0.98)] p-0 text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {imageDialogProduct ? `Imágenes de ${imageDialogProduct.nombre}` : "Imágenes del producto"}
            </DialogTitle>
            <DialogDescription>
              Navega entre las imágenes del producto desde el visor del administrador.
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-5 max-[640px]:px-2 max-[640px]:py-3">
            {imageDialogImages.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-10 size-12 rounded-full bg-black/35 text-white hover:bg-black/55 max-[640px]:left-2 max-[640px]:size-10"
                  onClick={showPreviousDialogImage}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-10 size-12 rounded-full bg-black/35 text-white hover:bg-black/55 max-[640px]:right-2 max-[640px]:size-10"
                  onClick={showNextDialogImage}
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="size-6" />
                </Button>
              </>
            ) : null}

            {currentDialogImage ? (
              <div className="relative h-full w-full">
                <Image
                  src={currentDialogImage.imageUrl}
                  alt={imageDialogProduct?.nombre ?? "Imagen del producto"}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>
            ) : null}
          </div>

          {imageDialogImages.length > 1 ? (
            <div className="border-t border-white/8 bg-[rgba(14,16,18,0.78)] px-3 py-2 backdrop-blur-sm max-[640px]:px-2 max-[640px]:py-1.5">
              <div className="flex items-center gap-2 overflow-x-auto">
                {imageDialogImages.map((image, index) => {
                  const isActive = index === imageDialogIndex;

                  return (
                    <button
                      key={`admin-image-${image.id}-${image.sortOrder}`}
                      type="button"
                      className={`relative h-14 w-14 shrink-0 overflow-hidden bg-white/5 transition max-[640px]:h-11 max-[640px]:w-11 ${
                        isActive ? "ring-2 ring-[#22f0a6]" : "opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setImageDialogIndex(index)}
                      aria-label={`Ir a imagen ${index + 1}`}
                    >
                      <Image
                        src={image.imageUrl}
                        alt={`${imageDialogProduct?.nombre ?? "Producto"} ${index + 1}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar producto"
        description={
          productToDelete
            ? `Se eliminara ${productToDelete.nombre} de forma permanente.`
            : "Esta accion no se puede deshacer."
        }
        tone="danger"
        busy={saving}
        onConfirm={handleDelete}
        onCancel={() => {
          if (saving) return;
          setConfirmOpen(false);
          setProductToDelete(null);
        }}
      />
    </>
  );
}
