import { Skeleton } from "./Skeleton";

export function OvertimeSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-8 w-20 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CumulativeOvertimeSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-3 w-28 mb-2" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-3 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
