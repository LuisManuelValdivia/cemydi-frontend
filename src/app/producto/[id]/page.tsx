import { notFound } from "next/navigation";
import { getCatalogProductById } from "@/services/catalog";
import ProductDetailClient from "./ProductDetailClient";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function loadProductOrThrowNotFound(productId: number) {
  try {
    const result = await getCatalogProductById(productId);
    return result.product;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("no encontrado") || message.includes("not found")) {
      notFound();
    }

    throw error;
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const product = await loadProductOrThrowNotFound(productId);

  return <ProductDetailClient product={product} productId={productId} />;
}
