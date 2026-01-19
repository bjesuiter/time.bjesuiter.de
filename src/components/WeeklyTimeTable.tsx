import type { DailyBreakdown } from "@/lib/clockify/types";
import type { TrackedProjectsValue } from "@/server/configServerFns";

export interface WeeklyTimeTableProps {
  weekStartDate: string;
  weekStart: "MONDAY" | "SUNDAY";
  dailyBreakdown: Record<string, DailyBreakdown>;
  trackedProjects: TrackedProjectsValue;
  clientName?: string | null;
}

function formatSecondsToHHMM(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function getDaysOfWeek(
  weekStartDate: string,
  _weekStart: "MONDAY" | "SUNDAY",
): string[] {
  const days: string[] = [];
  const start = new Date(weekStartDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push(date.toISOString().split("T")[0]);
  }

  return days;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WeeklyTimeTable({
  weekStartDate,
  weekStart,
  dailyBreakdown,
  trackedProjects,
  clientName,
}: WeeklyTimeTableProps) {
  const formatProjectName = (name: string) =>
    clientName ? `${clientName} - ${name}` : name;
  const days = getDaysOfWeek(weekStartDate, weekStart);

  const getProjectTimeForDay = (projectId: string, date: string): number => {
    const dayData = dailyBreakdown[date];
    if (!dayData) return 0;
    return dayData.trackedProjects[projectId]?.seconds || 0;
  };

  const getProjectWeeklyTotal = (projectId: string): number => {
    return days.reduce(
      (sum, date) => sum + getProjectTimeForDay(projectId, date),
      0,
    );
  };

  const getDayTotal = (date: string): number => {
    const dayData = dailyBreakdown[date];
    return dayData?.totalSeconds || 0;
  };

  const getExtraWorkForDay = (date: string): number => {
    const dayData = dailyBreakdown[date];
    return dayData?.extraWorkSeconds || 0;
  };

  const getExtraWorkWeeklyTotal = (): number => {
    return days.reduce((sum, date) => sum + getExtraWorkForDay(date), 0);
  };

  const getWeeklyGrandTotal = (): number => {
    return days.reduce((sum, date) => sum + getDayTotal(date), 0);
  };

  const hasExtraWork = getExtraWorkWeeklyTotal() > 0;

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] sm:min-w-[140px]">
                Project
              </th>
              {days.map((date) => (
                <th
                  key={date}
                  className="px-1.5 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[48px] sm:min-w-[60px]"
                >
                  <div>{getDayLabel(date)}</div>
                  <div className="text-gray-400 font-normal text-[9px] sm:text-xs">
                    {getDateLabel(date)}
                  </div>
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-indigo-50 px-2 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[50px] sm:min-w-[70px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trackedProjects.projectIds.map((projectId, index) => {
              const projectName = trackedProjects.projectNames[index];
              const weeklyTotal = getProjectWeeklyTotal(projectId);

              return (
                <tr key={projectId} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 min-w-[100px] sm:min-w-[140px]">
                    <span className="line-clamp-2 sm:whitespace-nowrap">
                      {formatProjectName(projectName)}
                    </span>
                  </td>
                  {days.map((date) => {
                    const seconds = getProjectTimeForDay(projectId, date);
                    return (
                      <td
                        key={date}
                        className="px-1.5 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600 text-center"
                      >
                        {seconds > 0 ? formatSecondsToHHMM(seconds) : "-"}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-indigo-50 px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-semibold text-indigo-700 text-center">
                    {weeklyTotal > 0 ? formatSecondsToHHMM(weeklyTotal) : "-"}
                  </td>
                </tr>
              );
            })}
            {hasExtraWork && (
              <tr className="bg-amber-50 hover:bg-amber-100">
                <td className="sticky left-0 z-10 bg-amber-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-amber-800 min-w-[100px] sm:min-w-[140px]">
                  <span className="line-clamp-2 sm:whitespace-nowrap">
                    {formatProjectName("Extra Work")}
                  </span>
                </td>
                {days.map((date) => {
                  const seconds = getExtraWorkForDay(date);
                  return (
                    <td
                      key={date}
                      className="px-1.5 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-amber-700 text-center"
                    >
                      {seconds > 0 ? formatSecondsToHHMM(seconds) : "-"}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-amber-100 px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-semibold text-amber-800 text-center">
                  {formatSecondsToHHMM(getExtraWorkWeeklyTotal())}
                </td>
              </tr>
            )}
            <tr className="bg-gray-100 font-semibold">
              <td className="sticky left-0 z-10 bg-gray-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 min-w-[100px] sm:min-w-[140px]">
                <span className="line-clamp-2 sm:whitespace-nowrap">
                  Total (All Client Projects)
                </span>
              </td>
              {days.map((date) => {
                const total = getDayTotal(date);
                return (
                  <td
                    key={date}
                    className="px-1.5 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-center"
                  >
                    {total > 0 ? formatSecondsToHHMM(total) : "-"}
                  </td>
                );
              })}
              <td className="sticky right-0 z-10 bg-indigo-100 px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-indigo-900 text-center">
                {formatSecondsToHHMM(getWeeklyGrandTotal())}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
