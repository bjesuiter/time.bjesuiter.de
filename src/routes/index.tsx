import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/client/auth-client";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod/v4";
import {
  Sparkles,
  BarChart3,
  Calendar,
  Target,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Clock,
  Database,
} from "lucide-react";
import {
  checkClockifySetup,
  getClockifyConfig,
  getWeeklyTimeSummary,
  getCumulativeOvertime,
} from "@/server/clockifyServerFns";
import { SetupChecklist } from "@/components/SetupChecklist";
import { getPublicEnv } from "@/server/envServerFns";
import { Toolbar } from "@/components/Toolbar";
import { WeeklyTimeTable } from "@/components/WeeklyTimeTable";
import { WeekNavigationBar } from "@/components/WeekNavigationBar";
import { OvertimeSummary } from "@/components/OvertimeSummary";
import { CumulativeOvertimeSummary } from "@/components/CumulativeOvertimeSummary";
import { QueryErrorMessage } from "@/components/QueryErrorMessage";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import {
  OvertimeSkeleton,
  CumulativeOvertimeSkeleton,
} from "@/components/ui/OvertimeSkeleton";
import {
  toISOMonth,
  getWeeksForMonth,
  getDefaultWeekForMonth,
  formatWeekRange,
  parseMonthString,
  formatLastUpdated,
} from "@/lib/date-utils";

const dashboardSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/")({
  component: App,
  validateSearch: zodValidator(dashboardSearchSchema),
  loader: async () => {
    const { allowUserSignup } = await getPublicEnv();
    return { allowUserSignup };
  },
});

function App() {
  const { data: session, isPending } = authClient.useSession();
  const { allowUserSignup } = Route.useLoaderData();

  if (isPending) {
    return (
      <>
        <Toolbar user={null} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toolbar user={session?.user || null} />

      {session?.user ? (
        <DashboardView />
      ) : (
        <LandingPage allowSignup={allowUserSignup} />
      )}
    </>
  );
}

function DashboardView() {
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const queryClient = useQueryClient();

  const setupQuery = useQuery({
    queryKey: ["clockifySetup"],
    queryFn: () => checkClockifySetup(),
  });

  const configQuery = useQuery({
    queryKey: ["clockifyConfig"],
    queryFn: () => getClockifyConfig(),
    enabled: setupQuery.data?.hasSetup,
  });

  const weekStart = configQuery.data?.success
    ? (configQuery.data.config.weekStart as "MONDAY" | "SUNDAY")
    : "MONDAY";

  const currentMonth = search.month || toISOMonth(new Date());
  const { year, month } = parseMonthString(currentMonth);
  const weeksInMonth = getWeeksForMonth(year, month, weekStart);

  const selectedWeek =
    search.week && weeksInMonth.some((w) => w.startDate === search.week)
      ? search.week
      : getDefaultWeekForMonth(currentMonth, weekStart);

  const weeklyQuery = useQuery({
    queryKey: ["weeklyTimeSummary", selectedWeek],
    queryFn: () =>
      getWeeklyTimeSummary({ data: { weekStartDate: selectedWeek } }),
    enabled:
      setupQuery.data?.hasSetup &&
      configQuery.isSuccess &&
      configQuery.data?.success,
  });

  const forceRefreshMutation = useMutation({
    mutationFn: () =>
      getWeeklyTimeSummary({
        data: { weekStartDate: selectedWeek, forceRefresh: true },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["weeklyTimeSummary", selectedWeek], data);
      queryClient.invalidateQueries({
        queryKey: ["cumulativeOvertime", selectedWeek],
      });
    },
  });

  const cumulativeOvertimeQuery = useQuery({
    queryKey: ["cumulativeOvertime", selectedWeek],
    queryFn: () =>
      getCumulativeOvertime({ data: { currentWeekStartDate: selectedWeek } }),
    enabled:
      setupQuery.data?.hasSetup &&
      configQuery.isSuccess &&
      configQuery.data?.success,
  });

  const handleMonthChange = (newMonth: string) => {
    const { year: newYear, month: newMonthNum } = parseMonthString(newMonth);
    const newWeeks = getWeeksForMonth(newYear, newMonthNum, weekStart);
    const defaultWeek = getDefaultWeekForMonth(newMonth, weekStart);
    const weekExists = newWeeks.some((w) => w.startDate === search.week);

    navigate({
      search: {
        month: newMonth,
        week: weekExists ? search.week : defaultWeek,
      },
    });
  };

  const handleWeekChange = (newWeek: string, newMonth?: string) => {
    navigate({
      search: {
        month: newMonth || currentMonth,
        week: newWeek,
      },
    });
  };

  const handleWeekSelect = (weekStartDate: string) => {
    navigate({
      search: {
        month: currentMonth,
        week: weekStartDate,
      },
    });
  };

  if (setupQuery.isPending) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (setupQuery.data && !setupQuery.data.hasSetup) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <SetupChecklist setupStatus={setupQuery.data} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
          <h1
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900"
            data-testid="dashboard-heading"
          >
            Dashboard
          </h1>
          <Sparkles className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-500" />
        </div>

        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          <WeekNavigationBar
            weeks={weeksInMonth}
            currentMonth={currentMonth}
            selectedWeek={selectedWeek}
            onMonthChange={handleMonthChange}
            onWeekChange={handleWeekChange}
            onWeekSelect={handleWeekSelect}
          />

          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4 sm:p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <div className="min-w-0">
                <h2
                  className="text-base sm:text-lg lg:text-xl font-bold text-gray-900"
                  data-testid="weekly-summary-heading"
                >
                  Weekly Time Summary
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
                  {formatWeekRange(selectedWeek)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-3 text-[10px] sm:text-xs text-gray-400">
                  {weeklyQuery.data?.data?.cachedAt && (
                    <div
                      className="flex items-center gap-1"
                      title="Data cached at this time"
                    >
                      <Database className="w-3 h-3" />
                      <span>
                        {formatLastUpdated(weeklyQuery.data.data.cachedAt)}
                      </span>
                    </div>
                  )}
                  {weeklyQuery.dataUpdatedAt > 0 && (
                    <div
                      className="flex items-center gap-1"
                      title="Last fetched from server"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{formatLastUpdated(weeklyQuery.dataUpdatedAt)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => forceRefreshMutation.mutate()}
                  disabled={forceRefreshMutation.isPending}
                  className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Refresh data from Clockify (bypasses cache)"
                  aria-label="Refresh data from Clockify"
                >
                  <RefreshCw
                    className={`w-5 sm:w-5 h-5 sm:h-5 ${forceRefreshMutation.isPending ? "animate-spin" : ""}`}
                  />
                </button>
                <Calendar className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-500" />
              </div>
            </div>

            {configQuery.isPending || weeklyQuery.isPending ? (
              <div className="space-y-4 sm:space-y-6">
                <TableSkeleton rows={2} columns={9} />
                <OvertimeSkeleton />
                <CumulativeOvertimeSkeleton />
              </div>
            ) : weeklyQuery.data?.success ? (
              <>
                <WeeklyTimeTable
                  weekStartDate={weeklyQuery.data.data.weekStartDate}
                  weekStart={
                    weeklyQuery.data.data.weekStart as "MONDAY" | "SUNDAY"
                  }
                  dailyBreakdown={weeklyQuery.data.data.dailyBreakdown}
                  trackedProjects={weeklyQuery.data.data.trackedProjects}
                  clientName={weeklyQuery.data.data.clientName}
                />
                <div className="mt-4 sm:mt-6">
                  <OvertimeSummary
                    dailyBreakdown={weeklyQuery.data.data.dailyBreakdown}
                    regularHoursPerWeek={
                      weeklyQuery.data.data.regularHoursPerWeek
                    }
                    workingDaysPerWeek={
                      weeklyQuery.data.data.workingDaysPerWeek
                    }
                    configStartDate={weeklyQuery.data.data.configStartDate}
                    weekStartDate={weeklyQuery.data.data.weekStartDate}
                  />
                </div>
                <div className="mt-3 sm:mt-4">
                  <CumulativeOvertimeSummary
                    isLoading={cumulativeOvertimeQuery.isPending}
                    hasStartDate={
                      cumulativeOvertimeQuery.data?.data?.hasStartDate ?? false
                    }
                    startDate={cumulativeOvertimeQuery.data?.data?.startDate}
                    cumulativeOvertimeSeconds={
                      cumulativeOvertimeQuery.data?.data
                        ?.cumulativeOvertimeSeconds ?? 0
                    }
                    weeksIncluded={
                      cumulativeOvertimeQuery.data?.data?.weeksIncluded ?? 0
                    }
                    error={
                      cumulativeOvertimeQuery.data?.success === false
                        ? cumulativeOvertimeQuery.data?.error
                        : undefined
                    }
                  />
                </div>
              </>
            ) : weeklyQuery.isError ? (
              <QueryErrorMessage
                error={
                  weeklyQuery.error instanceof Error
                    ? weeklyQuery.error.message
                    : "Failed to load time data"
                }
                onRetry={() => weeklyQuery.refetch()}
                isRetrying={weeklyQuery.isRefetching}
              />
            ) : (
              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-amber-800 font-medium text-sm sm:text-base">
                    Setup Required
                  </p>
                  <p className="text-amber-700 text-xs sm:text-sm">
                    {weeklyQuery.data?.error ||
                      configQuery.data?.error ||
                      "Please complete your Clockify setup to view time data."}
                  </p>
                  <Link
                    to="/settings"
                    className="text-amber-800 underline text-xs sm:text-sm mt-1 inline-block hover:text-amber-900 min-h-[44px] flex items-center"
                  >
                    Go to Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ allowSignup }: { allowSignup: boolean }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-linear-to-b from-indigo-50/50">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
              Time Tracking, <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">
                But Make It Fun!
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A personal Clockify-powered dashboard that brings joy to your
              productivity tracking. Visualization, summaries, and a touch of
              sparkle.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signin"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
                data-testid="landingpage-sign-in-link"
              >
                Sign In <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-indigo-600" />}
              title="Clockify Integration"
              description="Seamlessly syncs with your existing Clockify data. No migration needed."
              dataTestId="landingpage-feature-clockify"
            />
            <FeatureCard
              icon={<Calendar className="w-8 h-8 text-purple-600" />}
              title="Weekly Summaries"
              description="Beautiful, easy-to-read breakdowns of your weekly time investments."
              dataTestId="landingpage-feature-weekly-summaries"
            />
            <FeatureCard
              icon={<Target className="w-8 h-8 text-pink-600" />}
              title="Overtime Tracking"
              description="Keep tabs on those extra hours and maintain a healthy work-life balance."
              dataTestId="landingpage-feature-overtime"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-6 font-medium">
            Connect with the developer
          </p>
          <div className="flex justify-center gap-4 mb-8">
            <a
              href="https://bsky.app/profile/codemonument.bsky.social"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span className="font-semibold">Bluesky</span>
            </a>
            <a
              href="https://blog.codemonument.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-purple-400 hover:text-purple-500 transition-all shadow-sm"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="font-semibold">Blog</span>
            </a>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-center gap-4">
            {allowSignup && (
              <Link
                to="/signup"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="landingpage-create-account-link"
              >
                Create an account
              </Link>
            )}
            <Link
              to="/registerAdmin"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="landingpage-admin-registration-link"
            >
              Admin Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  dataTestId,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  dataTestId?: string;
}) {
  return (
    <div
      className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md"
      data-testid={dataTestId}
    >
      <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
