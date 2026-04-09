"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  DollarSign,
  FileText,
  FileWarning,
  Hash,
  Images,
  LayoutGrid,
  ArrowLeft,
  LoaderCircle,
  Package,
  Power,
  Repeat2,
  SlidersHorizontal,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getProduct,
  updateProduct,
  type CreateProductPayload,
} from "@/services/admin";

import { AdminPageLoading } from "../../../components/admin-page-loading";
import { PageHeader } from "../../../components/page-header";
import { Button } from "../../../components/ui/button";
import {
  FileUploadCard,
  type UploadedFile,
} from "../../../components/ui/file-upload-card";
import { Input } from "../../../components/ui/input";
import { Progress } from "../../../components/ui/progress";
import {
  EMPTY_PRODUCT_FORM,
  createUploadedFileFromProductImage,
  loadProductReferenceData,
  normalizeProductPayload,
  productFieldClassName,
  productTextareaClassName,
  PRODUCT_MAX_IMAGE_BYTES,
  PRODUCT_MAX_IMAGES,
  validateProductForm,
} from "../../product-shared";
import { ProductFieldLabel } from "../../product-field-label";
import { useAdminRouteGate } from "../../../hooks/use-admin-route-gate";

type ProductDraftState = CreateProductPayload;

const switchBaseClassName =
  "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors";

const switchThumbClassName =
  "inline-block size-5 rounded-full bg-background shadow-sm transition-transform";

const initialDraftState: ProductDraftState = {
  ...EMPTY_PRODUCT_FORM,
};

const sectionTitleClassName = "text-base font-semibold text-foreground";
const sectionBodyClassName =
  "rounded-[24px] border border-border bg-muted/50 p-5 dark:bg-muted/30 sm:p-6";

function SwitchField({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 text-left"
    >
      <span className="flex min-w-0 flex-1 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
      </span>
      <span
        className={`${switchBaseClassName} ${
          checked
            ? "border-primary bg-primary"
            : "border-border bg-muted"
        }`}
      >
        <span
          className={`${switchThumbClassName} ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productIdParam = params.id;
  const productId =
    typeof productIdParam === "string"
      ? Number.parseInt(productIdParam, 10)
      : Array.isArray(productIdParam)
        ? Number.parseInt(productIdParam[0] ?? "", 10)
        : NaN;

  const { user, blockingFullPage } = useAdminRouteGate();

  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<
    Awaited<ReturnType<typeof loadProductReferenceData>>["suppliers"]
  >([]);
  const [form, setForm] = useState<ProductDraftState>(initialDraftState);
  const [imageUploadItems, setImageUploadItems] = useState<UploadedFile[]>([]);
  const [productImageUrlInput, setProductImageUrlInput] = useState("");
  const imageProgressTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const readingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timers = imageProgressTimersRef.current;
    return () => {
      timers.forEach((t) => clearInterval(t));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!user || user.rol !== "ADMIN") return;
    if (!Number.isFinite(productId) || productId <= 0) {
      toast.error("Producto no válido");
      router.replace("/admin/products");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setInitLoading(true);
        const [referenceData, productResponse] = await Promise.all([
          loadProductReferenceData(),
          getProduct(productId, true),
        ]);
        if (cancelled) return;

        const product = productResponse.product;

        const brandList = [...referenceData.brands];
        if (product.marca.trim() && !brandList.includes(product.marca.trim())) {
          brandList.push(product.marca.trim());
        }
        brandList.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

        const classList = [...referenceData.classifications];
        if (product.clasificacion.trim() && !classList.includes(product.clasificacion.trim())) {
          classList.push(product.clasificacion.trim());
        }
        classList.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

        let supplierList = [...referenceData.suppliers];
        if (!supplierList.some((s) => s.nombre === product.proveedor)) {
          supplierList = [
            ...supplierList,
            {
              id: -product.id,
              nombre: product.proveedor,
              encargado: "",
              repartidor: "",
              direccion: "",
            },
          ];
        }
        supplierList.sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
        );

        setBrands(brandList);
        setClassifications(classList);
        setSuppliers(supplierList);
        setForm({
          nombre: product.nombre,
          marca: product.marca,
          modelo: product.modelo,
          descripcion: product.descripcion,
          precio: product.precio,
          clasificacion: product.clasificacion,
          stock: Math.max(0, Math.trunc(Number(product.stock))),
          proveedor: product.proveedor,
          tipoAdquisicion: product.tipoAdquisicion,
          requiereReceta: product.requiereReceta,
          activo: product.activo,
        });
        setImageUploadItems(product.images.map(createUploadedFileFromProductImage));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo cargar el producto";
        toast.error(message);
        router.replace("/admin/products");
      } finally {
        if (!cancelled) {
          setInitLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, productId, router]);

  const updateField = <K extends keyof ProductDraftState>(
    key: K,
    value: ProductDraftState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearProgressTimer = (id: string) => {
    const t = imageProgressTimersRef.current.get(id);
    if (t) {
      clearInterval(t);
      imageProgressTimersRef.current.delete(id);
    }
  };

  const startReadingImage = useCallback((id: string, file: File) => {
    if (readingIdsRef.current.has(id)) return;
    readingIdsRef.current.add(id);

    const interval = setInterval(() => {
      setImageUploadItems((prev) =>
        prev.map((item) =>
          item.id === id && item.status === "uploading"
            ? { ...item, progress: Math.min(item.progress + 12, 90) }
            : item,
        ),
      );
    }, 100);
    imageProgressTimersRef.current.set(id, interval);

    const reader = new FileReader();
    reader.onload = () => {
      const t = imageProgressTimersRef.current.get(id);
      if (t) {
        clearInterval(t);
        imageProgressTimersRef.current.delete(id);
      }
      readingIdsRef.current.delete(id);
      const previewUrl = typeof reader.result === "string" ? reader.result : "";
      setImageUploadItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, previewUrl, progress: 100, status: "completed" }
            : item,
        ),
      );
    };
    reader.onerror = () => {
      const t = imageProgressTimersRef.current.get(id);
      if (t) {
        clearInterval(t);
        imageProgressTimersRef.current.delete(id);
      }
      readingIdsRef.current.delete(id);
      toast.error("No se pudo leer una imagen");
      setImageUploadItems((prev) => prev.filter((item) => item.id !== id));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageFilesChange = (picked: File[]) => {
    const imageFiles = picked.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Selecciona archivos de imagen válidos");
      return;
    }

    const tooBig = imageFiles.find((f) => f.size > PRODUCT_MAX_IMAGE_BYTES);
    if (tooBig) {
      toast.error("Cada imagen debe pesar 8 MB o menos");
      return;
    }

    setImageUploadItems((prev) => {
      const room = PRODUCT_MAX_IMAGES - prev.length;
      if (room <= 0) {
        toast.error(`Máximo ${PRODUCT_MAX_IMAGES} imágenes`);
        return prev;
      }
      const toAdd = imageFiles.slice(0, room);
      if (imageFiles.length > room) {
        toast(
          `Solo se agregaron ${toAdd.length} imagen(es). El máximo es ${PRODUCT_MAX_IMAGES}.`,
        );
      }
      if (toAdd.length === 0) return prev;
      const batch: UploadedFile[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "uploading",
      }));
      return [...prev, ...batch];
    });
  };

  const addProductImageUrl = () => {
    const rawUrl = productImageUrlInput.trim();
    if (!rawUrl) return;

    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      toast.error("La URL de imagen debe usar http o https.");
      return;
    }

    const existingUrls = new Set(imageUploadItems.map((item) => item.previewUrl));
    if (existingUrls.has(rawUrl)) {
      toast.error("Esta imagen ya fue agregada.");
      return;
    }

    if (imageUploadItems.length >= PRODUCT_MAX_IMAGES) {
      toast.error(`Máximo ${PRODUCT_MAX_IMAGES} imágenes.`);
      return;
    }

    let name = "Imagen desde URL";
    try {
      name = new URL(rawUrl).pathname.split("/").pop() || name;
    } catch {
      // Ignorar
    }

    setImageUploadItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        previewUrl: rawUrl,
        progress: 100,
        status: "completed",
        name,
      },
    ]);
    setProductImageUrlInput("");
  };

  useEffect(() => {
    for (const item of imageUploadItems) {
      if (item.status !== "uploading") continue;
      if (!item.file) continue;
      if (item.previewUrl) continue;
      if (readingIdsRef.current.has(item.id)) continue;
      startReadingImage(item.id, item.file);
    }
  }, [imageUploadItems, startReadingImage]);

  const handleImageFileRemove = (id: string) => {
    clearProgressTimer(id);
    readingIdsRef.current.delete(id);
    setImageUploadItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: CreateProductPayload = {
      nombre: form.nombre,
      marca: form.marca,
      modelo: form.modelo,
      descripcion: form.descripcion,
      precio: form.precio,
      clasificacion: form.clasificacion,
      stock: form.stock,
      proveedor: form.proveedor,
      tipoAdquisicion: form.tipoAdquisicion,
      requiereReceta: form.requiereReceta,
      activo: form.activo,
    };

    const validationError = validateProductForm(payload);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);
      const response = await updateProduct(productId, normalizeProductPayload(payload), {
        files: imageUploadItems.flatMap((item) =>
          item.serverImageId || !item.file ? [] : [item.file],
        ),
        imageUrls: imageUploadItems.flatMap((item) =>
          !item.serverImageId && !item.file && item.previewUrl ? [item.previewUrl] : [],
        ),
        keepImageIds: imageUploadItems.flatMap((item) =>
          item.serverImageId ? [item.serverImageId] : [],
        ),
      });
      toast.success(response.message || "Producto actualizado");
      router.push("/admin/products");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el producto";
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
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Editar producto"
          subtitle="Actualiza los datos del producto. Los cambios se reflejan en el catálogo administrativo."
          breadcrumbs={[
            { label: "Inicio", href: "/admin" },
            { label: "Productos", href: "/admin/products" },
            { label: "Editar producto" },
          ]}
        />
        <div className="flex justify-end">
          <Button variant="outline" asChild className="rounded-md">
            <Link href="/admin/products">
              <ArrowLeft className="size-4" />
              Volver al listado
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-card p-4 text-card-foreground shadow-[0_20px_44px_rgba(15,61,59,0.08)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.55)] sm:p-6">
        {initLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Cargando producto...
          </div>
        ) : (
          <form className="grid w-full min-w-0 gap-8" onSubmit={handleSubmit}>
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] xl:items-start">
              <div className="grid min-w-0 gap-6">
                <section className="grid gap-4">
                  <div>
                    <h2 className={`${sectionTitleClassName} flex items-center gap-2`}>
                      <ClipboardList className="size-5 shrink-0 text-primary" aria-hidden />
                      Datos generales
                    </h2>
                  </div>

                  <div className={`${sectionBodyClassName} grid gap-4 md:grid-cols-2`}>
                    <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
                      <ProductFieldLabel icon={Package}>Nombre del producto</ProductFieldLabel>
                      <Input
                        className={productFieldClassName}
                        value={form.nombre}
                        onChange={(event) => updateField("nombre", event.target.value)}
                        placeholder="Ej. Rodillera ortopédica premium"
                        maxLength={120}
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={Tag}>Marca</ProductFieldLabel>
                      <select
                        className={productFieldClassName}
                        value={form.marca}
                        onChange={(event) => updateField("marca", event.target.value)}
                        disabled={brands.length === 0}
                      >
                        <option value="">
                          {brands.length === 0
                            ? "Primero registra una marca en catálogos"
                            : "Selecciona una marca"}
                        </option>
                        {brands.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={Hash}>Modelo</ProductFieldLabel>
                      <Input
                        className={productFieldClassName}
                        value={form.modelo}
                        onChange={(event) => updateField("modelo", event.target.value)}
                        placeholder="Modelo o referencia"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={LayoutGrid}>
                        Clasificación (categoría)
                      </ProductFieldLabel>
                      <select
                        className={productFieldClassName}
                        value={form.clasificacion}
                        onChange={(event) =>
                          updateField("clasificacion", event.target.value)
                        }
                        disabled={classifications.length === 0}
                      >
                        <option value="">
                          {classifications.length === 0
                            ? "Primero registra una clasificación en catálogos"
                            : "Selecciona una clasificación"}
                        </option>
                        {classifications.map((classification) => (
                          <option key={classification} value={classification}>
                            {classification}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
                      <ProductFieldLabel icon={FileText}>Descripción</ProductFieldLabel>
                      <textarea
                        value={form.descripcion}
                        onChange={(event) => updateField("descripcion", event.target.value)}
                        placeholder="Describe el producto, beneficios, materiales y uso recomendado (5-400 caracteres)"
                        className={productTextareaClassName}
                        maxLength={400}
                      />
                    </label>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h2 className={`${sectionTitleClassName} flex items-center gap-2`}>
                      <BadgeDollarSign className="size-5 shrink-0 text-primary" aria-hidden />
                      Información comercial
                    </h2>
                  </div>

                  <div className={`${sectionBodyClassName} grid gap-4 md:grid-cols-2`}>
                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={DollarSign}>Precio</ProductFieldLabel>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className={productFieldClassName}
                        value={String(form.precio)}
                        onChange={(event) =>
                          updateField("precio", Number(event.target.value) || 0)
                        }
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={Boxes}>Stock</ProductFieldLabel>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className={productFieldClassName}
                        value={String(form.stock)}
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === "") {
                            updateField("stock", 0);
                            return;
                          }
                          const n = Number.parseInt(raw, 10);
                          updateField(
                            "stock",
                            Number.isFinite(n) && n >= 0 ? n : 0,
                          );
                        }}
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={Truck}>Proveedor</ProductFieldLabel>
                      <select
                        className={productFieldClassName}
                        value={form.proveedor}
                        onChange={(event) => updateField("proveedor", event.target.value)}
                        disabled={suppliers.length === 0}
                      >
                        <option value="">
                          {suppliers.length === 0
                            ? "Primero registra un proveedor"
                            : "Selecciona un proveedor"}
                        </option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.nombre}>
                            {supplier.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-foreground">
                      <ProductFieldLabel icon={Repeat2}>Tipo de adquisición</ProductFieldLabel>
                      <select
                        className={productFieldClassName}
                        value={form.tipoAdquisicion}
                        onChange={(event) =>
                          updateField(
                            "tipoAdquisicion",
                            event.target.value as CreateProductPayload["tipoAdquisicion"],
                          )
                        }
                      >
                        <option value="VENTA">Venta</option>
                        <option value="RENTA">Renta</option>
                        <option value="MIXTO">Mixto</option>
                      </select>
                    </label>
                  </div>
                </section>
              </div>

              <aside className="grid min-w-0 gap-6 xl:sticky xl:top-24 xl:self-start">
                <section className="grid gap-4">
                  <div>
                    <h2 className={`${sectionTitleClassName} flex items-center gap-2`}>
                      <SlidersHorizontal className="size-5 shrink-0 text-primary" aria-hidden />
                      Estado
                    </h2>
                  </div>

                  <div className={`${sectionBodyClassName} grid gap-3`}>
                    <SwitchField
                      icon={FileWarning}
                      label="Requiere receta"
                      description="Actívalo si este producto solo debe venderse o rentarse con receta."
                      checked={form.requiereReceta}
                      onChange={(checked) => updateField("requiereReceta", checked)}
                    />

                    <SwitchField
                      icon={Power}
                      label="Producto activo"
                      description="Manténlo activo para dejarlo listo en el flujo administrativo."
                      checked={form.activo}
                      onChange={(checked) => updateField("activo", checked)}
                    />

                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/25">
                        {form.activo ? "Activo" : "Inactivo"}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {form.requiereReceta ? "Con receta" : "Libre"}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {imageUploadItems.filter((i) => i.status === "completed").length}/
                        {PRODUCT_MAX_IMAGES} imágenes
                      </span>
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            <section className="grid min-w-0 w-full gap-4">
              <div>
                <h2 className={`${sectionTitleClassName} flex items-center gap-2`}>
                  <Images className="size-5 shrink-0 text-primary" aria-hidden />
                  Imágenes del producto
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hasta {PRODUCT_MAX_IMAGES} imágenes (JPEG, PNG o WEBP, máx. 8 MB c/u). La vista
                  previa muestra la imagen completa sin recortes.
                </p>
              </div>

              <div className={`${sectionBodyClassName} grid min-w-0 gap-6`}>
                {imageUploadItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {imageUploadItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-square w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-muted dark:bg-muted/60"
                      >
                        {item.previewUrl ? (
                          <Image
                            src={item.previewUrl}
                            alt={item.file?.name ?? item.name ?? "Imagen del producto"}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className="object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 p-4">
                            <LoaderCircle className="size-8 animate-spin text-primary" />
                            <Progress value={item.progress} className="h-1.5 w-[85%]" />
                            <span className="line-clamp-2 px-2 text-center text-xs text-muted-foreground">
                              {item.file?.name ?? item.name ?? "Imagen del producto"}
                            </span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 size-9 rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-card dark:bg-card/90"
                          onClick={() => handleImageFileRemove(item.id)}
                          aria-label={`Quitar ${item.file?.name ?? item.name ?? "imagen"}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <FileUploadCard
                  className="w-full max-w-none"
                  files={imageUploadItems}
                  onFilesChange={handleImageFilesChange}
                  onFileRemove={handleImageFileRemove}
                  accept="image/*"
                  multiple
                  showFileList={false}
                  uploadLocked={imageUploadItems.length >= PRODUCT_MAX_IMAGES}
                  uploadLockedMessage={`Ya tienes ${PRODUCT_MAX_IMAGES} imágenes. Quita una para agregar otra.`}
                  title="Agregar imágenes"
                  subtitle={`${imageUploadItems.length} de ${PRODUCT_MAX_IMAGES} usadas`}
                  dropHint="Arrastra aquí o elige archivos"
                  formatsHint="Varias imágenes a la vez si hay cupo. Máx. 8 MB por archivo."
                  browseLabel="Examinar archivos"
                />

                <div className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-4">
                  <Input
                    className="flex-1"
                    placeholder="O pega una URL: https://ejemplo.com/imagen.jpg"
                    value={productImageUrlInput}
                    onChange={(e) => setProductImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addProductImageUrl();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addProductImageUrl}
                    disabled={!productImageUrlInput.trim()}
                  >
                    Agregar URL
                  </Button>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
              <Button type="button" variant="outline" asChild className="rounded-xl">
                <Link href="/admin/products">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving} className="min-w-40 rounded-xl">
                {saving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
