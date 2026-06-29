"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MasterListToolbar({
  query,
  placeholder,
  children
}: {
  query: string;
  placeholder: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const needle = value.trim();
    if (needle) {
      params.set("q", needle);
    } else {
      params.delete("q");
    }
    params.delete("page");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form className="relative flex-1" onSubmit={applySearch}>
        <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </form>
      {children}
    </div>
  );
}