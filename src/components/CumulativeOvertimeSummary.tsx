import { TrendingUp, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { formatOvertimeDisplay } from "@/lib/overtime-utils";

export interface CumulativeOvertimeSummaryProps {
  isLoading: boolean;
  hasStartDate: boolean;
  startDate?: string;
  cumulativeOvertimeSeconds: number;
  weeksIncluded: number;
  error?: string;
}

export function CumulativeOvertimeSummary({
  isLoading,
  hasStartDate,
  startDate,
  cumulativeOvertimeSeconds,
  weeksIncluded,
  error,
}: CumulativeOvertimeSummaryProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mr-2" />
        <span className="text-gray-600 text-sm">
          Calculating cumulative overtime...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (!hasStartDate) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">
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
      className={`rounded-lg shadow p-4 ${
        isPositive
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
          : "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${
              isPositive ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <TrendIcon
              className={`w-5 h-5 ${isPositive ? "text-green-600" : "text-red-600"}`}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Cumulative Overtime
            </p>
            <p
              className={`text-2xl font-bold ${
                isPositive ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatOvertimeDisplay(cumulativeOvertimeSeconds)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-500 text-xs">
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
          <p className="text-xs text-gray-400 mt-1">{weeksIncluded} weeks</p>
        </div>
      </div>
    </div>
  );
}
