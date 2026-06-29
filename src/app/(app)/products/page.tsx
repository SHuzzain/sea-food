import { Suspense } from "react";
import { ProductManager, type ProductRow } from "@/components/masters/product-manager";
import { getCachedProductsPage } from "@/lib/cache/queries";
import { parsePageParam } from "@/lib/pagination";

type ProductsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const query = params.q?.trim() ?? "";
  const { items, pagination } = await getCachedProductsPage(page, query);

  const rows: ProductRow[] = items.map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    status: product.status
  }));

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Products</h1>
        <p className="text-sm text-muted-foreground">Manage fish names such as Nethili, Vanjaram, Prawn and Crab.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading products...</div>}>
        <ProductManager products={rows} pagination={pagination} query={query} />
      </Suspense>
    </div>
  );
}