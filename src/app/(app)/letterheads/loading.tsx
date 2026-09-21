import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-6 h-9 w-56" />
      <TableSkeleton />
    </>
  );
}
