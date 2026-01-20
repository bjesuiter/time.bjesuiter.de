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
  getWeekStartForDate,
  parseLocalDate,
  toISODate,
} from "@/lib/date-utils";

interface TimelineBoundaries {
  starts: string[];
  ends: string[];
}

interface WeekNavigationBarProps {
  weeks: WeekInfo[];
  currentMonth: string;
  selectedWeek: string;
  configValidFrom?: string | null;
  configValidUntil?: string | null;
  timelineBoundaries?: TimelineBoundaries;
  weekStart?: "MONDAY" | "SUNDAY";
  onMonthChange: (month: string) => void;
  onWeekChange: (weekStartDate: string, newMonth?: string) => void;
  onWeekSelect: (weekStartDate: string) => void;
}

export function WeekNavigationBar({
  weeks,
  currentMonth,
  selectedWeek,
  configValidFrom,
  configValidUntil,
  timelineBoundaries,
  weekStart = "MONDAY",
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

  const navigateToDate = (targetDate: Date) => {
    const weekStartDate = getWeekStartForDate(targetDate, weekStart);
    const newWeek = toISODate(weekStartDate);
    const newWeekMonth = weekStartDate.getMonth() + 1;
    const newMonthStr = `${weekStartDate.getFullYear()}-${String(newWeekMonth).padStart(2, "0")}`;
    onWeekChange(newWeek, newMonthStr);
  };

  const getWeekForDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return toISODate(getWeekStartForDate(date, weekStart));
  };

  const nowWeek = toISODate(getWeekStartForDate(new Date(), weekStart));
  const starts = timelineBoundaries?.starts ?? (configValidFrom ? [configValidFrom] : []);
  const earliestStartWeek = starts.length > 0 ? getWeekForDate(starts[0]) : null;
  
  const isStartDisabled = !earliestStartWeek || selectedWeek <= earliestStartWeek;
  const isEndDisabled = selectedWeek >= nowWeek;

  const handleJumpToConfigStart = () => {
    if (!timelineBoundaries?.starts.length && !configValidFrom) return;

    const starts = timelineBoundaries?.starts ?? (configValidFrom ? [configValidFrom] : []);
    const currentWeekStart = selectedWeek;

    for (let i = starts.length - 1; i >= 0; i--) {
      const startWeek = getWeekForDate(starts[i]);
      if (startWeek < currentWeekStart) {
        navigateToDate(parseLocalDate(starts[i]));
        return;
      }
    }

    if (starts.length > 0) {
      navigateToDate(parseLocalDate(starts[0]));
    }
  };

  const handleJumpToConfigEnd = () => {
    const ends = timelineBoundaries?.ends ?? [];
    const currentWeekStart = selectedWeek;
    const nowWeek = toISODate(getWeekStartForDate(new Date(), weekStart));

    for (const endDate of ends) {
      const endWeek = getWeekForDate(endDate);
      if (endWeek > currentWeekStart) {
        const targetWeek = endWeek > nowWeek ? nowWeek : endWeek;
        if (targetWeek !== currentWeekStart) {
          navigateToDate(parseLocalDate(endWeek > nowWeek ? toISODate(new Date()) : endDate));
          return;
        }
      }
    }

    if (nowWeek > currentWeekStart) {
      navigateToDate(new Date());
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Jump to config start, Previous month, Previous week */}
        {/* 3-column, 2-row grid with subgrid buttons for unified hover */}
        <div className="grid grid-cols-3 grid-rows-2 shrink-0">
          {/* Button 1: Phase Start */}
          <button
            onClick={handleJumpToConfigStart}
            disabled={isStartDisabled}
            className="row-span-2 grid grid-rows-subgrid p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Jump to config start date"
            title={
              isStartDisabled
                ? "Already at earliest config start"
                : `Jump to previous config start`
            }
          >
            <span className="flex items-center justify-center text-gray-600 font-bold text-sm">
              |«
            </span>
            <span className="flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 leading-tight text-center">
              Start
            </span>
          </button>

          {/* Button 2: Previous Month */}
          <button
            onClick={handlePrevMonth}
            className="row-span-2 grid grid-rows-subgrid p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px]"
            aria-label="Go to previous month"
            title="Previous month"
          >
            <span className="flex items-center justify-center">
              <ChevronsLeft className="w-5 h-5 text-gray-600" />
            </span>
            <span className="flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 leading-tight text-center">
              Month
            </span>
          </button>

          {/* Button 3: Previous Week */}
          <button
            onClick={handlePrevWeek}
            className="row-span-2 grid grid-rows-subgrid p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px]"
            aria-label="Go to previous week"
            title="Previous week"
          >
            <span className="flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </span>
            <span className="flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 leading-tight text-center">
              Week
            </span>
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

        {/* Right side: Next week, Next month, Jump to config end */}
        {/* 3-column, 2-row grid with subgrid buttons for unified hover */}
        <div className="grid grid-cols-3 grid-rows-2 shrink-0">
          {/* Button 1: Next Week */}
          <button
            onClick={handleNextWeek}
            className="row-span-2 grid grid-rows-subgrid p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px]"
            aria-label="Go to next week"
            title="Next week"
          >
            <span className="flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </span>
            <span className="flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 leading-tight text-center">
              Week
            </span>
          </button>

          {/* Button 2: Next Month */}
          <button
            onClick={handleNextMonth}
            className="row-span-2 grid grid-rows-subgrid p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px]"
            aria-label="Go to next month"
            title="Next month"
          >
            <span className="flex items-center justify-center">
              <ChevronsRight className="w-5 h-5 text-gray-600" />
            </span>
            <span className="flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 leading-tight text-center">
              Month
            </span>
          </button>

          {/* Button 3: Phase End / Now */}
          <button
            onClick={handleJumpToConfigEnd}
            disabled={isEndDisabled}
            className="row-span-2 grid grid-rows-subgrid p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={
              isEndDisabled
                ? "Already at current week"
                : "Jump to next config end or now"
            }
            title={
              isEndDisabled
                ? "Already at current week"
                : "Jump to next config end or now"
            }
          >
            <span className="flex items-center justify-center text-gray-600 font-bold text-sm">
              »|
            </span>
            <span className="flex items-center justify-center text-[9px] sm:text-[10px] text-gray-400 leading-tight text-center">
              {configValidUntil ? "End" : "Now"}
            </span>
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
