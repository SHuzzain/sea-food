export const DEFAULT_PAGE_SIZE = 20;

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function parsePageParam(value?: string) {
  const page = Number(value ?? 1);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

export function pageOffset(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return (page - 1) * pageSize;
}

export function buildPageMeta(page: number, total: number, pageSize = DEFAULT_PAGE_SIZE): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(Math.max(page, 1), totalPages),
    pageSize,
    total,
    totalPages
  };
}