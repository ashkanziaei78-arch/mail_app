import { CardsSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-6 h-9 w-40" />
      <CardsSkeleton />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><TableSkeleton rows={5} columns={5} /></div>
        <TableSkeleton rows={4} columns={1} />
      </div>
    </>
  );
}
