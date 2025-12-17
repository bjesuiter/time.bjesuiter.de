import type { WeeklyTimeReportOutput } from "@/lib/clockify/types";
import {
  formatHours,
  formatHoursMinutes,
  getDayAbbreviation,
  getWeekDates,
  isWorkingDay,
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
  workingDaysPerWeek,
  clientName,
}: WeeklyTableProps) {
  const weekStartDate = parseDate(weekStart);
  const weekDates = getWeekDates(weekStartDate, weekStartSetting);

  // Calculate expected hours per working day
  const expectedSecondsPerWorkingDay =
    (regularHoursPerWeek / workingDaysPerWeek) * 3600;

  // Calculate weekly totals and daily data
  let weeklyTrackedProjectsTotal = 0;
  let weeklyExtraWorkTotal = 0;
  let weeklyTotal = 0;
  let weeklyExpectedSeconds = 0;

  // Daily expected and actual seconds for overtime calculation
  const dailyData: Array<{
    date: Date;
    dateStr: string;
    isWorking: boolean;
    expectedSeconds: number;
    actualSeconds: number;
    overtimeSeconds: number;
  }> = [];

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
    const dayBreakdown = data.dailyBreakdown[dateStr];
    const isWorking = isWorkingDay(date);

    // Expected hours: full day for working days, 0 for weekends
    const expectedSeconds = isWorking ? expectedSecondsPerWorkingDay : 0;
    const actualSeconds = dayBreakdown?.totalSeconds || 0;
    const overtimeSeconds = actualSeconds - expectedSeconds;

    dailyData.push({
      date,
      dateStr,
      isWorking,
      expectedSeconds,
      actualSeconds,
      overtimeSeconds,
    });

    weeklyExpectedSeconds += expectedSeconds;
    weeklyTotal += actualSeconds;

    if (dayBreakdown) {
      // Process tracked projects
      trackedProjectsData.forEach((project) => {
        const projectTime = dayBreakdown.trackedProjects[project.projectId];
        if (projectTime) {
          project.dailySeconds[dayIndex] = projectTime.seconds;
          project.weeklyTotal += projectTime.seconds;
          weeklyTrackedProjectsTotal += projectTime.seconds;
        }
      });

      // Extra work
      weeklyExtraWorkTotal += dayBreakdown.extraWorkSeconds;
    }
  });

  // Calculate weekly overtime (sum of daily overtime)
  const weeklyOvertimeSeconds = weeklyTotal - weeklyExpectedSeconds;

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
              {dailyData.map((day, dayIndex) => (
                <td
                  key={dayIndex}
                  className="px-3 py-3 text-sm text-center text-gray-900"
                >
                  {day.actualSeconds > 0 ? formatHours(day.actualSeconds) : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                {formatHours(weeklyTotal)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700">
                {formatHours(weeklyExpectedSeconds)}
              </td>
            </tr>

            {/* Expected Row - shows daily expected hours */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">
                Expected
              </td>
              {dailyData.map((day, dayIndex) => (
                <td
                  key={dayIndex}
                  className={`px-3 py-3 text-sm text-center ${
                    day.isWorking ? "text-gray-500" : "text-gray-300"
                  }`}
                >
                  {day.isWorking ? formatHours(day.expectedSeconds) : "-"}
                </td>
              ))}
              <td className="px-4 py-3 text-sm text-center text-gray-500">
                {formatHours(weeklyExpectedSeconds)}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-400">
                -
              </td>
            </tr>

            {/* Daily Overtime Row */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">
                Daily +/-
              </td>
              {dailyData.map((day, dayIndex) => {
                const hasTime = day.actualSeconds > 0 || day.expectedSeconds > 0;
                return (
                  <td
                    key={dayIndex}
                    className={`px-3 py-3 text-sm text-center font-medium ${
                      day.overtimeSeconds > 0
                        ? "text-green-600"
                        : day.overtimeSeconds < 0
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {hasTime
                      ? `${day.overtimeSeconds >= 0 ? "+" : ""}${formatHoursMinutes(day.overtimeSeconds)}`
                      : "-"}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-sm text-center font-medium text-gray-500">
                -
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-400">
                -
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
              <span className="font-medium">Week Overtime:</span>{" "}
              <span
                className={
                  weeklyOvertimeSeconds >= 0
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {weeklyOvertimeSeconds >= 0 ? "+" : ""}
                {formatHoursMinutes(weeklyOvertimeSeconds)}
              </span>
            </span>
            <span className="text-sm text-gray-500">
              Cumulative: {formatHoursMinutes(weeklyOvertimeSeconds)}
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
