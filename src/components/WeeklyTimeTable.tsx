import type { DailyBreakdown } from "@/lib/clockify/types";
import type { TrackedProjectsValue } from "@/server/configServerFns";

export interface WeeklyTimeTableProps {
  weekStartDate: string;
  weekStart: "MONDAY" | "SUNDAY";
  dailyBreakdown: Record<string, DailyBreakdown>;
  trackedProjects: TrackedProjectsValue;
}

function formatSecondsToHHMM(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function getDaysOfWeek(weekStartDate: string, _weekStart: "MONDAY" | "SUNDAY"): string[] {
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
}: WeeklyTimeTableProps) {
  const days = getDaysOfWeek(weekStartDate, weekStart);

  const getProjectTimeForDay = (projectId: string, date: string): number => {
    const dayData = dailyBreakdown[date];
    if (!dayData) return 0;
    return dayData.trackedProjects[projectId]?.seconds || 0;
  };

  const getProjectWeeklyTotal = (projectId: string): number => {
    return days.reduce((sum, date) => sum + getProjectTimeForDay(projectId, date), 0);
  };

  const getDayTotal = (date: string): number => {
    const dayData = dailyBreakdown[date];
    return dayData?.totalSeconds || 0;
  };

  const getWeeklyGrandTotal = (): number => {
    return days.reduce((sum, date) => sum + getDayTotal(date), 0);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            {days.map((date) => (
              <th
                key={date}
                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div>{getDayLabel(date)}</div>
                <div className="text-gray-400 font-normal">{getDateLabel(date)}</div>
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-indigo-50">
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
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {projectName}
                </td>
                {days.map((date) => {
                  const seconds = getProjectTimeForDay(projectId, date);
                  return (
                    <td
                      key={date}
                      className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-center"
                    >
                      {seconds > 0 ? formatSecondsToHHMM(seconds) : "-"}
                    </td>
                  );
                })}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-indigo-700 text-center bg-indigo-50">
                  {weeklyTotal > 0 ? formatSecondsToHHMM(weeklyTotal) : "-"}
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-100 font-semibold">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              Total (All Client Projects)
            </td>
            {days.map((date) => {
              const total = getDayTotal(date);
              return (
                <td
                  key={date}
                  className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center"
                >
                  {total > 0 ? formatSecondsToHHMM(total) : "-"}
                </td>
              );
            })}
            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-900 text-center bg-indigo-100">
              {formatSecondsToHHMM(getWeeklyGrandTotal())}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
