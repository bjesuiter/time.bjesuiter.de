import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { WeekInfo } from "@/lib/date-utils";
import {
  formatWeekRange,
  getAdjacentMonth,
  getAdjacentWeek,
} from "@/lib/date-utils";

interface WeekNavigationBarProps {
  weeks: WeekInfo[];
  currentMonth: string;
  selectedWeek: string;
  onMonthChange: (month: string) => void;
  onWeekChange: (weekStartDate: string, newMonth?: string) => void;
  onWeekSelect: (weekStartDate: string) => void;
}

export function WeekNavigationBar({
  weeks,
  currentMonth,
  selectedWeek,
  onMonthChange,
  onWeekChange,
  onWeekSelect,
}: WeekNavigationBarProps) {
  const handlePrevMonth = () => {
    const newMonth = getAdjacentMonth(currentMonth, -1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = getAdjacentMonth(currentMonth, 1);
    onMonthChange(newMonth);
  };

  const handlePrevWeek = () => {
    const newWeek = getAdjacentWeek(selectedWeek, -1);
    const currentMonthNum = parseInt(currentMonth.split("-")[1], 10);
    const newWeekDate = new Date(newWeek);
    const newWeekMonth = newWeekDate.getMonth() + 1;
    const newMonthStr =
      newWeekMonth !== currentMonthNum
        ? `${newWeekDate.getFullYear()}-${String(newWeekMonth).padStart(2, "0")}`
        : undefined;
    onWeekChange(newWeek, newMonthStr);
  };

  const handleNextWeek = () => {
    const newWeek = getAdjacentWeek(selectedWeek, 1);
    const currentMonthNum = parseInt(currentMonth.split("-")[1], 10);
    const newWeekDate = new Date(newWeek);
    const newWeekMonth = newWeekDate.getMonth() + 1;
    const newMonthStr =
      newWeekMonth !== currentMonthNum
        ? `${newWeekDate.getFullYear()}-${String(newWeekMonth).padStart(2, "0")}`
        : undefined;
    onWeekChange(newWeek, newMonthStr);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Previous month (<<) and Previous week (<) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go to previous month"
            title="Previous month"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handlePrevWeek}
            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go to previous week"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Center: Week selector */}
        <div className="flex-1 overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-2 sm:flex-wrap justify-center min-w-max sm:min-w-0">
            {weeks.map((week) => {
              const isSelected = week.startDate === selectedWeek;

              return (
                <button
                  key={week.startDate}
                  onClick={() => onWeekSelect(week.startDate)}
                  className={`
                    px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg border transition-all shrink-0 min-h-[44px] flex items-center
                    ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium"
                        : week.isInPreviousMonth
                          ? "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-gray-100"
                          : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                    }
                    ${
                      week.isCurrentWeek && !isSelected
                        ? "ring-2 ring-indigo-200 ring-offset-1"
                        : ""
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    {week.label}
                    {week.isCurrentWeek && (
                      <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                        Now
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Next week (>) and Next month (>>) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleNextWeek}
            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go to next week"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go to next month"
            title="Next month"
          >
            <ChevronsRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Current week display */}
      <div className="text-center mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
        <span className="text-sm sm:text-base font-semibold text-gray-900">
          {formatWeekRange(selectedWeek)}
        </span>
      </div>
    </div>
  );
}
