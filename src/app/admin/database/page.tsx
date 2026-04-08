"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  Database,
  CalendarClock,
  Download,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerReset,
  Trash2,
  Users,
} from "lucide-react";

import { AdminPageLoading } from "../components/admin-page-loading";
import { AdminFilterTabs } from "../components/admin-filter-tabs";
import { AdminMetricCard } from "../components/admin-metric-card";
import { PageHeader } from "../components/page-header";
import { useAdminRouteGate } from "../hooks/use-admin-route-gate";
import { cn } from "../lib/utils";
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
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  type AuthSecurityOverview,
  type DatabaseBackupRecord,
  type DatabaseBackupSchedule,
  type DatabaseStatus,
  createDatabaseBackupRecord,
  createSingleTableDatabaseBackupRecord,
  deleteDatabaseBackupRecord,
  deleteDatabaseBackupSchedule,
  downloadDatabaseBackupById,
  getAuthSecurityOverview,
  getDatabaseBackupSchedule,
  getDatabaseStatus,
  listDatabaseBackups,
  updateDatabaseBackupSchedule,
} from "@/services/admin";

const BACKUP_PAGE_SIZE = 10;

const defaultScheduleForm = {
  enabled: false,
  everyDays: "1",
  runAtTime: "03:00",
  retentionDays: "7",
};

type ScheduleFormState = typeof defaultScheduleForm;
type MainTab = "monitoreo" | "seguridad" | "respaldos";

type PendingAction =
  | { kind: "delete-backup"; backup: DatabaseBackupRecord }
  | { kind: "delete-schedule" }
  | null;

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
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions,
  ) => Promise<SaveFilePickerHandle>;
};

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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin datos";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin datos";
  }

  return parsed.toLocaleString("es-MX");
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

function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "Sin actividad reciente";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin actividad reciente";
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

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Sin datos";
  }

  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

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
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

/** Igual que exampleadmin: intenta extraer la fecha del nombre del archivo .tar */
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

function normalizeDatabaseStatus(
  status: Partial<DatabaseStatus> | null | undefined,
): DatabaseStatus {
  const sizeBytes =
    typeof status?.sizeBytes === "number" && Number.isFinite(status.sizeBytes)
      ? status.sizeBytes
      : 0;

  const connections = status?.connections;
  const transactions = status?.transactions;
  const tables = status?.tables;
  const tableItems = Array.isArray(tables?.items) ? tables.items : [];
  const totalSizeBytes =
    typeof tables?.totalSizeBytes === "number" &&
    Number.isFinite(tables.totalSizeBytes)
      ? tables.totalSizeBytes
      : tableItems.reduce((sum, table) => {
          const tableSize =
            typeof table.sizeBytes === "number" && Number.isFinite(table.sizeBytes)
              ? table.sizeBytes
              : 0;
          return sum + tableSize;
        }, 0);

  return {
    checkedAt: typeof status?.checkedAt === "string" ? status.checkedAt : "",
    isOnline: Boolean(status?.isOnline),
    databaseName:
      typeof status?.databaseName === "string" ? status.databaseName : "",
    dbVersion: typeof status?.dbVersion === "string" ? status.dbVersion : "",
    uptimeSeconds:
      typeof status?.uptimeSeconds === "number" &&
      Number.isFinite(status.uptimeSeconds)
        ? status.uptimeSeconds
        : 0,
    sizeBytes,
    sizePretty:
      typeof status?.sizePretty === "string" && status.sizePretty.trim()
        ? status.sizePretty
        : formatBytes(sizeBytes),
    connections: {
      total:
        typeof connections?.total === "number" && Number.isFinite(connections.total)
          ? connections.total
          : 0,
      active:
        typeof connections?.active === "number" &&
        Number.isFinite(connections.active)
          ? connections.active
          : 0,
      idle:
        typeof connections?.idle === "number" && Number.isFinite(connections.idle)
          ? connections.idle
          : 0,
    },
    transactions: {
      commits:
        typeof transactions?.commits === "number" &&
        Number.isFinite(transactions.commits)
          ? transactions.commits
          : 0,
      rollbacks:
        typeof transactions?.rollbacks === "number" &&
        Number.isFinite(transactions.rollbacks)
          ? transactions.rollbacks
          : 0,
    },
    tables: {
      totalRows:
        typeof tables?.totalRows === "number" && Number.isFinite(tables.totalRows)
          ? tables.totalRows
          : tableItems.reduce((sum, table) => {
              const rowCount =
                typeof table.rowCount === "number" && Number.isFinite(table.rowCount)
                  ? table.rowCount
                  : 0;
              return sum + rowCount;
            }, 0),
      totalSizeBytes,
      totalSizePretty:
        typeof tables?.totalSizePretty === "string" && tables.totalSizePretty.trim()
          ? tables.totalSizePretty
          : formatBytes(totalSizeBytes),
      items: tableItems.map((table) => {
        const tableSize =
          typeof table.sizeBytes === "number" && Number.isFinite(table.sizeBytes)
            ? table.sizeBytes
            : 0;

        return {
          tableName:
            typeof table.tableName === "string" ? table.tableName : "unknown_table",
          rowCount:
            typeof table.rowCount === "number" && Number.isFinite(table.rowCount)
              ? table.rowCount
              : 0,
          sizeBytes: tableSize,
          sizePretty:
            typeof table.sizePretty === "string" && table.sizePretty.trim()
              ? table.sizePretty
              : formatBytes(tableSize),
        };
      }),
    },
    backup: {
      format:
        typeof status?.backup?.format === "string" && status.backup.format.trim()
          ? status.backup.format
          : "tar",
      fileExtension:
        typeof status?.backup?.fileExtension === "string" &&
        status.backup.fileExtension.trim()
          ? status.backup.fileExtension
          : "tar",
      provider:
        typeof status?.backup?.provider === "string" &&
        status.backup.provider.trim()
          ? status.backup.provider
          : undefined,
    },
  };
}

function toScheduleForm(
  schedule: DatabaseBackupSchedule | null,
): ScheduleFormState {
  if (!schedule) {
    return defaultScheduleForm;
  }

  return {
    enabled: schedule.enabled,
    everyDays: String(schedule.everyDays),
    runAtTime: schedule.runAtTime,
    retentionDays: String(schedule.retentionDays),
  };
}

function validateScheduleForm(form: ScheduleFormState) {
  const everyDays = Number(form.everyDays);
  const retentionDays = Number(form.retentionDays);

  if (!Number.isInteger(everyDays) || everyDays < 1 || everyDays > 365) {
    return "Cada cuántos días debe ser un número entero entre 1 y 365.";
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.runAtTime.trim())) {
    return "La hora debe tener formato HH:mm.";
  }

  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return "La retención debe ser un número entero entre 1 y 3650 días.";
  }

  return null;
}

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

export default function DatabaseMonitoringPage() {
  const { user, blockingFullPage } = useAdminRouteGate();

  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [securityOverview, setSecurityOverview] =
    useState<AuthSecurityOverview | null>(null);
  const [backupRecords, setBackupRecords] = useState<DatabaseBackupRecord[]>([]);
  const [backupSchedule, setBackupSchedule] =
    useState<DatabaseBackupSchedule | null>(null);
  const [scheduleForm, setScheduleForm] =
    useState<ScheduleFormState>(defaultScheduleForm);

  const [loadingDbStatus, setLoadingDbStatus] = useState(false);
  const [loadingBackupRecords, setLoadingBackupRecords] = useState(false);
  const [loadingBackupSchedule, setLoadingBackupSchedule] = useState(false);
  const [loadingAuthSecurityOverview, setLoadingAuthSecurityOverview] =
    useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedBackupTable, setSelectedBackupTable] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [backupPage, setBackupPage] = useState(1);
  const [generatingBackup, setGeneratingBackup] = useState(false);
  const [generatingTableBackup, setGeneratingTableBackup] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [downloadingBackupId, setDownloadingBackupId] = useState<number | null>(
    null,
  );
  const [deletingBackupId, setDeletingBackupId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const [allSessionsOpen, setAllSessionsOpen] = useState(false);
  const [allAuditOpen, setAllAuditOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("monitoreo");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [tableBackupDialogOpen, setTableBackupDialogOpen] = useState(false);
  const [databaseSummaryOpen, setDatabaseSummaryOpen] = useState(false);

  const loadDatabaseStats = useCallback(async () => {
    try {
      setLoadingDbStatus(true);
      const result = await getDatabaseStatus();
      setDbStatus(normalizeDatabaseStatus(result.status));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo consultar el estado de la base de datos.",
      );
    } finally {
      setLoadingDbStatus(false);
    }
  }, []);

  const loadAuthSecurityOverviewData = useCallback(async () => {
    try {
      setLoadingAuthSecurityOverview(true);
      const result = await getAuthSecurityOverview();
      setSecurityOverview(result.overview);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el resumen de seguridad.",
      );
    } finally {
      setLoadingAuthSecurityOverview(false);
    }
  }, []);

  const loadBackupRecordsData = useCallback(async () => {
    try {
      setLoadingBackupRecords(true);
      const result = await listDatabaseBackups();
      setBackupRecords(result.backups);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial de respaldos.",
      );
    } finally {
      setLoadingBackupRecords(false);
    }
  }, []);

  const loadBackupScheduleData = useCallback(async () => {
    try {
      setLoadingBackupSchedule(true);
      const result = await getDatabaseBackupSchedule();
      setBackupSchedule(result.schedule);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la programación de respaldos.",
      );
    } finally {
      setLoadingBackupSchedule(false);
    }
  }, []);

  const dbTableItems = useMemo(
    () => dbStatus?.tables.items ?? [],
    [dbStatus],
  );

  const heaviestDbTable = useMemo(() => {
    if (dbTableItems.length === 0) return null;
    return [...dbTableItems].reduce((a, b) =>
      b.sizeBytes > a.sizeBytes ? b : a,
    );
  }, [dbTableItems]);

  const securitySummary = securityOverview?.summary ?? null;
  const activeSessions = useMemo(
    () => securityOverview?.activeSessions ?? [],
    [securityOverview],
  );
  const loginAuditItems = useMemo(
    () => securityOverview?.loginAttempts ?? [],
    [securityOverview],
  );

  const visibleActiveSessions = useMemo(
    () => activeSessions.slice(0, 3),
    [activeSessions],
  );
  const visibleLoginAuditItems = useMemo(
    () => loginAuditItems.slice(0, 3),
    [loginAuditItems],
  );

  const filteredBackups = useMemo(
    () =>
      backupRecords.filter((backup) =>
        backup.fileName.toLowerCase().includes(historyQuery.trim().toLowerCase()),
      ),
    [backupRecords, historyQuery],
  );

  const totalBackupPages = Math.max(
    1,
    Math.ceil(filteredBackups.length / BACKUP_PAGE_SIZE),
  );
  const currentBackupPage = Math.min(backupPage, totalBackupPages);
  const paginatedBackups = useMemo(() => {
    const start = (currentBackupPage - 1) * BACKUP_PAGE_SIZE;
    return filteredBackups.slice(start, start + BACKUP_PAGE_SIZE);
  }, [currentBackupPage, filteredBackups]);

  useEffect(() => {
    setScheduleForm(toScheduleForm(backupSchedule));
  }, [backupSchedule]);

  useEffect(() => {
    if (dbTableItems.length === 0) {
      setSelectedBackupTable("");
      return;
    }
    const exists = dbTableItems.some((t) => t.tableName === selectedBackupTable);
    if (!exists) {
      setSelectedBackupTable(dbTableItems[0]?.tableName ?? "");
    }
  }, [dbTableItems, selectedBackupTable]);

  useEffect(() => {
    if (backupPage > totalBackupPages) {
      setBackupPage(totalBackupPages);
    }
  }, [backupPage, totalBackupPages]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function loadAll() {
      setInitialLoading(true);
      await Promise.allSettled([
        loadDatabaseStats(),
        loadAuthSecurityOverviewData(),
        loadBackupRecordsData(),
        loadBackupScheduleData(),
      ]);
      if (!cancelled) {
        setInitialLoading(false);
      }
    }

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loadDatabaseStats,
    loadAuthSecurityOverviewData,
    loadBackupRecordsData,
    loadBackupScheduleData,
  ]);

  const anyLoading =
    loadingAuthSecurityOverview ||
    loadingDbStatus ||
    loadingBackupRecords ||
    loadingBackupSchedule;

  async function refreshAllData() {
    if (!user) return;
    await Promise.all([
      loadDatabaseStats(),
      loadAuthSecurityOverviewData(),
      loadBackupRecordsData(),
      loadBackupScheduleData(),
    ]);
    toast.success("Datos actualizados.");
  }

  const syncScheduleFormWithCurrentRecord = useCallback((notify = false) => {
    if (!backupSchedule) {
      setScheduleForm(defaultScheduleForm);
      if (notify) {
        toast.success("Formulario restablecido al modo manual.");
      }
      return;
    }
    setScheduleForm({
      enabled: backupSchedule.enabled,
      everyDays: String(backupSchedule.everyDays),
      runAtTime: backupSchedule.runAtTime,
      retentionDays: String(backupSchedule.retentionDays),
    });
    if (!notify) {
      return;
    }
    toast.success("Registro de programación cargado para edición.");
  }, [backupSchedule]);

  const openScheduleDialog = useCallback(() => {
    syncScheduleFormWithCurrentRecord(false);
    setScheduleDialogOpen(true);
  }, [syncScheduleFormWithCurrentRecord]);

  async function generateBackup() {
    if (!user) return;

    try {
      setGeneratingBackup(true);
      const result = await createDatabaseBackupRecord();
      setBackupRecords((current) => [result.backup, ...current]);
      setBackupPage(1);
      toast.success(`Respaldo creado: ${result.backup.fileName}`);
      await loadDatabaseStats();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo completo.",
      );
    } finally {
      setGeneratingBackup(false);
    }
  }

  async function generateSingleTableBackup() {
    if (!user) return;

    if (!selectedBackupTable) {
      toast.error("Selecciona una tabla para generar el respaldo.");
      return;
    }

    try {
      setGeneratingTableBackup(true);
      const result =
        await createSingleTableDatabaseBackupRecord(selectedBackupTable);
      setBackupRecords((current) => [result.backup, ...current]);
      setBackupPage(1);
      toast.success(`Respaldo de tabla creado: ${result.backup.fileName}`);
      await loadDatabaseStats();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar el respaldo de la tabla seleccionada.",
      );
    } finally {
      setGeneratingTableBackup(false);
    }
  }

  async function downloadBackupRecord(backup: DatabaseBackupRecord) {
    if (!user) return;

    try {
      setDownloadingBackupId(backup.id);
      const download = await downloadDatabaseBackupById(backup.id);
      const saved = await saveBlobAsFile(download.blob, download.fileName);

      if (!saved) {
        toast.error("Descarga cancelada.");
        return;
      }

      toast.success(`Respaldo descargado: ${download.fileName}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el respaldo.",
      );
    } finally {
      setDownloadingBackupId(null);
    }
  }

  async function saveSchedule() {
    if (!user) return;

    const validationError = validateScheduleForm(scheduleForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSavingSchedule(true);
      const result = await updateDatabaseBackupSchedule({
        enabled: scheduleForm.enabled,
        everyDays: Number(scheduleForm.everyDays),
        runAtTime: scheduleForm.runAtTime.trim(),
        retentionDays: Number(scheduleForm.retentionDays),
      });
      setBackupSchedule(result.schedule);
      toast.success(
        result.message ||
          "La programación automática de respaldos se actualizó correctamente.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la programación automática.",
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  async function executePendingAction() {
    if (!user || !pendingAction) return;

    if (pendingAction.kind === "delete-backup") {
      try {
        setDeletingBackupId(pendingAction.backup.id);
        const result = await deleteDatabaseBackupRecord(pendingAction.backup.id);
        setBackupRecords((current) =>
          current.filter((item) => item.id !== pendingAction.backup.id),
        );
        toast.success(
          result.message ||
            `Respaldo eliminado: ${pendingAction.backup.fileName}`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el respaldo.",
        );
      } finally {
        setDeletingBackupId(null);
        setPendingAction(null);
      }

      return;
    }

    try {
      setSavingSchedule(true);
      const result = await deleteDatabaseBackupSchedule();
      setBackupSchedule(result.schedule);
      toast.success(
        result.message || "La programación automática fue eliminada.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la programación automática.",
      );
    } finally {
      setSavingSchedule(false);
      setPendingAction(null);
    }
  }

  if (blockingFullPage) {
    return <AdminPageLoading layout="viewport" />;
  }

  if (initialLoading) {
    return <AdminPageLoading layout="section" />;
  }

  const pendingTitle =
    pendingAction?.kind === "delete-backup"
      ? "Eliminar respaldo"
      : "Eliminar programación automática";

  const pendingDescription =
    pendingAction?.kind === "delete-backup"
      ? `Se eliminará el archivo "${pendingAction.backup.fileName}" y su registro del historial.`
      : "Se restablecerá la programación a modo manual. Podrás crear una nueva configuración cuando quieras.";

  return (
    <>
      <PageHeader
        title="Monitoreo de Base de Datos"
        subtitle="Misma funcionalidad que el panel de referencia: estado de la instancia, tablas, seguridad, respaldos manuales y programación automática."
      />

      <div className="flex flex-col gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            context="database-online"
            label="Estado de la base"
            value={dbStatus?.isOnline ? "En línea" : "Sin respuesta"}
            helper={dbStatus?.dbVersion || "Versión no disponible"}
          />
          <AdminMetricCard
            context="database-connections"
            label="Conexiones activas"
            value={`${formatNumber(dbStatus?.connections.active ?? 0)} / ${formatNumber(
              dbStatus?.connections.total ?? 0,
            )}`}
            helper="Resumen de uso de conexiones"
          />
          <AdminMetricCard
            context="database-tables"
            label="Tablas detectadas"
            value={formatNumber(dbTableItems.length)}
            helper={`${formatNumber(dbStatus?.tables.totalRows ?? 0)} registros estimados`}
          />
          <AdminMetricCard
            context="database-alerts"
            label="Intentos fallidos"
            value={formatNumber(securitySummary?.failedAttempts ?? 0)}
            helper={`${formatNumber(
              securitySummary?.recentAttempts ?? 0,
            )} intentos recientes`}
          />
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Centro de monitoreo
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Resumen general del servicio, la seguridad y los respaldos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {null}
            {false ? (
              <>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="rounded-lg">
                  Guía rápida
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <p className="text-sm font-semibold text-[var(--text-main)]">Organización del panel</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--text-muted)]">
                  <li><strong>Monitoreo:</strong> estado técnico, tablas y métricas.</li>
                  <li><strong>Seguridad:</strong> sesiones activas y auditoría.</li>
                  <li><strong>Respaldos:</strong> generación, programación e historial.</li>
                </ul>
              </PopoverContent>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void Promise.all([
                  loadAuthSecurityOverviewData(),
                  loadDatabaseStats(),
                  loadBackupRecordsData(),
                  loadBackupScheduleData(),
                ])
              }
              disabled={anyLoading}
              className="rounded-lg"
            >
              <RefreshCw className={cn("size-4", anyLoading && "animate-spin")} />
              {anyLoading ? "Actualizando..." : "Actualizar estado"}
            </Button>
          </div>
        </div>

        <AdminFilterTabs
          tabs={[
            { id: "monitoreo", label: "Monitoreo", count: dbTableItems.length },
            { id: "seguridad", label: "Seguridad", count: loginAuditItems.length },
            { id: "respaldos", label: "Respaldos", count: backupRecords.length },
          ]}
          activeId={mainTab}
          onChange={(id) => setMainTab(id as MainTab)}
          formatCount={formatNumber}
        />

        {mainTab === "monitoreo" ? (
          <section className="grid gap-6">
            <Card
              className="overflow-hidden rounded-[28px] border-0 text-white shadow-[0_22px_60px_rgba(4,32,38,0.22)]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--brand-900) 90%, #082125) 0%, color-mix(in srgb, var(--brand-700) 86%, #0d444a) 56%, color-mix(in srgb, var(--brand-600) 78%, #1b7c82) 100%)",
              }}
            >
              <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)] lg:items-end lg:p-8">
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant={dbStatus?.isOnline ? "emerald" : "red"}
                      className="border-0 bg-white/15 text-white"
                    >
                      {dbStatus?.isOnline ? "Servicio disponible" : "Sin conexion"}
                    </Badge>
                    <span className="text-sm text-white/75">
                      Ultima revision:{" "}
                      {dbStatus?.checkedAt
                        ? new Date(dbStatus?.checkedAt ?? "").toLocaleString("es-MX")
                        : "Sin datos"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                      Base de datos activa
                    </p>
                    <h3 className="text-3xl font-bold tracking-tight lg:text-4xl">
                      {dbStatus?.databaseName ?? "Sin datos"}
                    </h3>
                    <p className="max-w-2xl text-sm leading-6 text-white/80">
                      Estado general, capacidad y actividad reciente en una sola vista.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <HeroStat label="Tablas" value={formatNumber(dbTableItems.length)} />
                  <HeroStat
                    label="Filas estimadas"
                    value={formatNumber(dbStatus?.tables.totalRows ?? 0)}
                  />
                  <HeroStat
                    label="Peso total"
                    value={dbStatus?.tables.totalSizePretty ?? "Sin datos"}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,360px)]">
              <Card className="min-w-0 max-w-full rounded-2xl border-[var(--border-soft)] shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Salud operativa</CardTitle>
                  <CardDescription>Estado actual del servicio y su actividad.</CardDescription>
                </CardHeader>
                <CardContent className="grid min-w-0 grid-cols-1 gap-3 px-5 pb-6 sm:grid-cols-2 sm:gap-4 sm:px-6">
                  <IconInfoCard
                    icon={<Database className="size-4" />}
                    title="Estado"
                    value={dbStatus?.isOnline ? "Conectada" : "Sin datos"}
                    helper={`Servicio ${dbStatus?.isOnline ? "disponible" : "sin respuesta"}`}
                    valueClassName={
                      dbStatus?.isOnline ? "text-emerald-600" : "text-amber-700"
                    }
                  />
                  <IconInfoCard
                    icon={<CalendarClock className="size-4" />}
                    title="Tamaño y uptime"
                    value={dbStatus?.sizePretty ?? "Sin datos"}
                    helper={`Uptime: ${formatUptime(dbStatus?.uptimeSeconds ?? 0)}`}
                  />
                  <IconInfoCard
                    icon={<RefreshCw className="size-4" />}
                    title="Conexiones"
                    value={formatNumber(dbStatus?.connections.total ?? 0)}
                    helper={`${formatNumber(dbStatus?.connections.active ?? 0)} activas | ${formatNumber(
                      dbStatus?.connections.idle ?? 0,
                    )} idle`}
                  />
                  <IconInfoCard
                    icon={<History className="size-4" />}
                    title="Transacciones"
                    value={formatNumber(dbStatus?.transactions.commits ?? 0)}
                    helper={`${formatNumber(
                      dbStatus?.transactions.rollbacks ?? 0,
                    )} rollbacks`}
                  />
                </CardContent>
              </Card>

              <Card className="min-w-0 max-w-full rounded-2xl border-[var(--border-soft)] shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Resumen tecnico</CardTitle>
                  <CardDescription>
                    Version, capacidad y actividad reciente de la base de datos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow
                    label="Version"
                    value={dbStatus?.dbVersion ?? "Sin datos"}
                    valueClassName="text-sm"
                  />
                  <DetailRow
                    label="Peso de tablas"
                    value={dbStatus?.tables.totalSizePretty ?? "Sin datos"}
                  />
                  <DetailRow
                    label="Tabla principal"
                    value={
                      heaviestDbTable
                        ? `${formatTableName(heaviestDbTable?.tableName ?? "")} (${heaviestDbTable?.sizePretty ?? "Sin datos"})`
                        : "Sin datos"
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoStat
                      icon={<ShieldCheck className="size-4" />}
                      label="Intentos fallidos"
                      value={formatNumber(securitySummary?.failedAttempts ?? 0)}
                    />
                    <InfoStat
                      icon={<Users className="size-4" />}
                      label="Sesiones activas"
                      value={formatNumber(
                        securitySummary?.activeSessions ?? activeSessions.length,
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-[var(--border-soft)] shadow-sm">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="size-4 text-[var(--brand-700)]" />
                    Tablas de la BD
                  </CardTitle>
                  <CardDescription>
                    Registros y tamano de cada tabla con una lectura mas ligera.
                  </CardDescription>
                </div>
                <Badge variant="slate" className="w-fit">
                  {formatNumber(dbTableItems.length)} tablas
                </Badge>
              </CardHeader>
              <CardContent>
                {dbTableItems.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Sin datos de tablas por el momento.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/35">
                    <div className="max-h-[560px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur">
                          <TableRow>
                            <TableHead className="pl-5">Tabla</TableHead>
                            <TableHead className="text-right">Registros</TableHead>
                            <TableHead className="pr-5 text-right">Tamano</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dbTableItems.map((table, index) => (
                            <TableRow
                              key={table.tableName}
                              className="transition-colors hover:bg-[var(--card)]/75"
                            >
                              <TableCell className="pl-5">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--card)] text-xs font-bold text-[var(--brand-800)] shadow-sm">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <div className="space-y-0.5">
                                    <strong className="block text-sm text-[var(--text-main)]">
                                      {formatTableName(table.tableName)}
                                    </strong>
                                    <code className="text-xs text-[var(--text-muted)]">
                                      {table.tableName}
                                    </code>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-[var(--text-main)]">
                                {formatNumber(table.rowCount)}
                              </TableCell>
                              <TableCell className="pr-5 text-right tabular-nums text-[var(--text-main)]">
                                {table.sizePretty}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {false ? (
        <div
          className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand-600)_28%,var(--border-soft))]"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand-900) 88%, #0a2a2e) 0%, color-mix(in srgb, var(--brand-700) 85%, #0d3d42) 52%, color-mix(in srgb, var(--brand-600) 72%, #124a50) 100%)",
          }}
        >
          <div className="grid gap-6 p-6 text-white lg:grid-cols-[1.2fr_minmax(0,1fr)] lg:items-center">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                Base de datos activa
              </p>
              <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                {dbStatus?.databaseName ?? "Sin datos"}
              </h3>
              <span className="text-sm text-white/85">
                Última revisión:{" "}
                {dbStatus?.checkedAt
                  ? new Date(dbStatus?.checkedAt ?? "").toLocaleString("es-MX")
                  : "Sin datos"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/15 bg-black/15 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Tablas
                </p>
                <p className="mt-1 text-lg font-bold">
                  {formatNumber(dbTableItems.length)}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/15 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Filas totales
                </p>
                <p className="mt-1 text-lg font-bold">
                  {formatNumber(dbStatus?.tables.totalRows ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/15 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Peso tablas
                </p>
                <p className="mt-1 text-sm font-bold leading-snug">
                  {dbStatus?.tables.totalSizePretty ?? "Sin datos"}
                </p>
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {false ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IconInfoCard
            icon={<Database className="size-4" />}
            title="Estado"
            value={dbStatus?.isOnline ? "Conectada" : "Sin datos"}
            helper={`Servicio: ${dbStatus?.isOnline ? "Disponible" : "Sin datos"}`}
            valueClassName={dbStatus?.isOnline ? "text-emerald-600" : "text-amber-700"}
          />
          <IconInfoCard
            icon={<CalendarClock className="size-4" />}
            title="Tamaño y uptime"
            value={dbStatus?.sizePretty ?? "Sin datos"}
            helper={`Uptime: ${formatUptime(dbStatus?.uptimeSeconds ?? 0)}`}
          />
          <IconInfoCard
            icon={<RefreshCw className="size-4" />}
            title="Conexiones"
            value={formatNumber(dbStatus?.connections.total ?? 0)}
            helper={`Activas: ${formatNumber(dbStatus?.connections.active ?? 0)} | Idle: ${formatNumber(
              dbStatus?.connections.idle ?? 0,
            )}`}
          />
          <IconInfoCard
            icon={<History className="size-4" />}
            title="Transacciones"
            value={formatNumber(dbStatus?.transactions.commits ?? 0)}
            helper={`Rollbacks: ${formatNumber(dbStatus?.transactions.rollbacks ?? 0)}`}
          />
        </div>
        ) : null}

        {false ? (
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-sm text-[var(--text-main)]">
          <p>
            <strong>Versión:</strong> {dbStatus?.dbVersion ?? "Sin datos"}
          </p>
          <p className="mt-2">
            <strong>Peso de tablas:</strong>{" "}
            {dbStatus?.tables.totalSizePretty ?? "Sin datos"}
          </p>
          <p className="mt-2">
            <strong>Tabla principal:</strong>{" "}
            {heaviestDbTable
              ? `${formatTableName(heaviestDbTable?.tableName ?? "")} (${heaviestDbTable?.sizePretty ?? "Sin datos"})`
              : "Sin datos"}
          </p>
        </div>
        ) : null}

        {false ? (
        <div className="grid gap-6">
          <Card className="rounded-2xl border-[var(--border-soft)] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-[var(--brand-700)]" />
                Tablas de la BD
              </CardTitle>
              <CardDescription>Registros y tamaño de cada tabla</CardDescription>
            </CardHeader>
            <CardContent>
              {dbTableItems.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Sin datos de tablas por el momento.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabla</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead className="text-right">Tamaño</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbTableItems.map((table, index) => (
                        <TableRow key={table.tableName}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-bold text-[var(--brand-800)]">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <strong className="block text-[var(--text-main)]">
                                  {formatTableName(table.tableName)}
                                </strong>
                                <code className="text-xs text-[var(--text-muted)]">
                                  {table.tableName}
                                </code>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(table.rowCount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {table.sizePretty}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        ) : null}

        {mainTab === "seguridad" ? (
        <section className="grid gap-6">
          <Card className="rounded-2xl border-[var(--border-soft)] shadow-sm">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">Seguridad de acceso</CardTitle>
                <CardDescription>
                  Sesiones activas y actividad reciente de inicio de sesion.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeSessions.length > 3 ? (
                  <Button type="button" variant="outline" onClick={() => setAllSessionsOpen(true)}>
                    Ver sesiones
                  </Button>
                ) : null}
                {loginAuditItems.length > 3 ? (
                  <Button type="button" variant="outline" onClick={() => setAllAuditOpen(true)}>
                    Ver historial
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <InfoStat
                icon={<Users className="size-4" />}
                label="Sesiones activas"
                value={formatNumber(
                  securitySummary?.activeSessions ?? activeSessions.length,
                )}
              />
              <InfoStat
                icon={<History className="size-4" />}
                label="Intentos recientes"
                value={formatNumber(securitySummary?.recentAttempts ?? 0)}
              />
              <InfoStat
                icon={<ShieldCheck className="size-4" />}
                label="Intentos fallidos"
                value={formatNumber(securitySummary?.failedAttempts ?? 0)}
              />
            </CardContent>
          </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border-[var(--border-soft)] shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-[var(--brand-700)]" />
                  Sesiones activas
                </CardTitle>
                <CardDescription>Usuarios conectados actualmente.</CardDescription>
              </div>
              <Badge variant="blue">
                {formatNumber(
                  securitySummary?.activeSessions ?? activeSessions.length,
                )}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loadingAuthSecurityOverview && visibleActiveSessions.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Consultando sesiones...
                </p>
              ) : visibleActiveSessions.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No hay sesiones activas en este momento.
                </p>
              ) : (
                visibleActiveSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-3"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand-800),var(--brand-600))] text-sm font-bold text-white">
                      {getInitialsFromName(session.nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-[var(--text-main)]">
                          {session.nombre}
                        </strong>
                        <Badge variant="slate">
                          {session.rol === "ADMIN" ? "Admin" : "Cliente"}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-[var(--text-muted)]">
                        {session.correo}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Activa desde {formatDateTime(session.createdAt)} ·{" "}
                        {formatRelativeTime(session.lastSeenAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {activeSessions.length > 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAllSessionsOpen(true)}
                >
                  Ver todas las sesiones ({activeSessions.length})
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[var(--border-soft)]">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-[var(--brand-700)]" />
                  Seguridad y auditoría
                </CardTitle>
                <CardDescription>Últimos intentos de acceso</CardDescription>
              </div>
              <Badge
                variant={
                  (securitySummary?.failedAttempts ?? 0) > 0 ? "red" : "emerald"
                }
              >
                {formatNumber(securitySummary?.failedAttempts ?? 0)} fallidos
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loadingAuthSecurityOverview && visibleLoginAuditItems.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Cargando auditoría...
                </p>
              ) : visibleLoginAuditItems.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Sin eventos de inicio de sesión por el momento.
                </p>
              ) : (
                visibleLoginAuditItems.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <strong className="text-[var(--text-main)]">
                          {attempt.nombre}
                        </strong>
                        <p className="text-sm text-[var(--text-muted)]">
                          {attempt.correo}
                        </p>
                      </div>
                      <Badge variant={attempt.success ? "emerald" : "red"}>
                        {attempt.success ? "Éxito" : "Fallido"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span>{formatDateTime(attempt.attemptedAt)}</span>
                      <span>{formatAuditReason(attempt.reason)}</span>
                    </div>
                  </div>
                ))
              )}
              {loginAuditItems.length > 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAllAuditOpen(true)}
                >
                  Ver todo el historial ({loginAuditItems.length})
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
        </section>
        ) : null}

        {mainTab === "respaldos" ? (
        <Card
          className="overflow-hidden rounded-2xl border-[var(--border-soft)]"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(43,162,161,0.12), transparent 26%), linear-gradient(180deg, color-mix(in srgb, var(--card) 96%, #fff) 0%, color-mix(in srgb, var(--brand-600) 6%, var(--card)) 100%)",
          }}
        >
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-800)]">
                  Respaldo y continuidad
                </span>
                <CardTitle className="text-xl">Generar respaldo de la base de datos</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Centraliza respaldos manuales y automáticos. Los archivos se registran en el
                  historial; la configuración del servidor puede guardarlos también en la nube
                  (por ejemplo Google Drive) para trazabilidad y recuperación.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-center">
                  <p className="text-xs font-medium text-[var(--text-muted)]">Formato</p>
                  <p className="text-lg font-bold text-[var(--text-main)]">
                    {dbStatus?.backup.fileExtension
                      ? dbStatus.backup.fileExtension.toUpperCase()
                      : "TAR"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-center">
                  <p className="text-xs font-medium text-[var(--text-muted)]">Historial</p>
                  <p className="text-lg font-bold text-[var(--text-main)]">
                    {formatNumber(backupRecords.length)} archivos
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-6 px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void generateBackup()}
                disabled={generatingBackup || generatingTableBackup}
                className="group rounded-2xl border border-[rgba(17,92,101,0.45)] bg-[linear-gradient(135deg,var(--brand-800),var(--brand-600))] p-5 text-left text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                  Respaldo completo
                </span>
                <strong className="mt-2 block text-lg">
                  {generatingBackup
                    ? "Generando respaldo..."
                    : "Generar respaldo de la base de datos"}
                </strong>
                <p className="mt-2 text-sm text-white/85">
                  Crea una copia completa lista para descarga y resguardo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTableBackupDialogOpen(true)}
                disabled={loadingDbStatus || generatingBackup || generatingTableBackup}
                className={cn(
                  "rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                  tableBackupDialogOpen &&
                    "border-[var(--brand-600)] ring-2 ring-[color-mix(in_srgb,var(--brand-600)_25%,transparent)]",
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-800)]">
                  Respaldo selectivo
                </span>
                <strong className="mt-2 block text-lg text-[var(--text-main)]">
                  Generar respaldo de una sola tabla
                </strong>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Ideal para cambios puntuales o exportaciones de revisión.
                </p>
              </button>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  label="Formato"
                  value={
                    dbStatus?.backup.fileExtension
                      ? dbStatus.backup.fileExtension.toUpperCase()
                      : "TAR"
                  }
                />
                <DetailRow
                  label="Destino"
                  value={dbStatus?.backup.provider ?? "Almacenamiento principal"}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadBackupRecordsData()}
                  disabled={
                    loadingBackupRecords || generatingBackup || generatingTableBackup
                  }
                >
                  {loadingBackupRecords ? "Recargando..." : "Actualizar historial"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshAllData()}
                  disabled={anyLoading}
                >
                  Actualizar panel
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-[var(--text-main)]">
                      Respaldo automatico
                    </h4>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Configura la frecuencia y revisa el estado actual desde un solo panel.
                    </p>
                  </div>
                  <Badge variant={backupSchedule?.enabled ? "emerald" : "slate"}>
                    {backupSchedule?.enabled ? "Activo" : "Manual"}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailRow
                    label="Frecuencia"
                    value={`Cada ${backupSchedule?.everyDays ?? 1} dia(s)`}
                  />
                  <DetailRow
                    label="Hora"
                    value={backupSchedule?.runAtTime ?? defaultScheduleForm.runAtTime}
                  />
                  <DetailRow
                    label="Retencion"
                    value={`${backupSchedule?.retentionDays ?? 7} dia(s)`}
                  />
                  <DetailRow
                    label="Actualizado"
                    value={
                      backupSchedule?.updatedAt
                        ? formatDateTime(backupSchedule.updatedAt)
                        : "Sin cambios"
                    }
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoStat
                    icon={<History className="size-4" />}
                    label="Ultima ejecucion"
                    value={formatScheduleDateTime(backupSchedule?.lastRunAt ?? null)}
                  />
                  <InfoStat
                    icon={<TimerReset className="size-4" />}
                    label="Proxima ejecucion"
                    value={formatScheduleDateTime(backupSchedule?.nextRunAt ?? null)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-800)]">
                  Acciones
                </p>
                <div className="mt-4 grid gap-3">
                  <Button type="button" onClick={openScheduleDialog}>
                    <CalendarClock className="size-4" />
                    Configurar respaldo automatico
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadBackupScheduleData()}
                    disabled={loadingBackupSchedule || savingSchedule}
                  >
                    {loadingBackupSchedule ? "Recargando..." : "Actualizar datos"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setPendingAction({ kind: "delete-schedule" })}
                    disabled={savingSchedule || loadingBackupSchedule}
                  >
                    Eliminar programacion
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="font-semibold text-[var(--text-main)]">
                    Historial de archivos
                  </h4>
                  <p className="text-sm text-[var(--text-muted)]">
                    Consulta, descarga o elimina respaldos guardados.
                  </p>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    value={historyQuery}
                    onChange={(event) => {
                      setHistoryQuery(event.target.value);
                      setBackupPage(1);
                    }}
                    placeholder="Filtrar por nombre..."
                    className="rounded-full pl-9"
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Fecha de generación</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBackups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[var(--text-muted)]">
                          No hay respaldos generados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedBackups.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <code className="text-sm">{item.fileName}</code>
                          </TableCell>
                          <TableCell>{formatBackupRecordDate(item)}</TableCell>
                          <TableCell>{formatBytes(item.sizeBytes)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void downloadBackupRecord(item)}
                                disabled={
                                  downloadingBackupId === item.id ||
                                  deletingBackupId === item.id
                                }
                              >
                                <Download className="size-4" />
                                {downloadingBackupId === item.id
                                  ? "Descargando..."
                                  : "Descargar"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-700"
                                disabled={deletingBackupId === item.id}
                                onClick={() =>
                                  setPendingAction({ kind: "delete-backup", backup: item })
                                }
                              >
                                <Trash2 className="size-4" />
                                {deletingBackupId === item.id ? "Eliminando..." : "Eliminar"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-[var(--text-muted)]">
                  {formatNumber(filteredBackups.length)} archivo(s) en el historial
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBackupPage((p) => Math.max(1, p - 1))}
                    disabled={currentBackupPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-[var(--text-muted)]">
                    Página {currentBackupPage} de {totalBackupPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBackupPage((p) => Math.min(totalBackupPages, p + 1))
                    }
                    disabled={currentBackupPage === totalBackupPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        ) : null}
      </div>

      <Dialog open={databaseSummaryOpen} onOpenChange={setDatabaseSummaryOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen tecnico de la base de datos</DialogTitle>
            <DialogDescription>
              Consulta el detalle tecnico del estado actual.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoStat
              icon={<Database className="size-4" />}
              label="Base activa"
              value={dbStatus?.databaseName ?? "Sin datos"}
            />
            <InfoStat
              icon={<CalendarClock className="size-4" />}
              label="Última revisión"
              value={
                dbStatus?.checkedAt
                  ? new Date(dbStatus?.checkedAt ?? "").toLocaleString("es-MX")
                  : "Sin datos"
              }
            />
            <InfoStat
              icon={<RefreshCw className="size-4" />}
              label="Conexiones"
              value={`${formatNumber(dbStatus?.connections.active ?? 0)} activas / ${formatNumber(
                dbStatus?.connections.total ?? 0,
              )} totales`}
            />
            <InfoStat
              icon={<History className="size-4" />}
              label="Transacciones"
              value={`${formatNumber(dbStatus?.transactions.commits ?? 0)} commits`}
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/70 p-4">
            <DetailRow label="Version" value={dbStatus?.dbVersion ?? "Sin datos"} valueClassName="text-sm" />
            <DetailRow
              label="Tamaño total"
              value={dbStatus?.tables.totalSizePretty ?? dbStatus?.sizePretty ?? "Sin datos"}
            />
            <DetailRow
              label="Tabla principal"
              value={
                heaviestDbTable
                  ? `${formatTableName(heaviestDbTable?.tableName ?? "")} (${heaviestDbTable?.sizePretty ?? "Sin datos"})`
                  : "Sin datos"
              }
            />
            <DetailRow
              label="Filas estimadas"
              value={formatNumber(dbStatus?.tables.totalRows ?? 0)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => syncScheduleFormWithCurrentRecord(true)}
              disabled={savingSchedule}
            >
              Restablecer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDatabaseSummaryOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allSessionsOpen} onOpenChange={setAllSessionsOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Todas las sesiones activas</DialogTitle>
            <DialogDescription>
              Lista completa reportada por el servidor ({activeSessions.length}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {activeSessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand-800),var(--brand-600))] text-sm font-bold text-white">
                  {getInitialsFromName(session.nombre)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{session.nombre}</strong>
                    <Badge variant="slate">
                      {session.rol === "ADMIN" ? "Admin" : "Cliente"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-[var(--text-muted)]">{session.correo}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Activa desde {formatDateTime(session.createdAt)} ·{" "}
                    {formatRelativeTime(session.lastSeenAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAllSessionsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tableBackupDialogOpen} onOpenChange={setTableBackupDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Respaldo selectivo por tabla</DialogTitle>
            <DialogDescription>
              Selecciona una tabla para generar un respaldo independiente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label
              className="text-sm font-medium text-[var(--text-main)]"
              htmlFor="single-table-backup-select-dialog"
            >
              Tabla
            </label>
            <select
              id="single-table-backup-select-dialog"
              value={selectedBackupTable}
              onChange={(event) => setSelectedBackupTable(event.target.value)}
              disabled={dbTableItems.length === 0 || generatingTableBackup}
              className="h-11 min-w-0 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTableBackupDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => void generateSingleTableBackup()}
              disabled={!selectedBackupTable || generatingBackup || generatingTableBackup}
            >
              {generatingTableBackup
                ? "Generando respaldo..."
                : "Generar respaldo de tabla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar programación automática</DialogTitle>
            <DialogDescription>
              Edita la frecuencia, hora y retención en un formulario con más espacio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={scheduleForm.enabled}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                disabled={savingSchedule}
                className="size-4 accent-[var(--brand-700)]"
              />
              {scheduleForm.enabled ? "Automáticos activos" : "Solo manual"}
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <FieldShell label="Cada cuántos días" hint="1 a 365 días">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={scheduleForm.everyDays}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      everyDays: event.target.value,
                    }))
                  }
                  disabled={savingSchedule}
                />
              </FieldShell>
              <FieldShell label="Hora" hint="Horario del servidor (24h)">
                <Input
                  type="time"
                  value={scheduleForm.runAtTime}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      runAtTime: event.target.value,
                    }))
                  }
                  disabled={savingSchedule}
                />
              </FieldShell>
              <FieldShell label="Retención en almacenamiento" hint="Días a conservar">
                <Input
                  type="number"
                  min="1"
                  max="3650"
                  value={scheduleForm.retentionDays}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      retentionDays: event.target.value,
                    }))
                  }
                  disabled={savingSchedule}
                />
              </FieldShell>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => void saveSchedule()}
              disabled={savingSchedule || loadingBackupSchedule}
            >
              {savingSchedule ? "Guardando..." : "Guardar programación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allAuditOpen} onOpenChange={setAllAuditOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de auditoría</DialogTitle>
            <DialogDescription>
              Todos los intentos recientes registrados ({loginAuditItems.length}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {loginAuditItems.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong>{attempt.nombre}</strong>
                    <p className="text-sm text-[var(--text-muted)]">{attempt.correo}</p>
                  </div>
                  <Badge variant={attempt.success ? "emerald" : "red"}>
                    {attempt.success ? "Éxito" : "Fallido"}
                  </Badge>
                </div>
                <div className="mt-2 flex justify-between gap-2 text-xs text-[var(--text-muted)]">
                  <span>{formatDateTime(attempt.attemptedAt)}</span>
                  <span>{formatAuditReason(attempt.reason)}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAllAuditOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingTitle}</AlertDialogTitle>
            <AlertDialogDescription>{pendingDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => setPendingAction(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction type="button" onClick={() => void executePendingAction()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-main)]">{label}</span>
      {children}
      <small className="text-[var(--text-muted)]">{hint}</small>
    </label>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-black/12 px-4 py-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/68">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold leading-tight text-white">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--card)]/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className={cn("text-sm font-medium leading-6 text-[var(--text-main)]", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function IconInfoCard({
  icon,
  title,
  value,
  helper,
  valueClassName,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  helper: string;
  valueClassName?: string;
}) {
  return (
    <Card className="h-full min-w-0 max-w-full overflow-hidden rounded-2xl border-[var(--border-soft)] bg-[var(--surface)]/55 shadow-none">
      <CardHeader className="gap-2 p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="flex min-w-0 items-start gap-2 text-sm font-medium leading-snug text-[var(--text-main)]">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--card)] text-[var(--brand-700)]">
            {icon}
          </span>
          <span className="min-w-0 break-words">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-2 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
        <p
          className={cn(
            "min-w-0 max-w-full break-words text-2xl font-semibold leading-tight tracking-tight text-[var(--text-main)] sm:text-[1.65rem]",
            valueClassName,
          )}
        >
          {value}
        </p>
        <p className="min-w-0 break-words text-sm leading-5 text-[var(--text-muted)]">{helper}</p>
      </CardContent>
    </Card>
  );
}

function InfoStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <strong className="mt-2 block text-[15px] text-[var(--text-main)]">{value}</strong>
    </div>
  );
}
