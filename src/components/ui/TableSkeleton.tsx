import { Skeleton } from "./Skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 3, columns = 9 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-16" />
            </th>
            {Array.from({ length: columns - 2 }).map((_, i) => (
              <th key={i} className="px-3 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </th>
            ))}
            <th className="px-4 py-3 text-center bg-indigo-50">
              <Skeleton className="h-4 w-12 mx-auto" />
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-32" />
              </td>
              {Array.from({ length: columns - 2 }).map((_, colIdx) => (
                <td key={colIdx} className="px-3 py-3 text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </td>
              ))}
              <td className="px-4 py-3 text-center bg-indigo-50">
                <Skeleton className="h-4 w-12 mx-auto" />
              </td>
            </tr>
          ))}
          <tr className="bg-gray-100">
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-40" />
            </td>
            {Array.from({ length: columns - 2 }).map((_, colIdx) => (
              <td key={colIdx} className="px-3 py-3 text-center">
                <Skeleton className="h-4 w-10 mx-auto" />
              </td>
            ))}
            <td className="px-4 py-3 text-center bg-indigo-100">
              <Skeleton className="h-4 w-14 mx-auto" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
