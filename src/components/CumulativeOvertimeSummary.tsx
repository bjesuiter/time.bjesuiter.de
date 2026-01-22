import { TrendingUp, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { formatOvertimeDisplay } from "@/lib/overtime-utils";

export interface CumulativeOvertimeSummaryProps {
  isLoading: boolean;
  hasStartDate: boolean;
  startDate?: string;
  cumulativeOvertimeSeconds: number;
  weeksIncluded: number;
  error?: string;
  estimatedWeeksTotal?: number;
}

export function CumulativeOvertimeSummary({
  isLoading,
  hasStartDate,
  startDate,
  cumulativeOvertimeSeconds,
  weeksIncluded,
  error,
  estimatedWeeksTotal,
}: CumulativeOvertimeSummaryProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-500 animate-spin mr-2" />
          <span className="text-gray-600 text-xs sm:text-sm">
            Calculating cumulative overtime
            {estimatedWeeksTotal ? ` (${estimatedWeeksTotal} weeks)` : ""}...
          </span>
        </div>
        {estimatedWeeksTotal && estimatedWeeksTotal > 10 && (
          <p className="text-center text-gray-400 text-[10px] mt-1">
            This may take a moment for large date ranges
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
        <p className="text-red-800 text-xs sm:text-sm">{error}</p>
      </div>
    );
  }

  if (!hasStartDate) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
        <p className="text-gray-600 text-xs sm:text-sm">
          No cumulative overtime start date configured. Set one in Clockify
          setup to track total overtime.
        </p>
      </div>
    );
  }

  const isPositive = cumulativeOvertimeSeconds >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`rounded-lg shadow p-3 sm:p-4 ${
        isPositive
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
          : "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className={`p-1.5 sm:p-2 rounded-full shrink-0 ${
              isPositive ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <TrendIcon
              className={`w-4 sm:w-5 h-4 sm:h-5 ${isPositive ? "text-green-600" : "text-red-600"}`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
              Cumulative Overtime
            </p>
            <p
              className={`text-lg sm:text-2xl font-bold ${
                isPositive ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatOvertimeDisplay(cumulativeOvertimeSeconds)}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-gray-500 text-[10px] sm:text-xs justify-end">
            <Calendar className="w-3 h-3" />
            <span>
              Since{" "}
              {startDate
                ? new Date(startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
            {weeksIncluded} weeks
          </p>
        </div>
      </div>
    </div>
  );
}
