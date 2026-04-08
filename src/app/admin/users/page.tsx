"use client";

import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Download,
  EyeOff,
  FileSearch,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Plus,
  ShieldCheck,
  TableProperties,
  Trash2,
  UserCog,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type AdminUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserRole,
} from "@/services/admin";

import {
  getPaginationWindow,
  type SortDirection,
} from "../lib/admin-list-utils";
import { useAdminDataBootstrap } from "../hooks/use-admin-data-bootstrap";
import { useClampPage, useResetPageOnChange } from "../hooks/use-admin-pagination";
import { cn } from "../lib/utils";
import { AdminFilterTabs } from "../components/admin-filter-tabs";
import { AdminPageLoading } from "../components/admin-page-loading";
import { AdminSearchField } from "../components/admin-search-field";
import { AdminTablePaginationNumbered } from "../components/admin-table-pagination-numbered";
import { AdminTableSortHeader } from "../components/admin-table-sort-header";
import { PageHeader } from "../components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { AdminUserAvatar } from "../components/admin-user-avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";

const USERS_PAGE_SIZE = 8;

type QuickFilter = "ALL" | "ACTIVE" | "INACTIVE" | "UNVERIFIED";
type SortValue = string | number | boolean;

type AdvancedFilters = {
  role: "ALL" | UserRole;
  verification: "ALL" | "VERIFIED" | "PENDING";
  hasPhone: "ALL" | "WITH" | "WITHOUT";
  hasAddress: "ALL" | "WITH" | "WITHOUT";
  createdFrom: string;
  createdTo: string;
};

type UserFormState = {
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  rol: UserRole;
  activo: boolean;
  password: string;
};

type ColumnId =
  | "id"
  | "usuario"
  | "rol"
  | "estado"
  | "verificacion"
  | "telefono"
  | "direccion"
  | "fechaAlta";

type ColumnDefinition = {
  id: ColumnId;
  label: string;
  width?: number;
  sortable: boolean;
  getSortValue: (user: AdminUser) => SortValue;
  render: (user: AdminUser) => ReactNode;
  exportValue: (user: AdminUser) => string;
};

type SortState = {
  column: ColumnId;
  direction: SortDirection;
};

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVE", label: "Activos" },
  { id: "INACTIVE", label: "Inactivos" },
  { id: "UNVERIFIED", label: "Pendientes" },
];

const EMPTY_USER_FORM: UserFormState = {
  nombre: "",
  correo: "",
  telefono: "",
  direccion: "",
  rol: "CLIENT",
  activo: true,
  password: "",
};

const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  role: "ALL",
  verification: "ALL",
  hasPhone: "ALL",
  hasAddress: "ALL",
  createdFrom: "",
  createdTo: "",
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnId, boolean> = {
  id: false,
  usuario: true,
  rol: true,
  estado: true,
  verificacion: true,
  telefono: false,
  direccion: false,
  fechaAlta: true,
};

const COLUMN_WIDTHS: Record<ColumnId, number> = {
  id: 96,
  usuario: 320,
  rol: 150,
  estado: 150,
  verificacion: 170,
  telefono: 180,
  direccion: 280,
  fechaAlta: 170,
};

const DEFAULT_SORT_STATE: SortState = {
  column: "fechaAlta",
  direction: "desc",
};

const fieldClassName =
  "h-11 rounded-md border border-[var(--border-soft)] bg-[var(--card)] px-3 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-600)_18%,transparent)]";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(date?: string) {
  if (!date) return "Sin fecha";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function getRoleLabel(role: UserRole) {
  return role === "ADMIN" ? "Admin" : "Cliente";
}

function getRoleBadgeVariant(role: UserRole) {
  return role === "ADMIN" ? "violet" : "blue";
}

function getStatusLabel(active: boolean) {
  return active ? "Activo" : "Inactivo";
}

function buildUserPayload(form: UserFormState, editingId: number | null) {
  if (editingId) {
    const updatePayload: UpdateUserPayload = {
      nombre: form.nombre.trim(),
      correo: form.correo.trim().toLowerCase(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      rol: form.rol,
      activo: form.activo,
    };

    if (form.password.trim()) {
      updatePayload.password = form.password.trim();
    }

    return updatePayload;
  }

  return {
    nombre: form.nombre.trim(),
    correo: form.correo.trim().toLowerCase(),
    telefono: form.telefono.trim(),
    direccion: form.direccion.trim(),
    rol: form.rol,
    activo: form.activo,
    password: form.password.trim(),
  } satisfies CreateUserPayload;
}

function compareSortValues(first: SortValue, second: SortValue) {
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

function getDefaultSortDirection(column: ColumnId): SortDirection {
  return column === "fechaAlta" || column === "id" ? "desc" : "asc";
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function withinCreatedRange(user: AdminUser, filters: AdvancedFilters) {
  if (!filters.createdFrom && !filters.createdTo) return true;
  if (!user.createdAt) return false;

  const createdAt = new Date(user.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  if (filters.createdFrom) {
    const start = new Date(`${filters.createdFrom}T00:00:00`);
    if (createdAt < start) return false;
  }

  if (filters.createdTo) {
    const end = new Date(`${filters.createdTo}T23:59:59.999`);
    if (createdAt > end) return false;
  }

  return true;
}

function getProcessedUsers(
  users: AdminUser[],
  search: string,
  quickFilter: QuickFilter,
  advancedFilters: AdvancedFilters,
  sortState: SortState,
  columnDefinitions: ColumnDefinition[],
) {
  const query = search.trim().toLowerCase();

  return [...users]
    .filter((item) => {
      const matchesQuery =
        !query ||
        [
          item.nombre,
          item.correo,
          item.telefono ?? "",
          item.direccion ?? "",
          item.rol,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesQuickFilter =
        quickFilter === "ALL" ||
        (quickFilter === "ACTIVE" && item.activo) ||
        (quickFilter === "INACTIVE" && !item.activo) ||
        (quickFilter === "UNVERIFIED" && !item.emailVerified);

      const matchesRole =
        advancedFilters.role === "ALL" || item.rol === advancedFilters.role;
      const matchesVerification =
        advancedFilters.verification === "ALL" ||
        (advancedFilters.verification === "VERIFIED"
          ? item.emailVerified
          : !item.emailVerified);
      const matchesPhone =
        advancedFilters.hasPhone === "ALL" ||
        (advancedFilters.hasPhone === "WITH"
          ? Boolean(item.telefono?.trim())
          : !item.telefono?.trim());
      const matchesAddress =
        advancedFilters.hasAddress === "ALL" ||
        (advancedFilters.hasAddress === "WITH"
          ? Boolean(item.direccion?.trim())
          : !item.direccion?.trim());

      return (
        matchesQuery &&
        matchesQuickFilter &&
        matchesRole &&
        matchesVerification &&
        matchesPhone &&
        matchesAddress &&
        withinCreatedRange(item, advancedFilters)
      );
    })
    .sort((first, second) => {
      const selectedColumn = columnDefinitions.find(
        (column) => column.id === sortState.column,
      );
      if (!selectedColumn) return 0;

      const result = compareSortValues(
        selectedColumn.getSortValue(first),
        selectedColumn.getSortValue(second),
      );

      return sortState.direction === "asc" ? result : result * -1;
    });
}

function getColumnDefinitions(): ColumnDefinition[] {
  return [
    {
      id: "id",
      label: "ID",
      width: 96,
      sortable: true,
      getSortValue: (user) => user.id,
      render: (user) => <span className="text-sm text-[var(--text-muted)]">#{user.id}</span>,
      exportValue: (user) => String(user.id),
    },
    {
      id: "usuario",
      label: "Usuario",
      width: 320,
      sortable: true,
      getSortValue: (user) => user.nombre,
      render: (user) => (
        <div className="flex items-center gap-3">
          <AdminUserAvatar
            initials={getInitials(user.nombre)}
            className="size-10 border border-[var(--border-soft)]"
            fallbackClassName="text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-main)]">
              {user.nombre}
            </p>
            <p className="truncate text-sm text-[var(--text-muted)]">{user.correo}</p>
          </div>
        </div>
      ),
      exportValue: (user) => `${user.nombre} <${user.correo}>`,
    },
    {
      id: "rol",
      label: "Rol",
      width: 150,
      sortable: true,
      getSortValue: (user) => getRoleLabel(user.rol),
      render: (user) => (
        <Badge variant={getRoleBadgeVariant(user.rol)}>
          {getRoleLabel(user.rol)}
        </Badge>
      ),
      exportValue: (user) => getRoleLabel(user.rol),
    },
    {
      id: "estado",
      label: "Estado",
      width: 150,
      sortable: true,
      getSortValue: (user) => (user.activo ? 1 : 0),
      render: (user) => (
        <Badge variant={user.activo ? "emerald" : "slate"}>
          {getStatusLabel(user.activo)}
        </Badge>
      ),
      exportValue: (user) => getStatusLabel(user.activo),
    },
    {
      id: "verificacion",
      label: "Verificación",
      sortable: true,
      getSortValue: (user) => (user.emailVerified ? 1 : 0),
      render: (user) => (
        <Badge variant={user.emailVerified ? "blue" : "amber"}>
          {user.emailVerified ? "Verificado" : "Pendiente"}
        </Badge>
      ),
      exportValue: (user) => (user.emailVerified ? "Verificado" : "Pendiente"),
    },
    {
      id: "telefono",
      label: "Teléfono",
      sortable: true,
      getSortValue: (user) => user.telefono ?? "",
      render: (user) => (
        <span className="text-sm text-[var(--text-main)]">{user.telefono || "Sin teléfono"}</span>
      ),
      exportValue: (user) => user.telefono || "Sin teléfono",
    },
    {
      id: "direccion",
      label: "Dirección",
      sortable: true,
      getSortValue: (user) => user.direccion ?? "",
      render: (user) => (
        <span className="text-sm text-[var(--text-main)]">
          {user.direccion || "Sin dirección"}
        </span>
      ),
      exportValue: (user) => user.direccion || "Sin dirección",
    },
    {
      id: "fechaAlta",
      label: "Fecha alta",
      sortable: true,
      getSortValue: (user) => new Date(user.createdAt ?? 0).getTime(),
      render: (user) => (
        <span className="text-sm text-[var(--text-muted)]">{formatDate(user.createdAt)}</span>
      ),
      exportValue: (user) => formatDate(user.createdAt),
    },
  ];
}

export default function UsersPage() {
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnId, boolean>>(
    DEFAULT_VISIBLE_COLUMNS,
  );
  const [exportColumns, setExportColumns] = useState<Record<ColumnId, boolean>>(
    DEFAULT_VISIBLE_COLUMNS,
  );
  const [advancedFilters, setAdvancedFilters] =
    useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [draftAdvancedFilters, setDraftAdvancedFilters] =
    useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [draftExportFilters, setDraftExportFilters] =
    useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [draftExportColumns, setDraftExportColumns] =
    useState<Record<ColumnId, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);

  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    const response = await listUsers();
    setUsers(response.users);
  }, []);

  const { user, blockingFullPage } = useAdminDataBootstrap({
    load: loadUsers,
    loadErrorFallback: "No se pudieron cargar los usuarios",
  });

  const columnDefinitions = useMemo(() => getColumnDefinitions(), []);

  const quickFilterCounts = useMemo(
    () => ({
      ALL: users.length,
      ACTIVE: users.filter((item) => item.activo).length,
      INACTIVE: users.filter((item) => !item.activo).length,
      UNVERIFIED: users.filter((item) => !item.emailVerified).length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    return getProcessedUsers(
      users,
      search,
      quickFilter,
      advancedFilters,
      sortState,
      columnDefinitions,
    );
  }, [advancedFilters, columnDefinitions, quickFilter, search, sortState, users]);

  const visibleColumnDefinitions = useMemo(
    () => columnDefinitions.filter((column) => visibleColumns[column.id]),
    [columnDefinitions, visibleColumns],
  );

  const draftExportColumnDefinitions = useMemo(
    () => columnDefinitions.filter((column) => draftExportColumns[column.id]),
    [columnDefinitions, draftExportColumns],
  );

  const exportPreviewUsers = useMemo(
    () =>
      getProcessedUsers(
        users,
        search,
        quickFilter,
        draftExportFilters,
        sortState,
        columnDefinitions,
      ),
    [columnDefinitions, draftExportFilters, quickFilter, search, sortState, users],
  );

  const tableMinWidth = useMemo(() => {
    const columnsWidth = visibleColumnDefinitions.reduce(
      (total, column) => total + (COLUMN_WIDTHS[column.id] ?? 180),
      0,
    );
    const actionCol = 104;
    const floor = 360;
    return Math.max(floor, columnsWidth + actionCol);
  }, [visibleColumnDefinitions]);

  const userTableColPercents = useMemo(() => {
    const actionW = 104;
    const dataTotal = visibleColumnDefinitions.reduce(
      (s, col) => s + (COLUMN_WIDTHS[col.id] ?? 180),
      0,
    );
    const total = dataTotal + actionW;
    if (total <= 0) {
      return { columns: [] as { id: ColumnId; percent: string }[], action: "10%" };
    }
    return {
      columns: visibleColumnDefinitions.map((column) => ({
        id: column.id,
        percent: `${(((COLUMN_WIDTHS[column.id] ?? 180) / total) * 100).toFixed(3)}%`,
      })),
      action: `${((actionW / total) * 100).toFixed(3)}%`,
    };
  }, [visibleColumnDefinitions]);

  const activeAdvancedFilters = useMemo(() => {
    const items: string[] = [];

    if (advancedFilters.role !== "ALL") {
      items.push(`Rol: ${getRoleLabel(advancedFilters.role)}`);
    }

    if (advancedFilters.verification !== "ALL") {
      items.push(
        advancedFilters.verification === "VERIFIED"
          ? "Solo verificados"
          : "Solo pendientes",
      );
    }

    if (advancedFilters.hasPhone !== "ALL") {
      items.push(
        advancedFilters.hasPhone === "WITH" ? "Con teléfono" : "Sin teléfono",
      );
    }

    if (advancedFilters.hasAddress !== "ALL") {
      items.push(
        advancedFilters.hasAddress === "WITH" ? "Con dirección" : "Sin dirección",
      );
    }

    if (advancedFilters.createdFrom) {
      items.push(`Desde ${advancedFilters.createdFrom}`);
    }

    if (advancedFilters.createdTo) {
      items.push(`Hasta ${advancedFilters.createdTo}`);
    }

    return items;
  }, [advancedFilters]);

  const { totalPages, resultStart, resultEnd } = getPaginationWindow(
    page,
    USERS_PAGE_SIZE,
    filteredUsers.length,
  );

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, page]);

  useClampPage(page, setPage, totalPages);
  useResetPageOnChange(setPage, [advancedFilters, quickFilter, search]);

  const resetForm = () => {
    setEditingUser(null);
    setForm(EMPTY_USER_FORM);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (selectedUser: AdminUser) => {
    setEditingUser(selectedUser);
    setForm({
      nombre: selectedUser.nombre,
      correo: selectedUser.correo,
      telefono: selectedUser.telefono ?? "",
      direccion: selectedUser.direccion ?? "",
      rol: selectedUser.rol,
      activo: selectedUser.activo,
      password: "",
    });
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSortChange = (columnId: ColumnId) => {
    setSortState((current) => {
      if (current.column === columnId) {
        return {
          column: columnId,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        column: columnId,
        direction: getDefaultSortDirection(columnId),
      };
    });
  };

  const toggleColumnVisibility = (columnId: ColumnId, checked: boolean) => {
    if (!checked && visibleColumnDefinitions.length === 1 && visibleColumns[columnId]) {
      toast.error("Debes mantener al menos una columna visible");
      return;
    }

    setVisibleColumns((current) => ({
      ...current,
      [columnId]: checked,
    }));
  };

  const resetVisibleColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  };

  const openExportDialog = () => {
    setDraftExportFilters(advancedFilters);
    setDraftExportColumns(exportColumns);
    setExportDialogOpen(true);
  };

  const toggleDraftExportColumn = (columnId: ColumnId, checked: boolean) => {
    if (
      !checked &&
      draftExportColumnDefinitions.length === 1 &&
      draftExportColumns[columnId]
    ) {
      toast.error("Debes mantener al menos un campo para exportar");
      return;
    }

    setDraftExportColumns((current) => ({
      ...current,
      [columnId]: checked,
    }));
  };

  const resetDraftExportColumns = () => {
    setDraftExportColumns(DEFAULT_VISIBLE_COLUMNS);
  };

  const syncDraftExportColumnsWithVisible = () => {
    setDraftExportColumns(visibleColumns);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
    setDraftAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
  };

  const applyAdvancedFilters = () => {
    setAdvancedFilters(draftAdvancedFilters);
    setFiltersMenuOpen(false);
  };

  const handleExport = () => {
    if (exportPreviewUsers.length === 0) {
      toast.error("No hay usuarios para exportar con los filtros actuales");
      return;
    }

    if (draftExportColumnDefinitions.length === 0) {
      toast.error("Selecciona al menos un campo para exportar");
      return;
    }

    const headers = draftExportColumnDefinitions.map((column) => escapeCsvValue(column.label));
    const rows = exportPreviewUsers.map((item) =>
      draftExportColumnDefinitions
        .map((column) => escapeCsvValue(column.exportValue(item)))
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setAdvancedFilters(draftExportFilters);
    setExportColumns(draftExportColumns);
    setExportDialogOpen(false);
    toast.success("Exportación generada correctamente");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (!form.correo.trim()) {
      toast.error("El correo es obligatorio");
      return;
    }

    if (!editingUser && !form.password.trim()) {
      toast.error("La contrasena es obligatoria para crear un usuario");
      return;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      toast.error("La contrasena debe tener al menos 6 caracteres");
      return;
    }

    try {
      setSaving(true);
      const payload = buildUserPayload(form, editingUser?.id ?? null);

      if (editingUser) {
        const response = await updateUser(editingUser.id, payload);
        setUsers((current) =>
          current.map((item) => (item.id === editingUser.id ? response.user : item)),
        );
        toast.success(response.message || "Usuario actualizado correctamente");
      } else {
        const response = await createUser(payload as CreateUserPayload);
        setUsers((current) => [response.user, ...current]);
        setPage(1);
        toast.success(response.message || "Usuario creado correctamente");
      }

      handleDialogOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el usuario";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (selectedUser: AdminUser) => {
    const nextStatus = !selectedUser.activo;

    try {
      setSaving(true);
      const response = await updateUser(selectedUser.id, { activo: nextStatus });
      setUsers((current) =>
        current.map((item) => (item.id === selectedUser.id ? response.user : item)),
      );
      toast.success(
        response.message ||
          `Usuario ${nextStatus ? "activado" : "desactivado"} correctamente`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el estado";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setSaving(true);
      const response = await deleteUser(userToDelete.id);
      setUsers((current) => current.filter((item) => item.id !== userToDelete.id));
      setUserToDelete(null);
      toast.success(response.message || "Usuario eliminado correctamente");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el usuario";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (blockingFullPage) {
    return <AdminPageLoading layout="viewport" />;
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Administra cuentas, roles y el estado de acceso de cada usuario desde un solo lugar."
      />

      <Card className="w-full min-w-0 max-w-full rounded-xl border-[var(--border-soft)] shadow-sm">
        <CardHeader className="min-w-0 gap-5 border-b border-[var(--border-soft)] bg-[var(--card)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <AdminFilterTabs
              tabs={QUICK_FILTERS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count: quickFilterCounts[tab.id],
              }))}
              activeId={quickFilter}
              onChange={setQuickFilter}
            />

            <Button
              type="button"
              onClick={openCreateDialog}
              className="h-11 rounded-md px-4 shadow-none"
            >
              <Plus className="size-4" />
              Nuevo usuario
            </Button>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Buscar usuarios..."
              wrapperClassName="w-full xl:max-w-md"
            />

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu
                open={filtersMenuOpen}
                onOpenChange={(open) => {
                  setFiltersMenuOpen(open);
                  if (open) {
                    setDraftAdvancedFilters(advancedFilters);
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
                  className="w-[min(420px,calc(100vw-1.5rem))] rounded-lg border-[var(--border-soft)] bg-[var(--card)] p-0 shadow-[var(--shadow-md)]"
                >
                  <div className="grid gap-4 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Rol
                        <select
                          className={fieldClassName}
                          value={draftAdvancedFilters.role}
                          onChange={(event) =>
                            setDraftAdvancedFilters((current) => ({
                              ...current,
                              role: event.target.value as AdvancedFilters["role"],
                            }))
                          }
                        >
                          <option value="ALL">Todos</option>
                          <option value="ADMIN">Admin</option>
                          <option value="CLIENT">Cliente</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Verificación
                        <select
                          className={fieldClassName}
                          value={draftAdvancedFilters.verification}
                          onChange={(event) =>
                            setDraftAdvancedFilters((current) => ({
                              ...current,
                              verification:
                                event.target.value as AdvancedFilters["verification"],
                            }))
                          }
                        >
                          <option value="ALL">Todas</option>
                          <option value="VERIFIED">Verificados</option>
                          <option value="PENDING">Pendientes</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Teléfono
                        <select
                          className={fieldClassName}
                          value={draftAdvancedFilters.hasPhone}
                          onChange={(event) =>
                            setDraftAdvancedFilters((current) => ({
                              ...current,
                              hasPhone: event.target.value as AdvancedFilters["hasPhone"],
                            }))
                          }
                        >
                          <option value="ALL">Todos</option>
                          <option value="WITH">Con teléfono</option>
                          <option value="WITHOUT">Sin teléfono</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Dirección
                        <select
                          className={fieldClassName}
                          value={draftAdvancedFilters.hasAddress}
                          onChange={(event) =>
                            setDraftAdvancedFilters((current) => ({
                              ...current,
                              hasAddress: event.target.value as AdvancedFilters["hasAddress"],
                            }))
                          }
                        >
                          <option value="ALL">Todos</option>
                          <option value="WITH">Con dirección</option>
                          <option value="WITHOUT">Sin dirección</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Fecha alta desde
                        <input
                          type="date"
                          className={fieldClassName}
                          value={draftAdvancedFilters.createdFrom}
                          onChange={(event) =>
                            setDraftAdvancedFilters((current) => ({
                              ...current,
                              createdFrom: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                        Fecha alta hasta
                        <input
                          type="date"
                          className={fieldClassName}
                          value={draftAdvancedFilters.createdTo}
                          onChange={(event) =>
                            setDraftAdvancedFilters((current) => ({
                              ...current,
                              createdTo: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDraftAdvancedFilters(DEFAULT_ADVANCED_FILTERS)}
                        className="rounded-md"
                      >
                        Limpiar
                      </Button>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFiltersMenuOpen(false)}
                          className="rounded-md"
                        >
                          Cerrar
                        </Button>
                        <Button type="button" onClick={applyAdvancedFilters} className="rounded-md">
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
                  {columnDefinitions.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={visibleColumns[column.id]}
                      onCheckedChange={(checked) =>
                        toggleColumnVisibility(column.id, checked === true)
                      }
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={resetVisibleColumns}>
                    <EyeOff className="size-4" />
                    Restaurar columnas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                onClick={openExportDialog}
                className="h-11 rounded-md border-[var(--border-soft)] bg-[var(--card)] px-4 text-[var(--brand-800)] shadow-none hover:bg-[var(--surface)]"
              >
                <Download className="size-4" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <UserCog className="size-4" />
              {filteredUsers.length} resultado{filteredUsers.length === 1 ? "" : "s"}
              {search.trim() ? ` para "${search.trim()}"` : ""}
            </div>

            {activeAdvancedFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                <span>Filtros:</span>
                {activeAdvancedFilters.map((item) => (
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
                  onClick={clearAdvancedFilters}
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
          <div className="w-full min-w-0 overflow-x-auto">
          <Table
            className="min-w-0"
            style={{
              width: "100%",
              minWidth: `${tableMinWidth}px`,
            }}
          >
            <colgroup>
              {userTableColPercents.columns.map(({ id, percent }) => (
                <col key={id} style={{ width: percent }} />
              ))}
              <col style={{ width: userTableColPercents.action }} />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-[color-mix(in_srgb,var(--brand-700)_24%,var(--border-soft))] bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--brand-700)_18%,var(--surface))]">
                {visibleColumnDefinitions.map((column) => (
                  <TableHead key={column.id} className="whitespace-nowrap text-[var(--brand-900)]">
                    {column.sortable ? (
                      <AdminTableSortHeader
                        column={column.id}
                        activeColumn={sortState.column}
                        direction={sortState.direction}
                        onSort={handleSortChange}
                        className="min-h-0 transition hover:bg-[color-mix(in_srgb,var(--brand-700)_14%,var(--card))] hover:text-[var(--brand-700)]"
                      >
                        {column.label}
                      </AdminTableSortHeader>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-[88px] whitespace-nowrap text-right text-[var(--brand-900)]">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnDefinitions.length + 1} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <UserRound className="size-5 text-[var(--text-muted)]" />
                      <p className="text-sm font-medium text-[var(--text-main)]">
                        No hay usuarios para mostrar
                      </p>
                      <p className="max-w-md text-sm text-[var(--text-muted)]">
                        Ajusta la búsqueda, cambia los tabs o aplica filtros para encontrar usuarios.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((item) => {
                  const isCurrentUser = user?.id === item.id;

                  return (
                    <TableRow key={item.id}>
                      {visibleColumnDefinitions.map((column) => (
                        <TableCell key={column.id}>{column.render(item)}</TableCell>
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
                                  aria-label={`Acciones para ${item.nombre}`}
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
                            <DropdownMenuItem onSelect={() => openEditDialog(item)}>
                              <PencilLine className="size-4" />
                              Editar perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isCurrentUser}
                              onSelect={() => void handleToggleActive(item)}
                            >
                              <ShieldCheck className="size-4" />
                              {item.activo ? "Marcar inactivo" : "Marcar activo"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={isCurrentUser}
                              onSelect={() => setUserToDelete(item)}
                            >
                              <Trash2 className="size-4" />
                              Eliminar usuario
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>

      <CardFooter className="flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--card)] md:items-stretch lg:flex-row lg:items-center lg:justify-between">
          <AdminTablePaginationNumbered
            resultStart={resultStart}
            resultEnd={resultEnd}
            totalCount={filteredUsers.length}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </CardFooter>
      </Card>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="w-[min(980px,calc(100vw-1.5rem))]">
          <DialogHeader>
            <DialogTitle>Exportar usuarios</DialogTitle>
            <DialogDescription>
              Ajusta filtros, selecciona campos y exporta el resultado a CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-900)]">Filtros de exportación</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Usa la búsqueda actual y el tab seleccionado; aquí puedes afinar filtros adicionales.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                    Rol
                    <select
                      className={fieldClassName}
                      value={draftExportFilters.role}
                      onChange={(event) =>
                        setDraftExportFilters((current) => ({
                          ...current,
                          role: event.target.value as AdvancedFilters["role"],
                        }))
                      }
                    >
                      <option value="ALL">Todos</option>
                      <option value="ADMIN">Admin</option>
                      <option value="CLIENT">Cliente</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                    Verificación
                    <select
                      className={fieldClassName}
                      value={draftExportFilters.verification}
                      onChange={(event) =>
                        setDraftExportFilters((current) => ({
                          ...current,
                          verification: event.target.value as AdvancedFilters["verification"],
                        }))
                      }
                    >
                      <option value="ALL">Todas</option>
                      <option value="VERIFIED">Verificados</option>
                      <option value="PENDING">Pendientes</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                    Teléfono
                    <select
                      className={fieldClassName}
                      value={draftExportFilters.hasPhone}
                      onChange={(event) =>
                        setDraftExportFilters((current) => ({
                          ...current,
                          hasPhone: event.target.value as AdvancedFilters["hasPhone"],
                        }))
                      }
                    >
                      <option value="ALL">Todos</option>
                      <option value="WITH">Con teléfono</option>
                      <option value="WITHOUT">Sin teléfono</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                    Dirección
                    <select
                      className={fieldClassName}
                      value={draftExportFilters.hasAddress}
                      onChange={(event) =>
                        setDraftExportFilters((current) => ({
                          ...current,
                          hasAddress: event.target.value as AdvancedFilters["hasAddress"],
                        }))
                      }
                    >
                      <option value="ALL">Todos</option>
                      <option value="WITH">Con dirección</option>
                      <option value="WITHOUT">Sin dirección</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                    Fecha alta desde
                    <input
                      type="date"
                      className={fieldClassName}
                      value={draftExportFilters.createdFrom}
                      onChange={(event) =>
                        setDraftExportFilters((current) => ({
                          ...current,
                          createdFrom: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                    Fecha alta hasta
                    <input
                      type="date"
                      className={fieldClassName}
                      value={draftExportFilters.createdTo}
                      onChange={(event) =>
                        setDraftExportFilters((current) => ({
                          ...current,
                          createdTo: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-900)]">Campos a exportar</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Elige exactamente qué columnas quieres incluir en el archivo.
                  </p>
                </div>

                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-2">
                  {columnDefinitions.map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-main)] hover:bg-[var(--card)]"
                    >
                      <input
                        type="checkbox"
                        checked={draftExportColumns[column.id]}
                        onChange={(event) =>
                          toggleDraftExportColumn(column.id, event.target.checked)
                        }
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>

                <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
                  <p>
                    {exportPreviewUsers.length} resultado
                    {exportPreviewUsers.length === 1 ? "" : "s"} listos para exportar.
                  </p>
                  <p className="mt-2">
                    Campos seleccionados: {draftExportColumnDefinitions.length}
                  </p>
                  <p className="mt-2">
                    Tab actual: {QUICK_FILTERS.find((item) => item.id === quickFilter)?.label}
                  </p>
                  <p className="mt-2">Búsqueda actual: {search.trim() || "Sin búsqueda"}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraftExportFilters(DEFAULT_ADVANCED_FILTERS)}
                  className="rounded-md"
                >
                  Limpiar filtros
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={syncDraftExportColumnsWithVisible}
                  className="rounded-md"
                >
                  Usar columnas visibles
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDraftExportColumns}
                  className="rounded-md"
                >
                  Restaurar campos
                </Button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExportDialogOpen(false)}
                  className="rounded-md"
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleExport} className="rounded-md">
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[min(760px,calc(100vw-1.5rem))]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar usuario" : "Nuevo usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza los datos del perfil, el rol y el estado de acceso del usuario."
                : "Completa los datos básicos para registrar un nuevo usuario dentro del panel."}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                Nombre completo
                <input
                  className={fieldClassName}
                  value={form.nombre}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nombre: event.target.value }))
                  }
                  placeholder="Nombre del usuario"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                Correo electrónico
                <input
                  type="email"
                  className={fieldClassName}
                  value={form.correo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, correo: event.target.value }))
                  }
                  placeholder="correo@ejemplo.com"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                Teléfono
                <input
                  className={fieldClassName}
                  value={form.telefono}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, telefono: event.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                Rol
                <select
                  className={fieldClassName}
                  value={form.rol}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rol: event.target.value as UserRole,
                    }))
                  }
                >
                  <option value="CLIENT">Cliente</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)] md:col-span-2">
                Dirección
                <input
                  className={fieldClassName}
                  value={form.direccion}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, direccion: event.target.value }))
                  }
                  placeholder="Opcional"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                Estado de acceso
                <select
                  className={fieldClassName}
                  value={form.activo ? "active" : "inactive"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      activo: event.target.value === "active",
                    }))
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--text-main)]">
                {editingUser ? "Nueva contrasena (opcional)" : "Contrasena"}
                <input
                  type="password"
                  className={fieldClassName}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder={
                    editingUser ? "Dejar vacío para conservar la actual" : "Mínimo 6 caracteres"
                  }
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={saving}
                className="rounded-md"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="rounded-md">
                {saving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Guardando...
                  </>
                ) : editingUser ? (
                  "Guardar cambios"
                ) : (
                  "Crear usuario"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Seguro que deseas eliminar este usuario?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete
                ? `Se eliminará de forma permanente a ${userToDelete.nombre} y esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              onClick={() => setUserToDelete(null)}
              disabled={saving}
              className="rounded-md"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => void handleDeleteUser()}
              disabled={saving}
              className="rounded-md"
            >
              {saving ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
