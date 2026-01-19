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
    <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-indigo-100 px-4 py-3">
      <button
        onClick={handlePrevMonth}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <h3 className="text-lg font-semibold text-gray-900">
        {formatMonthYear(currentMonth)}
      </h3>
      <button
        onClick={handleNextMonth}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
