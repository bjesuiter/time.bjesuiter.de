import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getMonthBoundaries,
  getPreviousWeekStart,
  getWeekStart,
  getWeeksInMonth,
  type WeekStart,
} from "@/lib/utils/dateUtils";

interface MonthNavigationProps {
  currentDate: Date;
  weekStart: WeekStart;
  onWeekSelect: (weekStart: string) => void;
  selectedWeekStart?: string;
}

export function MonthNavigation({
  currentDate,
  weekStart,
  onWeekSelect,
  selectedWeekStart,
}: MonthNavigationProps) {
  const [viewDate, setViewDate] = useState(currentDate);

  // Get month boundaries
  const { start: monthStart, end: monthEnd } = getMonthBoundaries(viewDate);

  // Get all weeks in the current month
  const weeksInMonth = getWeeksInMonth(viewDate, weekStart);

  // Get previous week (the week before the first week of the month)
  const firstWeekStart = weeksInMonth[0];
  const previousWeekStart = firstWeekStart
    ? getPreviousWeekStart(firstWeekStart, weekStart)
    : null;

  // Combine previous week + weeks in month
  const allWeeks = previousWeekStart
    ? [previousWeekStart, ...weeksInMonth]
    : weeksInMonth;

  // Format month name
  const monthName = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
  };

  // Navigate to current month
  const goToCurrentMonth = () => {
    setViewDate(new Date());
  };

  // Format week range for display
  const formatWeekRange = (weekStartDate: Date) => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const startStr = weekStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = weekEndDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return `${startStr} - ${endStr}`;
  };

  // Check if a week is selected
  const isWeekSelected = (weekStartDate: Date) => {
    if (!selectedWeekStart) return false;
    const selectedDate = new Date(selectedWeekStart);
    return (
      weekStartDate.toISOString().split("T")[0] ===
      selectedDate.toISOString().split("T")[0]
    );
  };

  // Check if viewDate is current month
  const isCurrentMonth =
    viewDate.getMonth() === new Date().getMonth() &&
    viewDate.getFullYear() === new Date().getFullYear();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToCurrentMonth}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Weeks List */}
      <div className="space-y-2">
        {allWeeks.map((weekStartDate, index) => {
          const isPreviousWeek = index === 0 && previousWeekStart !== null;
          const isSelected = isWeekSelected(weekStartDate);
          const weekStartStr = weekStartDate.toISOString().split("T")[0];

          return (
            <button
              key={weekStartStr}
              onClick={() => onWeekSelect(weekStartStr)}
              className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
                isSelected
                  ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-900"
                  : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent text-gray-700"
              } ${isPreviousWeek ? "opacity-75" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {isPreviousWeek && (
                      <span className="text-xs text-gray-500 mr-2">
                        Previous Week
                      </span>
                    )}
                    {formatWeekRange(weekStartDate)}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
