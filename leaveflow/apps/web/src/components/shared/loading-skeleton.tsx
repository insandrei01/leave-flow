/**
 * LoadingSkeleton — shimmer loading placeholders matching glass card shapes.
 *
 * Provides pre-built skeletons for common card types:
 *   - StatCard
 *   - TableRow
 *   - Generic block (full-width)
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Base shimmer block
   ========================================================================= */

interface ShimmerProps {
  readonly className?: string;
  readonly "aria-hidden"?: boolean;
}

export function Shimmer({ className, "aria-hidden": ariaHidden = true }: ShimmerProps) {
  return (
    <div
      aria-hidden={ariaHidden}
      className={cn(
        "shimmer rounded-xl bg-surface-glass",
        className
      )}
    />
  );
}

/* =========================================================================
   StatCard skeleton
   ========================================================================= */

export function StatCardSkeleton({ className }: { readonly className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading stat card"
      className={cn(
        "glass-card p-6 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-5 w-5 rounded-lg" />
      </div>
      <Shimmer className="h-9 w-16" />
      <Shimmer className="h-3 w-32" />
    </div>
  );
}

/* =========================================================================
   Table row skeleton
   ========================================================================= */

interface TableRowSkeletonProps {
  readonly columns?: number;
  readonly className?: string;
}

export function TableRowSkeleton({ columns = 5, className }: TableRowSkeletonProps) {
  return (
    <tr
      role="status"
      aria-label="Loading row"
      className={cn("border-b border-border-glass", className)}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Shimmer
            className={cn(
              "h-4",
              i === 0 ? "w-32" : i === columns - 1 ? "w-16" : "w-24"
            )}
          />
        </td>
      ))}
    </tr>
  );
}

/* =========================================================================
   Block skeleton (full width)
   ========================================================================= */

interface BlockSkeletonProps {
  readonly lines?: number;
  readonly className?: string;
}

export function BlockSkeleton({ lines = 3, className }: BlockSkeletonProps) {
  const widths = ["w-full", "w-4/5", "w-3/5"];

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={cn("space-y-2", className)}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn("h-4", widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

/* =========================================================================
   Glass card skeleton (generic)
   ========================================================================= */

export function GlassCardSkeleton({
  className,
  height = "h-40",
}: {
  readonly className?: string;
  readonly height?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading card"
      className={cn("glass-card p-6", height, className)}
    >
      <BlockSkeleton />
    </div>
  );
}
