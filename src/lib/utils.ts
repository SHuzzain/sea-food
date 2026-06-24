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

export function todayInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
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

export function dateRangeFromFilter(filter: {
  range?: string;
  from?: string;
  to?: string;
}) {
  const now = new Date();
  if (filter.range === "week") {
    return { from: startOfWeek(now), to: endOfDay(now), label: "This Week" };
  }
  if (filter.range === "month") {
    return { from: startOfMonth(now), to: endOfDay(now), label: "This Month" };
  }
  if (filter.range === "custom" && filter.from && filter.to) {
    return {
      from: startOfDay(parseDateInput(filter.from)),
      to: endOfDay(parseDateInput(filter.to)),
      label: `${filter.from} to ${filter.to}`
    };
  }
  return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
}

export function decimalToNumber(value: { toString(): string } | number | string | null | undefined) {
  return Number(value?.toString() ?? 0);
}
