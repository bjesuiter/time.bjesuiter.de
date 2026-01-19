import type { WeekInfo } from "@/lib/date-utils";

interface WeekSelectorProps {
  weeks: WeekInfo[];
  selectedWeek: string;
  onWeekSelect: (weekStartDate: string) => void;
}

export function WeekSelector({
  weeks,
  selectedWeek,
  onWeekSelect,
}: WeekSelectorProps) {
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-thin">
      <div className="flex gap-1.5 sm:gap-2 sm:flex-wrap min-w-max sm:min-w-0">
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
                ${week.isCurrentWeek && !isSelected ? "ring-2 ring-indigo-200 ring-offset-1" : ""}
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
  );
}
