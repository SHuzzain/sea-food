"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/lib/pagination";

export function PaginationControls({ meta }: { meta: PageMeta }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (meta.totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        Showing {meta.total} {meta.total === 1 ? "record" : "records"}
      </p>
    );
  }

  function hrefForPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const start = (meta.page - 1) * meta.pageSize + 1;
  const end = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        {meta.page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(meta.page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
        )}
        <span className="min-w-24 text-center text-sm text-muted-foreground">
          Page {meta.page} of {meta.totalPages}
        </span>
        {meta.page >= meta.totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(meta.page + 1)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}