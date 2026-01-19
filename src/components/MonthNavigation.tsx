import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthYear, getAdjacentMonth } from "@/lib/date-utils";

interface MonthNavigationProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthNavigation({
  currentMonth,
  onMonthChange,
}: MonthNavigationProps) {
  const handlePrevMonth = () => {
    onMonthChange(getAdjacentMonth(currentMonth, -1));
  };

  const handleNextMonth = () => {
    onMonthChange(getAdjacentMonth(currentMonth, 1));
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-indigo-100 px-3 sm:px-4 py-2 sm:py-3">
      <button
        onClick={handlePrevMonth}
        className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
        {formatMonthYear(currentMonth)}
      </h3>
      <button
        onClick={handleNextMonth}
        className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
