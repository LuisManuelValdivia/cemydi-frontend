"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BookPlus,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Tag,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { ConfirmDialog } from "@/components/feedback";
import {
  createBrand,
  createClassification,
  deleteBrand,
  deleteClassification,
  listCatalogs,
  listProducts,
  updateBrand,
  updateClassification,
} from "@/services/admin";

import {
  compareSort,
  getPaginationWindow,
  syntheticIdForName,
  type SortDirection,
} from "../lib/admin-list-utils";
import { useAdminDataBootstrap } from "../hooks/use-admin-data-bootstrap";
import { useClampPage, useResetPageOnChange } from "../hooks/use-admin-pagination";
import { cn } from "../lib/utils";
import { AdminFilterTabs } from "./admin-filter-tabs";
import { AdminPageLoading } from "./admin-page-loading";
import { AdminSearchField } from "./admin-search-field";
import { AdminTablePagination } from "./admin-table-pagination";
import { AdminTableSortHeader } from "./admin-table-sort-header";
import { PageHeader } from "./page-header";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { formatDate } from "../products/product-shared";

export type NameCatalogKind = "brand" | "classification";

type RowSource = "catalog" | "product";

export type CatalogRow = {
  id: number;
  nombre: string;
  createdAt?: string;
  source: RowSource;
};

type SourceTab = "ALL" | "CATALOG" | "PRODUCT";

type SortColumn = "nombre" | "origen" | "fecha";

const CATALOG_PAGE_SIZE = 8;

const CATALOG_TABLE_MIN_WIDTH =
  280 + 168 + 140 + 104;

const fieldClassName =
  "h-11 rounded-md border border-[var(--border-soft)] bg-[var(--card)] px-3 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-600)_18%,transparent)]";

const CONFIG: Record<
  NameCatalogKind,
  {
    title: string;
    subtitle: string;
    formTitleNew: string;
    formTitleEdit: string;
    listTitle: string;
    nameLabel: string;
    emptySearch: string;
    emptyList: string;
    createdOk: string;
    updatedOk: string;
    deletedOk: string;
    saveError: string;
    registerOk: string;
  }
> = {
  brand: {
    title: "Marcas",
    subtitle:
      "Administra el catálogo de marcas: se usan al dar de alta o editar productos y mantienen el inventario ordenado.",
    formTitleNew: "Nueva marca",
    formTitleEdit: "Editar marca",
    listTitle: "Listado de marcas",
    nameLabel: "Nombre",
    emptySearch: "Sin coincidencias.",
    emptyList: "Sin registros.",
    createdOk: "Marca creada.",
    updatedOk: "Marca actualizada.",
    deletedOk: "Marca eliminada.",
    saveError: "No se pudo guardar.",
    registerOk: "Marca registrada.",
  },
  classification: {
    title: "Categorías",
    subtitle:
      "Las categorías clasifican los productos en el catálogo y también se usan en promociones por categoría.",
    formTitleNew: "Nueva categoría",
    formTitleEdit: "Editar categoría",
    listTitle: "Listado de categorías",
    nameLabel: "Nombre",
    emptySearch: "Sin coincidencias.",
    emptyList: "Sin registros.",
    createdOk: "Categoría creada.",
    updatedOk: "Categoría actualizada.",
    deletedOk: "Categoría eliminada.",
    saveError: "No se pudo guardar.",
    registerOk: "Categoría registrada.",
  },
};

const SOURCE_TABS: { id: SourceTab; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "CATALOG", label: "Catálogo" },
  { id: "PRODUCT", label: "En productos" },
];

function validateNombre(raw: string) {
  const nombre = raw.trim();
  if (nombre.length < 2 || nombre.length > 80) {
    return "El nombre debe tener entre 2 y 80 caracteres.";
  }
  return null;
}

export function NameCatalogAdmin({ kind }: { kind: NameCatalogKind }) {
  const cfg = CONFIG[kind];

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CatalogRow[]>([]);
  const [search, setSearch] = useState("");
  const [sourceTab, setSourceTab] = useState<SourceTab>("ALL");
  const [sortColumn, setSortColumn] = useState<SortColumn>("nombre");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [nombre, setNombre] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogRow | null>(null);

  const load = useCallback(async () => {
    const [{ brands, classifications }, { products }] = await Promise.all([
      listCatalogs(),
      listProducts(),
    ]);

    const catalogItems = kind === "brand" ? brands : classifications;
    const catalogSet = new Set(
      catalogItems.map((c) => c.nombre.trim().toLowerCase()).filter(Boolean),
    );

    const fromProducts =
      kind === "brand"
        ? products.map((p) => p.marca.trim()).filter(Boolean)
        : products.map((p) => p.clasificacion.trim()).filter(Boolean);

    const distinctProductOnly = [...new Set(fromProducts)].filter(
      (n) => !catalogSet.has(n.toLowerCase()),
    );

    const rows: CatalogRow[] = [
      ...catalogItems.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        createdAt: c.createdAt,
        source: "catalog" as const,
      })),
      ...distinctProductOnly.map((nombreValue) => ({
        id: syntheticIdForName(nombreValue),
        nombre: nombreValue,
        source: "product" as const,
      })),
    ];

    setItems(rows);
  }, [kind]);

  const { blockingFullPage } = useAdminDataBootstrap({
    load,
    loadErrorFallback: "No se pudo cargar el catálogo.",
  });

  const tabCounts = useMemo(
    () => ({
      ALL: items.length,
      CATALOG: items.filter((r) => r.source === "catalog").length,
      PRODUCT: items.filter((r) => r.source === "product").length,
    }),
    [items],
  );

  const processedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((row) => {
      if (sourceTab === "CATALOG" && row.source !== "catalog") return false;
      if (sourceTab === "PRODUCT" && row.source !== "product") return false;
      if (!q) return true;
      return row.nombre.toLowerCase().includes(q);
    });

    list = [...list].sort((a, b) => {
      switch (sortColumn) {
        case "origen":
          return compareSort(
            a.source === "catalog" ? 0 : 1,
            b.source === "catalog" ? 0 : 1,
            sortDirection,
          );
        case "fecha": {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return compareSort(ta, tb, sortDirection);
        }
        case "nombre":
        default:
          return compareSort(a.nombre, b.nombre, sortDirection);
      }
    });

    return list;
  }, [items, search, sourceTab, sortColumn, sortDirection]);

  const { totalPages, resultStart, resultEnd } = getPaginationWindow(
    page,
    CATALOG_PAGE_SIZE,
    processedRows.length,
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * CATALOG_PAGE_SIZE;
    return processedRows.slice(start, start + CATALOG_PAGE_SIZE);
  }, [processedRows, page]);

  useClampPage(page, setPage, totalPages);
  useResetPageOnChange(setPage, [search, sourceTab, sortColumn, sortDirection]);

  const resetForm = () => {
    setNombre("");
    setEditingId(null);
  };

  const startEdit = (row: CatalogRow) => {
    if (row.source !== "catalog") return;
    setEditingId(row.id);
    setNombre(row.nombre);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "fecha" ? "desc" : "asc");
    }
  };

  const registerInCatalog = async (row: CatalogRow) => {
    if (row.source !== "product") return;
    const err = validateNombre(row.nombre);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = { nombre: row.nombre.trim() };
      if (kind === "brand") {
        await createBrand(payload);
      } else {
        await createClassification(payload);
      }
      toast.success(cfg.registerOk);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : cfg.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const err = validateNombre(nombre);
    if (err) {
      toast.error(err);
      return;
    }

    const payload = { nombre: nombre.trim() };
    setSaving(true);
    try {
      if (editingId !== null && editingId > 0) {
        if (kind === "brand") {
          await updateBrand(editingId, payload);
        } else {
          await updateClassification(editingId, payload);
        }
        toast.success(cfg.updatedOk);
      } else {
        if (kind === "brand") {
          await createBrand(payload);
        } else {
          await createClassification(payload);
        }
        toast.success(cfg.createdOk);
      }
      await load();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : cfg.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteTarget.source !== "catalog") {
      setDeleteTarget(null);
      return;
    }
    setSaving(true);
    try {
      if (kind === "brand") {
        await deleteBrand(deleteTarget.id);
      } else {
        await deleteClassification(deleteTarget.id);
      }
      toast.success(cfg.deletedOk);
      if (editingId === deleteTarget.id) resetForm();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el registro.",
      );
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  if (blockingFullPage) {
    return <AdminPageLoading />;
  }

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />

      <Card className="w-full min-w-0 max-w-full rounded-xl border-[var(--border-soft)] shadow-sm">
        <CardHeader className="gap-4 border-b border-[var(--border-soft)]">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="size-5 text-[var(--brand-700)]" aria-hidden />
            {editingId !== null ? cfg.formTitleEdit : cfg.formTitleNew}
          </CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-2 text-sm font-medium text-[var(--text-main)]">
              {cfg.nameLabel}
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder=""
                className={fieldClassName}
                disabled={saving}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {editingId !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-11 rounded-md"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : editingId !== null ? (
                  "Guardar cambios"
                ) : (
                  "Agregar"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardHeader className="min-w-0 gap-4 border-b border-[var(--border-soft)] bg-[var(--card)] py-4">
          <AdminFilterTabs
            tabs={SOURCE_TABS.map((tab) => ({
              id: tab.id,
              label: tab.label,
              count: tabCounts[tab.id],
            }))}
            activeId={sourceTab}
            onChange={setSourceTab}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-[var(--text-main)]">{cfg.listTitle}</h3>
            <AdminSearchField
              value={search}
              onChange={setSearch}
              wrapperClassName="w-full sm:max-w-xs"
            />
          </div>

          <p className="text-sm text-[var(--text-muted)]">
            {processedRows.length} resultado{processedRows.length === 1 ? "" : "s"}
          </p>
        </CardHeader>

        <CardContent className="w-full min-w-0 max-w-full pb-2">
          {processedRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              {search.trim() ? cfg.emptySearch : cfg.emptyList}
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <Table
                className="min-w-0"
                style={{
                  width: "100%",
                  minWidth: `${CATALOG_TABLE_MIN_WIDTH}px`,
                }}
              >
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="border-b border-[color-mix(in_srgb,var(--brand-700)_24%,var(--border-soft))] bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))]">
                    <TableHead className="text-[var(--brand-900)]">
                      <AdminTableSortHeader
                        column="nombre"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        Nombre
                      </AdminTableSortHeader>
                    </TableHead>
                    <TableHead className="text-[var(--brand-900)]">
                      <AdminTableSortHeader
                        column="origen"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        Origen
                      </AdminTableSortHeader>
                    </TableHead>
                    <TableHead className="hidden text-[var(--brand-900)] sm:table-cell">
                      <AdminTableSortHeader
                        column="fecha"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        Registro
                      </AdminTableSortHeader>
                    </TableHead>
                    <TableHead className="w-[88px] whitespace-nowrap text-right text-[var(--brand-900)]">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow key={`${row.source}-${row.id}-${row.nombre}`}>
                      <TableCell className="font-medium text-[var(--text-main)]">
                        {row.nombre}
                      </TableCell>
                      <TableCell>
                        {row.source === "catalog" ? (
                          <Badge variant="violet">Catálogo</Badge>
                        ) : (
                          <Badge variant="amber">Producto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-[var(--text-muted)] sm:table-cell">
                        {row.source === "catalog" ? formatDate(row.createdAt) : "—"}
                      </TableCell>
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
                                  aria-label={`Acciones para ${row.nombre}`}
                                  disabled={saving}
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
                            {row.source === "catalog" ? (
                              <>
                                <DropdownMenuItem onSelect={() => startEdit(row)}>
                                  <PencilLine className="size-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setDeleteTarget(row)}
                                >
                                  <Trash2 className="size-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onSelect={() => void registerInCatalog(row)}
                              >
                                <BookPlus className="size-4" />
                                Registrar
                              </DropdownMenuItem>
                            )}
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
            totalCount={processedRows.length}
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null && deleteTarget.source === "catalog"}
        title={kind === "brand" ? "Eliminar marca" : "Eliminar categoría"}
        description={
          deleteTarget ? `¿Eliminar «${deleteTarget.nombre}» del catálogo?` : undefined
        }
        tone="danger"
        busy={saving}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => {
          if (saving) return;
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
