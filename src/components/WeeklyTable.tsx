import type { WeeklyTimeReportOutput } from "@/lib/clockify/types";
import {
  formatHours,
  formatHoursMinutes,
  getDayAbbreviation,
  getWeekDates,
  parseDate,
  type WeekStart,
} from "@/lib/utils/dateUtils";

interface WeeklyTableProps {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  weekStartSetting: WeekStart;
  data: WeeklyTimeReportOutput;
  trackedProjects: {
    projectIds: string[];
    projectNames: string[];
  };
  regularHoursPerWeek: number;
  workingDaysPerWeek: number;
  clientName: string;
}

export function WeeklyTable({
  weekStart,
  weekEnd,
  weekStartSetting,
  data,
  trackedProjects,
  regularHoursPerWeek,
  // workingDaysPerWeek is available for future use (e.g., calculating expected hours per day)
  workingDaysPerWeek: _workingDaysPerWeek,
  clientName,
}: WeeklyTableProps) {
  const weekStartDate = parseDate(weekStart);
  const weekDates = getWeekDates(weekStartDate, weekStartSetting);

  // Calculate weekly totals
  let weeklyTrackedProjectsTotal = 0;
  let weeklyExtraWorkTotal = 0;
  let weeklyTotal = 0;

  const trackedProjectsData: Array<{
    projectId: string;
    projectName: string;
    dailySeconds: number[];
    weeklyTotal: number;
  }> = [];

  // Initialize tracked projects data
  for (let i = 0; i < trackedProjects.projectIds.length; i++) {
    trackedProjectsData.push({
      projectId: trackedProjects.projectIds[i],
      projectName: trackedProjects.projectNames[i],
      dailySeconds: new Array(7).fill(0),
      weeklyTotal: 0,
    });
  }

  // Process daily breakdown
  weekDates.forEach((date, dayIndex) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayData = data.dailyBreakdown[dateStr];

    if (dayData) {
      // Process tracked projects
      trackedProjectsData.forEach((project) => {
        const projectTime = dayData.trackedProjects[project.projectId];
        if (projectTime) {
          project.dailySeconds[dayIndex] = projectTime.seconds;
          project.weeklyTotal += projectTime.seconds;
          weeklyTrackedProjectsTotal += projectTime.seconds;
        }
      });

      // Extra work
      weeklyExtraWorkTotal += dayData.extraWorkSeconds;
      weeklyTotal += dayData.totalSeconds;
    }
  });

  // Calculate overtime
  const expectedSeconds = regularHoursPerWeek * 3600;
  const overtimeSeconds = weeklyTotal - expectedSeconds;
  const overtimeHours = overtimeSeconds / 3600;

  // Format week range
  const weekRange = `${weekStartDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${parseDate(weekEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Week Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Week: {weekRange}
          </h3>
          <span className="text-sm text-gray-500">Status: 🔓 Pending</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              {weekDates.map((date, index) => (
                <th
                  key={index}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {getDayAbbreviation(date)}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exp.
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Tracked Projects Rows */}
            {trackedProjectsData.map((project) => (
              <tr key={project.projectId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {project.projectName}
                </td>
                {project.dailySeconds.map((seconds, dayIndex) => (
                  <td
                    key={dayIndex}
                    className="px-3 py-3 text-sm text-center text-gray-700"
                  >
                    {seconds > 0 ? formatHours(seconds) : "-"}
                  </td>
                ))}
                <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                  {formatHours(project.weeklyTotal)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-400">
                  -
                </td>
              </tr>
            ))}

            {/* Extra Work Row */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-600">
                Extra Work
              </td>
              {weekDates.map((date, idx) => {
                const dateStr = date.toISOString().split("T")[0];
                const dayData = data.dailyBreakdown[dateStr];
                return (
                  <td
                    key={idx}
                    className="px-3 py-3 text-sm text-center text-gray-600"
                  >
                    {dayData && dayData.extraWorkSeconds > 0
                      ? formatHours(dayData.extraWorkSeconds)
                      : "-"}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-sm text-center font-medium text-gray-600">
                {weeklyExtraWorkTotal > 0
                  ? formatHours(weeklyExtraWorkTotal)
                  : "0h"}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-400">
                -
              </td>
            </tr>

            {/* Separator */}
            <tr>
              <td
                colSpan={9}
                className="px-4 py-1 border-t border-gray-300"
              ></td>
            </tr>

            {/* Total Row */}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                Total ({clientName})
              </td>
              {weekDates.map((date, dayIndex) => {
                const dateStr = date.toISOString().split("T")[0];
                const dayData = data.dailyBreakdown[dateStr];
                return (
                  <td
                    key={dayIndex}
                    className="px-3 py-3 text-sm text-center text-gray-900"
                  >
                    {dayData ? formatHours(dayData.totalSeconds) : "-"}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                {formatHours(weeklyTotal)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700">
                {formatHours(expectedSeconds)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              <span className="font-medium">Overtime:</span>{" "}
              <span
                className={
                  overtimeHours >= 0
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {overtimeHours >= 0 ? "+" : ""}
                {formatHoursMinutes(overtimeSeconds)}
              </span>
            </span>
            <span className="text-sm text-gray-500">
              Cumulative: {formatHoursMinutes(overtimeSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
              ↻
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
