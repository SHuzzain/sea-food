import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

export function invalidateProductsCache() {
  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.options);
}

export function invalidateSuppliersCache() {
  revalidateTag(CACHE_TAGS.suppliers);
  revalidateTag(CACHE_TAGS.options);
  revalidateTag(CACHE_TAGS.purchases);
  revalidateTag(CACHE_TAGS.supplierPayments);
}

export function invalidateCustomersCache() {
  revalidateTag(CACHE_TAGS.customers);
  revalidateTag(CACHE_TAGS.options);
  revalidateTag(CACHE_TAGS.sales);
  revalidateTag(CACHE_TAGS.payments);
}

export function invalidateSalesCache() {
  revalidateTag(CACHE_TAGS.sales);
}

export function invalidatePurchasesCache() {
  revalidateTag(CACHE_TAGS.purchases);
}

export function invalidatePaymentsCache() {
  revalidateTag(CACHE_TAGS.payments);
}

export function invalidateSupplierPaymentsCache() {
  revalidateTag(CACHE_TAGS.supplierPayments);
}