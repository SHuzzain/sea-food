import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupee(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number.isFinite(number) ? number : 0);
}

export function formatReportMoney(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return (Number.isFinite(number) ? number : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatKg(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toFixed(3).replace(/\.?0+$/, "") : "0"} kg`;
}

export function toMoney(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }
  return Math.round(number * 100) / 100;
}

export function toQuantity(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }
  return Math.round(number * 1000) / 1000;
}

export function coerceDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatDisplayDate(value: Date | string, locale = "en-IN") {
  return coerceDate(value).toLocaleDateString(locale);
}

export function todayInputValue(date: Date | string = new Date()) {
  const parsed = coerceDate(date);
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export const DEFAULT_DATE_RANGE = "week";
export const DEFAULT_LIST_DATE_RANGE = "all";

export type DateRangeFilter = {
  label: string;
  from?: Date;
  to?: Date;
};

export function dateRangeFromFilter(
  filter: {
    range?: string;
    from?: string;
    to?: string;
  },
  defaultRange: string = DEFAULT_DATE_RANGE
): DateRangeFilter {
  const now = new Date();
  const range = filter.range ?? defaultRange;

  if (range === "all") {
    return { label: "All Time" };
  }
  if (range === "today") {
    return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
  }
  if (range === "week") {
    return { from: startOfWeek(now), to: endOfDay(now), label: "This Week" };
  }
  if (range === "month") {
    return { from: startOfMonth(now), to: endOfDay(now), label: "This Month" };
  }
  if (range === "custom" && filter.from) {
    const toValue = filter.to ?? filter.from;
    return {
      from: startOfDay(parseDateInput(filter.from)),
      to: endOfDay(parseDateInput(toValue)),
      label:
        filter.to && filter.to !== filter.from
          ? `${filter.from} to ${filter.to}`
          : parseDateInput(filter.from).toLocaleDateString("en-IN")
    };
  }
  return { from: startOfWeek(now), to: endOfDay(now), label: "This Week" };
}

export function transactionDateWhere(
  range: DateRangeFilter,
  field: "invoiceDate" | "purchaseDate" | "paymentDate"
) {
  if (!range.from || !range.to) {
    return {};
  }
  return { [field]: { gte: range.from, lte: range.to } };
}

export function decimalToNumber(value: { toString(): string } | number | string | null | undefined) {
  return Number(value?.toString() ?? 0);
}
