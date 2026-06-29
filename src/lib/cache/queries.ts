import type { Prisma } from "@prisma/client";
import { unstable_cacheLife, unstable_cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { prisma } from "@/lib/prisma";
import { buildPageMeta, DEFAULT_PAGE_SIZE, pageOffset, type PageMeta } from "@/lib/pagination";
import type { DateRangeFilter } from "@/lib/utils";
import { transactionDateWhere } from "@/lib/utils";

const LIST_CACHE_SECONDS = 300;

function applyListCacheLife(tag: string) {
  unstable_cacheLife({ revalidate: LIST_CACHE_SECONDS });
  unstable_cacheTag(tag);
}

function productWhere(q: string): Prisma.ProductWhereInput {
  if (!q) {
    return {};
  }
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { unit: { contains: q, mode: "insensitive" } }
    ]
  };
}

function supplierWhere(q: string): Prisma.SupplierWhereInput {
  if (!q) {
    return {};
  }
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } }
    ]
  };
}

function customerWhere(q: string): Prisma.CustomerWhereInput {
  if (!q) {
    return {};
  }
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } }
    ]
  };
}

async function fetchProductsPage(page: number, q: string) {
  const where = productWhere(q);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE
    }),
    prisma.product.count({ where })
  ]);
  return { items, pagination: buildPageMeta(page, total) };
}

async function fetchSuppliersPage(page: number, q: string) {
  const where = supplierWhere(q);
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE
    }),
    prisma.supplier.count({ where })
  ]);
  return { items, pagination: buildPageMeta(page, total) };
}

async function fetchCustomersPage(page: number, q: string) {
  const where = customerWhere(q);
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE
    }),
    prisma.customer.count({ where })
  ]);
  return { items, pagination: buildPageMeta(page, total) };
}

type SalesListQuery = {
  page: number;
  rangeKey: string;
  from?: string;
  to?: string;
  customerId?: string;
};

type PurchasesListQuery = {
  page: number;
  rangeKey: string;
  from?: string;
  to?: string;
  supplierId?: string;
};

type PaymentsListQuery = {
  page: number;
  rangeKey: string;
  from?: string;
  to?: string;
  customerId?: string;
};

type SupplierPaymentsListQuery = {
  page: number;
  rangeKey: string;
  from?: string;
  to?: string;
  supplierId?: string;
};

function salesWhere(range: DateRangeFilter, customerId?: string): Prisma.SaleWhereInput {
  return {
    ...transactionDateWhere(range, "invoiceDate"),
    ...(customerId ? { customerId } : {})
  };
}

function purchasesWhere(range: DateRangeFilter, supplierId?: string): Prisma.PurchaseWhereInput {
  return {
    ...transactionDateWhere(range, "purchaseDate"),
    ...(supplierId ? { supplierId } : {})
  };
}

function paymentsWhere(range: DateRangeFilter, customerId?: string): Prisma.PaymentWhereInput {
  return {
    ...transactionDateWhere(range, "paymentDate"),
    ...(customerId ? { customerId } : {})
  };
}

function supplierPaymentsWhere(range: DateRangeFilter, supplierId?: string): Prisma.SupplierPaymentWhereInput {
  return {
    ...transactionDateWhere(range, "paymentDate"),
    ...(supplierId ? { supplierId } : {})
  };
}

async function fetchSalesPage(query: SalesListQuery, range: DateRangeFilter) {
  const where = salesWhere(range, query.customerId);
  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      skip: pageOffset(query.page),
      take: DEFAULT_PAGE_SIZE,
      include: { customer: true, items: { include: { product: true } } }
    }),
    prisma.sale.count({ where })
  ]);
  return { items, pagination: buildPageMeta(query.page, total) };
}

async function fetchPurchasesPage(query: PurchasesListQuery, range: DateRangeFilter) {
  const where = purchasesWhere(range, query.supplierId);
  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: { purchaseDate: "desc" },
      skip: pageOffset(query.page),
      take: DEFAULT_PAGE_SIZE,
      include: { supplier: true, items: { include: { product: true } } }
    }),
    prisma.purchase.count({ where })
  ]);
  return { items, pagination: buildPageMeta(query.page, total) };
}

async function fetchPaymentsPage(query: PaymentsListQuery, range: DateRangeFilter) {
  const where = paymentsWhere(range, query.customerId);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: pageOffset(query.page),
      take: DEFAULT_PAGE_SIZE,
      include: {
        customer: true,
        ledgerEntries: { take: 1, orderBy: { entryDate: "desc" } }
      }
    }),
    prisma.payment.count({ where })
  ]);
  return { items, pagination: buildPageMeta(query.page, total) };
}

export async function getCachedProductsPage(page: number, q: string) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.products);
  return fetchProductsPage(page, q);
}

export async function getCachedSuppliersPage(page: number, q: string) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.suppliers);
  return fetchSuppliersPage(page, q);
}

export async function getCachedCustomersPage(page: number, q: string) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.customers);
  return fetchCustomersPage(page, q);
}

export async function getCachedSalesPage(query: SalesListQuery, range: DateRangeFilter) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.sales);
  return fetchSalesPage(query, range);
}

export async function getCachedPurchasesPage(query: PurchasesListQuery, range: DateRangeFilter) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.purchases);
  return fetchPurchasesPage(query, range);
}

export async function getCachedPaymentsPage(query: PaymentsListQuery, range: DateRangeFilter) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.payments);
  return fetchPaymentsPage(query, range);
}

async function fetchSupplierPaymentsPage(query: SupplierPaymentsListQuery, range: DateRangeFilter) {
  const where = supplierPaymentsWhere(range, query.supplierId);
  const [items, total] = await Promise.all([
    prisma.supplierPayment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: pageOffset(query.page),
      take: DEFAULT_PAGE_SIZE,
      include: {
        supplier: true,
        ledgerEntries: { take: 1, orderBy: { entryDate: "desc" } }
      }
    }),
    prisma.supplierPayment.count({ where })
  ]);
  return { items, pagination: buildPageMeta(query.page, total) };
}

export async function getCachedSupplierPaymentsPage(query: SupplierPaymentsListQuery, range: DateRangeFilter) {
  "use cache";
  applyListCacheLife(CACHE_TAGS.supplierPayments);
  return fetchSupplierPaymentsPage(query, range);
}

export type { PageMeta };