/** اسکلت بارگذاری — فضای محتوا از قبل رزرو می‌شود تا صفحه هنگام آمدن داده نپرد (CLS). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: "var(--surface-2)" }} />;
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card p-4" role="status" aria-label="در حال بارگذاری اطلاعات">
      <span className="sr-only">در حال بارگذاری…</span>
      <Skeleton className="mb-4 h-8 w-48" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-3">
            {Array.from({ length: columns }).map((_, column) => (
              <Skeleton key={column} className="h-9 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="در حال بارگذاری">
      <span className="sr-only">در حال بارگذاری…</span>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>
  );
}
