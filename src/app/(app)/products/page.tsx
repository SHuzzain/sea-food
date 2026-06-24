import { ProductManager, type ProductRow } from "@/components/masters/product-manager";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" }
  });

  const rows: ProductRow[] = products.map((product) => ({
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
      <ProductManager products={rows} />
    </div>
  );
}
