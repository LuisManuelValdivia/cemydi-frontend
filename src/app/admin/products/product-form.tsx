"use client";

import type { FormEvent } from "react";
import {
  Boxes,
  DollarSign,
  FileText,
  FileWarning,
  Hash,
  LayoutGrid,
  LoaderCircle,
  Package,
  Repeat2,
  SlidersHorizontal,
  Tag,
  Truck,
} from "lucide-react";

import type { CreateProductPayload, SupplierOption } from "@/services/admin";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ProductFieldLabel } from "./product-field-label";
import {
  productFieldClassName,
  productTextareaClassName,
} from "./product-shared";

type ProductFormProps = {
  form: CreateProductPayload;
  brands: string[];
  classifications: string[];
  suppliers: SupplierOption[];
  saving: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (next: CreateProductPayload) => void;
  onCancel?: () => void;
  cancelLabel?: string;
};

export function ProductForm({
  form,
  brands,
  classifications,
  suppliers,
  saving,
  submitLabel,
  onSubmit,
  onChange,
  onCancel,
  cancelLabel = "Cancelar",
}: ProductFormProps) {
  const updateField = <K extends keyof CreateProductPayload>(
    key: K,
    value: CreateProductPayload[K],
  ) => {
    onChange({
      ...form,
      [key]: value,
    });
  };

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <ProductFieldLabel icon={Package}>Nombre del producto</ProductFieldLabel>
          <Input
            value={form.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
            placeholder="Ej. Rodillera ortopédica"
            className={productFieldClassName}
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
                ? "Sin marcas en catálogo"
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
            value={form.modelo}
            onChange={(event) => updateField("modelo", event.target.value)}
            placeholder="Modelo o referencia"
            className={productFieldClassName}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          <ProductFieldLabel icon={LayoutGrid}>
            Clasificación (categoría)
          </ProductFieldLabel>
          <select
            className={productFieldClassName}
            value={form.clasificacion}
            onChange={(event) => updateField("clasificacion", event.target.value)}
            disabled={classifications.length === 0}
          >
            <option value="">
              {classifications.length === 0
                ? "Sin clasificaciones en catálogo"
                : "Selecciona una clasificación"}
            </option>
            {classifications.map((classification) => (
              <option key={classification} value={classification}>
                {classification}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          <ProductFieldLabel icon={DollarSign}>Precio</ProductFieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={String(form.precio)}
            onChange={(event) =>
              updateField("precio", Number(event.target.value) || 0)
            }
            className={productFieldClassName}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          <ProductFieldLabel icon={Boxes}>Stock</ProductFieldLabel>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={String(form.stock)}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") {
                updateField("stock", 0);
                return;
              }
              const n = Number.parseInt(raw, 10);
              updateField("stock", Number.isFinite(n) && n >= 0 ? n : 0);
            }}
            className={productFieldClassName}
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

        <label className="grid gap-2 text-sm font-medium text-foreground">
          <ProductFieldLabel icon={FileWarning}>Requiere receta</ProductFieldLabel>
          <select
            className={productFieldClassName}
            value={form.requiereReceta ? "yes" : "no"}
            onChange={(event) =>
              updateField("requiereReceta", event.target.value === "yes")
            }
          >
            <option value="no">No</option>
            <option value="yes">Sí</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          <ProductFieldLabel icon={SlidersHorizontal}>Estado</ProductFieldLabel>
          <select
            className={productFieldClassName}
            value={form.activo ? "active" : "inactive"}
            onChange={(event) =>
              updateField("activo", event.target.value === "active")
            }
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
          <ProductFieldLabel icon={FileText}>Descripción</ProductFieldLabel>
          <textarea
            value={form.descripcion}
            onChange={(event) => updateField("descripcion", event.target.value)}
            placeholder="Describe el producto, uso recomendado y características principales (5-400 caracteres)"
            className={productTextareaClassName}
            maxLength={400}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md"
          >
            {cancelLabel}
          </Button>
        ) : null}

        <Button type="submit" disabled={saving} className="rounded-md">
          {saving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
