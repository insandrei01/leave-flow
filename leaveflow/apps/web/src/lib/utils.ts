import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 * Combines clsx (conditional class names) with tailwind-merge
 * (deduplication of conflicting Tailwind utilities, e.g. `p-2` + `p-4`).
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-accent-indigo", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
