"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatRupee } from "@/lib/utils";
import type { SelectOption } from "@/lib/options";

type SearchableSelectProps = {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
  displayKey?: "label" | "meta";
  showBalance?: boolean;
};

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  onAdd,
  addLabel,
  className,
  displayKey = "label",
  showBalance = false
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const selectedDisplay =
    displayKey === "meta" ? selected?.meta || selected?.label || "" : selected?.label ?? "";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options.slice(0, 12);
    }
    return options
      .filter((option) => [option.label, option.meta ?? ""].join(" ").toLowerCase().includes(needle))
      .slice(0, 12);
  }, [options, query]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        {onAdd ? (
          <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {addLabel ?? "Add"}
          </Button>
        ) : null}
      </div>
      <div className="relative">
        <Input
          value={open ? query : selectedDisplay}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
        {open ? (
          <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-soft">
            {visible.length ? (
              visible.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.meta ? <span className="block truncate text-xs text-muted-foreground">{option.meta}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {showBalance && option.balance !== undefined ? (
                      <span className="text-xs font-semibold">{formatRupee(option.balance)}</span>
                    ) : null}
                    {option.id === value ? <Check className="h-4 w-4 text-primary" /> : null}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">No matches found.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
