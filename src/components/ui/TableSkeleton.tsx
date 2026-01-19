import { Skeleton } from "./Skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 3, columns = 9 }: TableSkeletonProps) {
  return (
    <div className="-mx-4 sm:mx-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-left min-w-[100px] sm:min-w-[140px]">
                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
              </th>
              {Array.from({ length: columns - 2 }).map((_, i) => (
                <th
                  key={i}
                  className="px-1.5 sm:px-3 py-2 sm:py-3 text-center min-w-[48px] sm:min-w-[60px]"
                >
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <Skeleton className="h-2.5 sm:h-3 w-6 sm:w-8" />
                    <Skeleton className="h-2.5 sm:h-3 w-8 sm:w-12" />
                  </div>
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-indigo-50 px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[50px] sm:min-w-[70px]">
                <Skeleton className="h-3 sm:h-4 w-8 sm:w-12 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-2 sm:py-3 min-w-[100px] sm:min-w-[140px]">
                  <Skeleton className="h-3 sm:h-4 w-20 sm:w-32" />
                </td>
                {Array.from({ length: columns - 2 }).map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-1.5 sm:px-3 py-2 sm:py-3 text-center"
                  >
                    <Skeleton className="h-3 sm:h-4 w-7 sm:w-10 mx-auto" />
                  </td>
                ))}
                <td className="sticky right-0 z-10 bg-indigo-50 px-2 sm:px-4 py-2 sm:py-3 text-center">
                  <Skeleton className="h-3 sm:h-4 w-8 sm:w-12 mx-auto" />
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100">
              <td className="sticky left-0 z-10 bg-gray-100 px-3 sm:px-4 py-2 sm:py-3 min-w-[100px] sm:min-w-[140px]">
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-40" />
              </td>
              {Array.from({ length: columns - 2 }).map((_, colIdx) => (
                <td
                  key={colIdx}
                  className="px-1.5 sm:px-3 py-2 sm:py-3 text-center"
                >
                  <Skeleton className="h-3 sm:h-4 w-7 sm:w-10 mx-auto" />
                </td>
              ))}
              <td className="sticky right-0 z-10 bg-indigo-100 px-2 sm:px-4 py-2 sm:py-3 text-center">
                <Skeleton className="h-3 sm:h-4 w-9 sm:w-14 mx-auto" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
