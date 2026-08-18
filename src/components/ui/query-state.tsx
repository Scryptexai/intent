"use client";
import { RefreshCw, Inbox, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";

/** Loading (shimmer) / Error (+Retry) / Empty (+action) states — [6] spec. */
export function QueryState({
  isLoading,
  isError,
  isEmpty,
  retry,
  emptyLabel = "No data available",
  emptyAction,
  rows = 3,
}: {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  retry?: () => void;
  emptyLabel?: string;
  emptyAction?: React.ReactNode;
  rows?: number;
}) {
  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 shimmer" />
        ))}
      </div>
    );
  if (isError)
    return (
      <div className="grid place-items-center gap-3 rounded-lg border border-intent-rose/30 bg-intent-rose/5 p-8 text-center">
        <TriangleAlert className="h-6 w-6 text-intent-rose" />
        <p className="text-sm text-muted-foreground">Failed to load. Check your connection, then retry.</p>
        {retry && (
          <Button size="sm" variant="outline" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  if (isEmpty)
    return (
      <div className="grid place-items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
        <Inbox className="h-6 w-6 text-intent-muted" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        {emptyAction}
      </div>
    );
  return null;
}
