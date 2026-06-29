import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export type SelectOption = {
  id: string;
  label: string;
  meta?: string;
  balance?: number;
  unit?: string;
};

const OPTIONS_CACHE_SECONDS = 300;

async function fetchCustomerOptions(): Promise<SelectOption[]> {
  const customers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, mobile: true, outstandingBalance: true }
  });
  return customers.map((customer) => ({
    id: customer.id,
    label: customer.name,
    meta: customer.mobile ?? "",
    balance: decimalToNumber(customer.outstandingBalance)
  }));
}

async function fetchSupplierOptions(): Promise<SelectOption[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, mobile: true }
  });
  return suppliers.map((supplier) => ({
    id: supplier.id,
    label: supplier.name,
    meta: supplier.mobile ?? ""
  }));
}

async function fetchProductOptions(): Promise<SelectOption[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true }
  });
  return products.map((product) => ({
    id: product.id,
    label: product.name,
    meta: product.unit,
    unit: product.unit
  }));
}

export function getCustomerOptions() {
  return unstable_cache(fetchCustomerOptions, ["customer-options"], {
    tags: [CACHE_TAGS.options, CACHE_TAGS.customers],
    revalidate: OPTIONS_CACHE_SECONDS
  })();
}

export function getSupplierOptions() {
  return unstable_cache(fetchSupplierOptions, ["supplier-options"], {
    tags: [CACHE_TAGS.options, CACHE_TAGS.suppliers],
    revalidate: OPTIONS_CACHE_SECONDS
  })();
}

export function getProductOptions() {
  return unstable_cache(fetchProductOptions, ["product-options"], {
    tags: [CACHE_TAGS.options, CACHE_TAGS.products],
    revalidate: OPTIONS_CACHE_SECONDS
  })();
}