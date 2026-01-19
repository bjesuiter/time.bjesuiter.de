import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DailyBreakdown } from "@/lib/clockify/types";
import {
  calculateWeeklyOvertime,
  formatOvertimeDisplay,
  formatHoursMinutes,
} from "@/lib/overtime-utils";

interface OvertimeSummaryProps {
  dailyBreakdown: Record<string, DailyBreakdown>;
  regularHoursPerWeek: number;
  workingDaysPerWeek: number;
}

export function OvertimeSummary({
  dailyBreakdown,
  regularHoursPerWeek,
  workingDaysPerWeek,
}: OvertimeSummaryProps) {
  const overtimeResult = calculateWeeklyOvertime(
    dailyBreakdown,
    regularHoursPerWeek,
    workingDaysPerWeek,
  );

  const { totalWorkedSeconds, totalExpectedSeconds, totalOvertimeSeconds } =
    overtimeResult;

  const isPositive = totalOvertimeSeconds > 0;
  const isNegative = totalOvertimeSeconds < 0;
  const isNeutral = totalOvertimeSeconds === 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Weekly Overtime
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg">
          <p className="text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">
            Worked
          </p>
          <p className="text-base sm:text-2xl font-bold text-gray-900">
            {formatHoursMinutes(totalWorkedSeconds)}
          </p>
        </div>

        <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg">
          <p className="text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">
            Expected
          </p>
          <p className="text-base sm:text-2xl font-bold text-gray-900">
            {formatHoursMinutes(totalExpectedSeconds)}
          </p>
        </div>

        <div
          className={`text-center p-2 sm:p-4 rounded-lg ${
            isPositive ? "bg-green-50" : isNegative ? "bg-red-50" : "bg-gray-50"
          }`}
        >
          <p className="text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">
            Overtime
          </p>
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
            {isPositive && (
              <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-green-600" />
            )}
            {isNegative && (
              <TrendingDown className="w-4 sm:w-5 h-4 sm:h-5 text-red-600" />
            )}
            {isNeutral && (
              <Minus className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
            )}
            <p
              className={`text-base sm:text-2xl font-bold ${
                isPositive
                  ? "text-green-600"
                  : isNegative
                    ? "text-red-600"
                    : "text-gray-900"
              }`}
            >
              {formatOvertimeDisplay(totalOvertimeSeconds)}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] sm:text-xs text-gray-400 mt-3 sm:mt-4 text-center">
        Based on {regularHoursPerWeek}h/week over {workingDaysPerWeek} working
        days
      </p>
    </div>
  );
}
