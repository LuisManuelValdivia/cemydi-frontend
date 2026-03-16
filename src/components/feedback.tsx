"use client";

import { useEffect } from "react";
import styles from "./feedback.module.css";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  type: ToastType;
  text: string;
};

export type ConfirmDialogConfig = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

type ToastViewportProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  autoHideMs?: number;
};

export function ToastViewport({
  toasts,
  onDismiss,
  autoHideMs = 3600,
}: ToastViewportProps) {
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => onDismiss(toast.id), autoHideMs),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, onDismiss, autoHideMs]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastViewport} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${
            toast.type === "success"
              ? styles.toastSuccess
              : toast.type === "error"
                ? styles.toastError
                : styles.toastInfo
          }`}
          role="status"
        >
          <p>{toast.text}</p>
          <button type="button" onClick={() => onDismiss(toast.id)}>
            Cerrar
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog(config: ConfirmDialogConfig) {
  const {
    open,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "default",
    busy = false,
    onConfirm,
    onCancel,
  } = config;

  if (!open) return null;

  return (
    <div className={styles.dialogBackdrop}>
      <div className={styles.dialogCard} role="alertdialog" aria-modal="true">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.dialogCancel} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? styles.dialogDanger : styles.dialogConfirm}
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

