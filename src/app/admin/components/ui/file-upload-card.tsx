"use client";

import * as React from "react";
import Image from "next/image";
import { UploadCloud, X, CheckCircle2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Progress } from "./progress";

export interface UploadedFile {
  id: string;
  file?: File;
  name?: string;
  size?: number;
  progress: number;
  status: "uploading" | "completed" | "error";
  previewUrl?: string;
  serverImageId?: number;
}

export interface FileUploadCardProps {
  className?: string;
  files: UploadedFile[];
  onFilesChange: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onClose?: () => void;
  accept?: string;
  multiple?: boolean;
  formatsHint?: string;
  title?: string;
  subtitle?: string;
  browseLabel?: string;
  dropHint?: string;
  showFileList?: boolean;
  uploadLocked?: boolean;
  uploadLockedMessage?: string;
}

function fileTypeLabel(file: UploadedFile): string {
  const fileName = file.file?.name ?? file.name ?? "";
  const mimeType = file.file?.type ?? "";
  const ext = fileName.split(".").pop();

  if (ext && /^[a-z0-9]{2,5}$/i.test(ext)) {
    return ext.toUpperCase().slice(0, 4);
  }

  const part = mimeType.split("/")[1];
  if (part === "jpeg") return "JPEG";
  if (part === "png") return "PNG";
  if (part === "webp") return "WEBP";
  if (part === "pdf") return "PDF";
  if (!part) return "FILE";
  return part.toUpperCase().slice(0, 4);
}

export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(
  (
    {
      className,
      files = [],
      onFilesChange,
      onFileRemove,
      onClose,
      accept,
      multiple = true,
      formatsHint = "JPEG, PNG, PDF y MP4, hasta 50 MB.",
      title = "Subir archivos",
      subtitle = "Selecciona o arrastra los archivos que necesites",
      browseLabel = "Examinar archivo",
      dropHint = "Elige un archivo o arrastralo aqui",
      showFileList = true,
      uploadLocked = false,
      uploadLockedMessage = "No puedes agregar mas archivos.",
    },
    ref,
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadLocked) return;
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadLocked) return;
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (uploadLocked) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesChange(droppedFiles);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (uploadLocked) {
        e.target.value = "";
        return;
      }

      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        onFilesChange(selectedFiles);
      }

      e.target.value = "";
    };

    const triggerFileSelect = () => {
      if (uploadLocked) return;
      fileInputRef.current?.click();
    };

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 KB";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const cardVariants = {
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0 },
    };

    const fileItemVariants = {
      hidden: { opacity: 0, x: -12 },
      visible: { opacity: 1, x: 0 },
    };

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.25 }}
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[0_4px_24px_rgba(15,61,59,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
          className,
        )}
      >
        <div className="border-b border-border px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted dark:bg-muted/80"
                aria-hidden
              >
                <UploadCloud className="size-6 text-muted-foreground" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div
            role="button"
            tabIndex={uploadLocked ? -1 : 0}
            aria-disabled={uploadLocked}
            onKeyDown={(e) => {
              if (uploadLocked) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerFileSelect();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={cn(
              "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 px-6 py-10 text-center transition-colors duration-200 dark:border-muted-foreground/35 dark:bg-muted/40",
              uploadLocked
                ? "cursor-not-allowed border-border bg-muted/30 opacity-80 dark:bg-muted/25"
                : null,
              !uploadLocked &&
                (isDragging
                  ? "border-primary bg-primary/10 dark:bg-primary/15"
                  : "hover:border-primary/55"),
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={accept}
              className="hidden"
              disabled={uploadLocked}
              onChange={handleFileSelect}
            />
            {uploadLocked ? (
              <p className="max-w-xs text-sm font-medium text-muted-foreground">
                {uploadLockedMessage}
              </p>
            ) : (
              <>
                <UploadCloud
                  className="mb-5 size-[2.75rem] text-muted-foreground dark:text-muted-foreground/90"
                  strokeWidth={1.25}
                />
                <p className="text-[15px] font-semibold text-foreground">{dropHint}</p>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {formatsHint}
                </p>
                <span
                  className={cn(
                    "pointer-events-none mt-6 inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm dark:bg-card dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]",
                    isDragging && "border-primary/50",
                  )}
                >
                  {browseLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {showFileList && files.length > 0 ? (
          <div className="px-6 py-5">
            <ul className="flex flex-col gap-5">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.li
                    key={file.id}
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      {file.previewUrl ? (
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-sm dark:shadow-none">
                          <Image
                            src={file.previewUrl}
                            alt=""
                            width={44}
                            height={44}
                            unoptimized
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-[11px] font-bold tracking-wide text-muted-foreground shadow-sm dark:bg-muted/70 dark:text-muted-foreground dark:shadow-none">
                          {fileTypeLabel(file)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {file.file?.name ?? file.name ?? "Archivo"}
                        </p>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {file.status === "uploading" ? (
                            <span>
                              {formatFileSize(
                                ((file.file?.size ?? file.size ?? 0) * file.progress) / 100,
                              )}{" "}
                              de {formatFileSize(file.file?.size ?? file.size ?? 0)}
                            </span>
                          ) : null}
                          {file.status === "completed" ? (
                            <span>{formatFileSize(file.file?.size ?? file.size ?? 0)}</span>
                          ) : null}
                          {file.status === "error" ? (
                            <span className="text-destructive">Error</span>
                          ) : null}
                          <span className="mx-1.5 text-border">•</span>
                          <span
                            className={cn(
                              "font-medium",
                              file.status === "uploading" && "text-primary",
                              file.status === "completed" &&
                                "text-emerald-600 dark:text-emerald-400",
                              file.status === "error" && "text-destructive",
                            )}
                          >
                            {file.status === "uploading"
                              ? "Subiendo..."
                              : file.status === "completed"
                                ? "Completado"
                                : "Error"}
                          </span>
                        </div>
                        {file.status === "uploading" ? (
                          <Progress value={file.progress} className="mt-2 h-1.5 max-w-full" />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {file.status === "completed" ? (
                        <CheckCircle2
                          className="size-6 text-emerald-600 dark:text-emerald-400"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileRemove(file.id);
                        }}
                        aria-label={file.status === "completed" ? "Eliminar archivo" : "Cancelar"}
                      >
                        {file.status === "completed" ? (
                          <Trash2 className="size-[18px]" />
                        ) : (
                          <X className="size-[18px]" />
                        )}
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ) : null}
      </motion.div>
    );
  },
);

FileUploadCard.displayName = "FileUploadCard";
