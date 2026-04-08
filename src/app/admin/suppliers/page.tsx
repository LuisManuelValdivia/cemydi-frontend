"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Factory,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Trash2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";

import { ConfirmDialog } from "@/components/feedback";
import {
  createSupplier,
  deleteSupplier,
  listProducts,
  listSuppliers,
  updateSupplier,
  type CreateSupplierPayload,
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
import { AdminFilterTabs } from "../components/admin-filter-tabs";
import { AdminPageLoading } from "../components/admin-page-loading";
import { AdminSearchField } from "../components/admin-search-field";
import { AdminTablePagination } from "../components/admin-table-pagination";
import { AdminTableSortHeader } from "../components/admin-table-sort-header";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
import { formatDate, productFieldClassName } from "../products/product-shared";

const EMPTY_FORM: CreateSupplierPayload = {
  nombre: "",
  encargado: "",
  repartidor: "",
  direccion: "",
};

type RowSource = "catalog" | "product";

type SupplierRow = {
  id: number;
  nombre: string;
  encargado: string;
  repartidor: string;
  direccion: string;
  createdAt?: string;
  source: RowSource;
};

type SourceTab = "ALL" | "CATALOG" | "PRODUCT";

type SortColumn = "nombre" | "encargado" | "fecha";

const SUPPLIERS_PAGE_SIZE = 8;

const SUPPLIERS_TABLE_MIN_WIDTH =
  220 + 120 + 140 + 140 + 200 + 120 + 104;

const SOURCE_TABS: { id: SourceTab; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "CATALOG", label: "Catálogo" },
  { id: "PRODUCT", label: "En productos" },
];

function validateSupplier(form: CreateSupplierPayload) {
  const nombre = form.nombre.trim();
  if (nombre.length < 2 || nombre.length > 120) {
    return "El nombre debe tener entre 2 y 120 caracteres.";
  }
  const encargado = form.encargado.trim();
  if (encargado.length < 2 || encargado.length > 120) {
    return "El encargado debe tener entre 2 y 120 caracteres.";
  }
  const repartidor = form.repartidor.trim();
  if (repartidor.length < 2 || repartidor.length > 120) {
    return "El repartidor debe tener entre 2 y 120 caracteres.";
  }
  const direccion = form.direccion.trim();
  if (direccion.length < 5 || direccion.length > 180) {
    return "La dirección debe tener entre 5 y 180 caracteres.";
  }
  return null;
}

export default function AdminSuppliersPage() {
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [search, setSearch] = useState("");
  const [sourceTab, setSourceTab] = useState<SourceTab>("ALL");
  const [sortColumn, setSortColumn] = useState<SortColumn>("nombre");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CreateSupplierPayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);

  const load = useCallback(async () => {
    const [{ suppliers }, { products }] = await Promise.all([listSuppliers(), listProducts()]);

    const catalogSet = new Set(
      suppliers.map((s) => s.nombre.trim().toLowerCase()).filter(Boolean),
    );

    const fromProducts = products.map((p) => p.proveedor.trim()).filter(Boolean);
    const distinctProductOnly = [...new Set(fromProducts)].filter(
      (n) => !catalogSet.has(n.toLowerCase()),
    );

    const merged: SupplierRow[] = [
      ...suppliers.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        encargado: s.encargado,
        repartidor: s.repartidor,
        direccion: s.direccion,
        createdAt: s.createdAt,
        source: "catalog" as const,
      })),
      ...distinctProductOnly.map((nombre) => ({
        id: syntheticIdForName(nombre),
        nombre,
        encargado: "",
        repartidor: "",
        direccion: "",
        source: "product" as const,
      })),
    ];

    setRows(merged);
  }, []);

  const { blockingFullPage } = useAdminDataBootstrap({
    load,
    loadErrorFallback: "No se pudieron cargar los proveedores.",
  });

  const tabCounts = useMemo(
    () => ({
      ALL: rows.length,
      CATALOG: rows.filter((r) => r.source === "catalog").length,
      PRODUCT: rows.filter((r) => r.source === "product").length,
    }),
    [rows],
  );

  const processedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (sourceTab === "CATALOG" && row.source !== "catalog") return false;
      if (sourceTab === "PRODUCT" && row.source !== "product") return false;
      if (!q) return true;
      return [row.nombre, row.encargado, row.repartidor, row.direccion]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    list = [...list].sort((a, b) => {
      switch (sortColumn) {
        case "encargado":
          return compareSort(a.encargado || "—", b.encargado || "—", sortDirection);
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
  }, [rows, search, sourceTab, sortColumn, sortDirection]);

  const { totalPages, resultStart, resultEnd } = getPaginationWindow(
    page,
    SUPPLIERS_PAGE_SIZE,
    processedRows.length,
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * SUPPLIERS_PAGE_SIZE;
    return processedRows.slice(start, start + SUPPLIERS_PAGE_SIZE);
  }, [processedRows, page]);

  useClampPage(page, setPage, totalPages);
  useResetPageOnChange(setPage, [search, sourceTab, sortColumn, sortDirection]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (row: SupplierRow) => {
    if (row.source !== "catalog") return;
    setEditingId(row.id);
    setForm({
      nombre: row.nombre,
      encargado: row.encargado,
      repartidor: row.repartidor,
      direccion: row.direccion,
    });
  };

  const startCompleteFromProduct = (row: SupplierRow) => {
    if (row.source !== "product") return;
    setEditingId(null);
    setForm({
      nombre: row.nombre,
      encargado: "",
      repartidor: "",
      direccion: "",
    });
  };

  const updateField = (key: keyof CreateSupplierPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "fecha" ? "desc" : "asc");
    }
  };

  const handleSave = async () => {
    const err = validateSupplier(form);
    if (err) {
      toast.error(err);
      return;
    }

    const payload: CreateSupplierPayload = {
      nombre: form.nombre.trim(),
      encargado: form.encargado.trim(),
      repartidor: form.repartidor.trim(),
      direccion: form.direccion.trim(),
    };

    setSaving(true);
    try {
      if (editingId !== null && editingId > 0) {
        await updateSupplier(editingId, payload);
        toast.success("Proveedor actualizado.");
      } else {
        await createSupplier(payload);
        toast.success("Proveedor creado.");
      }
      await load();
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el proveedor.",
      );
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
      await deleteSupplier(deleteTarget.id);
      toast.success("Proveedor eliminado.");
      if (editingId === deleteTarget.id) resetForm();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el proveedor.",
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
      <PageHeader
        title="Proveedores"
        subtitle="Registra y actualiza los proveedores del negocio: nombre, contacto, reparto y dirección para asociarlos a los productos."
      />

      <Card className="w-full min-w-0 max-w-full rounded-xl border-[var(--border-soft)] shadow-sm">
        <CardHeader className="gap-4 border-b border-[var(--border-soft)]">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="size-5 text-[var(--brand-700)]" aria-hidden />
            {editingId !== null ? "Editar proveedor" : "Nuevo proveedor"}
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
              Nombre comercial
              <input
                className={productFieldClassName}
                value={form.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
                placeholder=""
                disabled={saving}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
              Encargado
              <input
                className={productFieldClassName}
                value={form.encargado}
                onChange={(e) => updateField("encargado", e.target.value)}
                placeholder=""
                disabled={saving}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
              Repartidor
              <input
                className={productFieldClassName}
                value={form.repartidor}
                onChange={(e) => updateField("repartidor", e.target.value)}
                placeholder=""
                disabled={saving}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--text-main)] sm:col-span-2">
              Dirección
              <input
                className={productFieldClassName}
                value={form.direccion}
                onChange={(e) => updateField("direccion", e.target.value)}
                placeholder=""
                disabled={saving}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingId !== null || form.nombre.trim() ? (
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
                "Registrar proveedor"
              )}
            </Button>
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

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base font-semibold text-[var(--text-main)]">
              Listado de proveedores
            </h3>
            <AdminSearchField
              value={search}
              onChange={setSearch}
              wrapperClassName="w-full lg:max-w-xs"
            />
          </div>

          <p className="text-sm text-[var(--text-muted)]">
            {processedRows.length} resultado{processedRows.length === 1 ? "" : "s"}
          </p>
        </CardHeader>

        <CardContent className="w-full min-w-0 max-w-full pb-2">
          {processedRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              {search.trim() ? "Sin coincidencias." : "Sin registros."}
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <Table
                className="min-w-0"
                style={{
                  width: "100%",
                  minWidth: `${SUPPLIERS_TABLE_MIN_WIDTH}px`,
                }}
              >
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "12%" }} />
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
                    <TableHead className="hidden text-[var(--brand-900)] lg:table-cell">
                      Origen
                    </TableHead>
                    <TableHead className="hidden text-[var(--brand-900)] md:table-cell">
                      <AdminTableSortHeader
                        column="encargado"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        Encargado
                      </AdminTableSortHeader>
                    </TableHead>
                    <TableHead className="hidden text-[var(--brand-900)] xl:table-cell">
                      Repartidor
                    </TableHead>
                    <TableHead className="hidden text-[var(--brand-900)] lg:table-cell">
                      Dirección
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
                      <TableCell className="max-w-[200px] font-medium text-[var(--text-main)]">
                        <div className="truncate" title={row.nombre}>
                          {row.nombre}
                        </div>
                        <div className="mt-1 lg:hidden">
                          {row.source === "catalog" ? (
                            <Badge variant="violet">Catálogo</Badge>
                          ) : (
                            <Badge variant="amber">Producto</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {row.source === "catalog" ? (
                          <Badge variant="violet">Catálogo</Badge>
                        ) : (
                          <Badge variant="amber">Producto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-[140px] text-[var(--text-muted)] md:table-cell">
                        {row.source === "catalog" ? row.encargado : "—"}
                      </TableCell>
                      <TableCell className="hidden max-w-[140px] text-[var(--text-muted)] xl:table-cell">
                        {row.source === "catalog" ? row.repartidor : "—"}
                      </TableCell>
                      <TableCell className="hidden max-w-[180px] text-[var(--text-muted)] lg:table-cell">
                        <span className="line-clamp-2" title={row.direccion}>
                          {row.source === "catalog" ? row.direccion : "—"}
                        </span>
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
                              <DropdownMenuItem onSelect={() => startCompleteFromProduct(row)}>
                                <UserPlus className="size-4" />
                                Completar
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
        title="Eliminar proveedor"
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
