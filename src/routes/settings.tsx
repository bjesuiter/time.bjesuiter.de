import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/client/auth-client";
import {
  User,
  Mail,
  Calendar,
  Settings2,
  CheckCircle2,
  ArrowRight,
  Clock,
  Briefcase,
  Globe,
  FolderKanban,
  Save,
  Loader2,
  Trash2,
  Plus,
  Edit2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  checkClockifySetup,
  getClockifyDetails,
  getClockifyProjects,
  refreshClockifySettings,
} from "@/server/clockifyServerFns";
import {
  getCommittedWeeksInRange,
  refreshConfigTimeRange,
} from "@/server/cacheServerFns";
import {
  getConfigHistory,
  deleteConfigEntry,
  updateConfig,
} from "@/server/configServerFns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toolbar } from "@/components/Toolbar";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { useState } from "react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const queryClient = useQueryClient();

  // Check Clockify setup status
  const { data: setupStatus } = useQuery({
    queryKey: ["clockify-setup"],
    queryFn: () => checkClockifySetup(),
    enabled: !!session?.user,
  });

  // Get detailed Clockify configuration if setup is complete
  const { data: clockifyDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["clockify-details"],
    queryFn: () => getClockifyDetails(),
    enabled: !!session?.user && !!setupStatus?.hasSetup,
  });

  // State for configuration chronicle
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingProjectsConfigId, setEditingProjectsConfigId] = useState<
    string | null
  >(null);
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Get configuration history
  const { data: configHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["config-history", "tracked_projects"],
    queryFn: () =>
      getConfigHistory({ data: { configType: "tracked_projects" } }),
    enabled: !!session?.user && !!setupStatus?.hasSetup,
  });

  // Get available projects from Clockify for validation and editing
  const { data: availableProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: [
      "clockify-projects",
      clockifyDetails?.config?.clockifyWorkspaceId,
      clockifyDetails?.config?.selectedClientId,
    ],
    queryFn: () =>
      getClockifyProjects({
        data: {
          workspaceId: clockifyDetails?.config?.clockifyWorkspaceId ?? "",
          clientId: clockifyDetails?.config?.selectedClientId ?? undefined,
        },
      }),
    enabled:
      !!clockifyDetails?.success &&
      !!clockifyDetails?.config?.clockifyWorkspaceId,
  });

  const availableProjectIds = new Set(
    availableProjects?.projects?.map((p) => p.id) ?? [],
  );

  // Mutation to update config dates and/or projects
  const updateConfigMutation = useMutation({
    mutationFn: async (data: {
      configId: string;
      validFrom?: string;
      validUntil?: string | null;
      projectIds?: string[];
      projectNames?: string[];
    }) => {
      const result = await updateConfig({ data });
      if (!result.success) {
        throw new Error(result.error || "Failed to update configuration");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-projects"] });
      queryClient.invalidateQueries({
        queryKey: ["config-history", "tracked_projects"],
      });
      queryClient.invalidateQueries({ queryKey: ["current-config"] });
      setEditingConfigId(null);
      setEditingProjectsConfigId(null);
      setEditValidFrom("");
      setEditValidUntil(null);
      setSelectedProjectIds([]);
    },
  });

  // Mutation to delete individual config entry
  const deleteEntryMutation = useMutation({
    mutationFn: (configId: string) => deleteConfigEntry({ data: { configId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["config-history", "tracked_projects"],
      });
      queryClient.invalidateQueries({ queryKey: ["tracked-projects"] });
    },
  });

  const [refreshMessage, setRefreshMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [refreshingConfigId, setRefreshingConfigId] = useState<string | null>(
    null,
  );
  const [refreshConfigMessage, setRefreshConfigMessage] = useState<{
    configId: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [refreshProgress, setRefreshProgress] = useState<{
    configId: string;
    totalWeeks: number;
    completedWeeks: number;
    currentStatus: string;
  } | null>(null);
  const [pendingRefresh, setPendingRefresh] = useState<{
    configId: string;
    startDate: string;
    endDate: string | null;
    committedWeeks: string[];
    totalWeeks: number;
  } | null>(null);

  const refreshSettingsMutation = useMutation({
    mutationFn: () => refreshClockifySettings(),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["clockify-details"] });
        setRefreshMessage({
          type: "success",
          text: result.updated
            ? `Updated: timezone → ${result.timeZone}, week start → ${result.weekStart}`
            : result.message || "Settings are up to date",
        });
      } else {
        setRefreshMessage({
          type: "error",
          text: result.error || "Refresh failed",
        });
      }
      setTimeout(() => setRefreshMessage(null), 5000);
    },
    onError: (error) => {
      setRefreshMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Refresh failed",
      });
      setTimeout(() => setRefreshMessage(null), 5000);
    },
  });

  const checkCommittedWeeksMutation = useMutation({
    mutationFn: async (params: {
      configId: string;
      startDate: string;
      endDate: string | null;
    }) => {
      const result = await getCommittedWeeksInRange({
        data: { startDate: params.startDate, endDate: params.endDate },
      });
      return { ...result, configId: params.configId };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        if (result.data.hasCommittedWeeks) {
          setPendingRefresh({
            configId: variables.configId,
            startDate: variables.startDate,
            endDate: variables.endDate,
            committedWeeks: result.data.committedWeeks,
            totalWeeks: result.data.totalWeeks,
          });
        } else {
          performRefresh(
            variables.configId,
            variables.startDate,
            variables.endDate,
            false,
            result.data.totalWeeks,
          );
        }
      }
    },
  });

  const refreshTimeRangeMutation = useMutation({
    mutationFn: async (params: {
      configId: string;
      startDate: string;
      endDate: string | null;
      includeCommittedWeeks: boolean;
      totalWeeks: number;
    }) => {
      setRefreshingConfigId(params.configId);
      setRefreshConfigMessage(null);
      setRefreshProgress({
        configId: params.configId,
        totalWeeks: params.totalWeeks,
        completedWeeks: 0,
        currentStatus: "Starting refresh...",
      });

      const result = await refreshConfigTimeRange({
        data: {
          startDate: params.startDate,
          endDate: params.endDate,
          includeCommittedWeeks: params.includeCommittedWeeks,
        },
      });
      return { ...result, configId: params.configId };
    },
    onSuccess: (result, variables) => {
      setRefreshingConfigId(null);
      setRefreshProgress(null);
      setPendingRefresh(null);

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["clockify-details"] });
        queryClient.invalidateQueries({ queryKey: ["config-history"] });
        queryClient.invalidateQueries({ queryKey: ["tracked-projects"] });
        queryClient.invalidateQueries({ queryKey: ["weeklyTimeSummary"] });
        queryClient.invalidateQueries({ queryKey: ["cumulativeOvertime"] });

        const { successCount, errorCount, skippedCount, totalWeeks } =
          result.data;
        let message = `Refreshed ${successCount} of ${totalWeeks} weeks`;
        if (skippedCount > 0) message += ` (${skippedCount} skipped)`;
        if (errorCount > 0) message += ` (${errorCount} errors)`;

        setRefreshConfigMessage({
          configId: variables.configId,
          type: errorCount > 0 ? "error" : "success",
          text: message,
        });
      } else {
        setRefreshConfigMessage({
          configId: variables.configId,
          type: "error",
          text: "Failed to refresh data",
        });
      }
      setTimeout(() => setRefreshConfigMessage(null), 8000);
    },
    onError: (error, variables) => {
      setRefreshingConfigId(null);
      setRefreshProgress(null);
      setPendingRefresh(null);
      setRefreshConfigMessage({
        configId: variables.configId,
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to refresh data",
      });
      setTimeout(() => setRefreshConfigMessage(null), 5000);
    },
  });

  const performRefresh = (
    configId: string,
    startDate: string,
    endDate: string | null,
    includeCommittedWeeks: boolean,
    totalWeeks: number,
  ) => {
    refreshTimeRangeMutation.mutate({
      configId,
      startDate,
      endDate,
      includeCommittedWeeks,
      totalWeeks,
    });
  };

  const handleRefreshConfig = (entry: {
    id: string;
    validFrom: Date;
    validUntil: Date | null;
  }) => {
    const startDate = entry.validFrom.toISOString().split("T")[0];
    const endDate = entry.validUntil
      ? entry.validUntil.toISOString().split("T")[0]
      : null;

    checkCommittedWeeksMutation.mutate({
      configId: entry.id,
      startDate,
      endDate,
    });
  };

  const handleCancelPendingRefresh = () => {
    setPendingRefresh(null);
  };

  const handleConfirmRefreshWithCommitted = (includeCommitted: boolean) => {
    if (!pendingRefresh) return;
    performRefresh(
      pendingRefresh.configId,
      pendingRefresh.startDate,
      pendingRefresh.endDate,
      includeCommitted,
      pendingRefresh.totalWeeks,
    );
  };

  // Handle edit config
  const handleStartEdit = (entry: any) => {
    setEditingConfigId(entry.id);
    const validFrom = new Date(entry.validFrom);
    const year = validFrom.getFullYear();
    const month = String(validFrom.getMonth() + 1).padStart(2, "0");
    const day = String(validFrom.getDate()).padStart(2, "0");
    const hours = String(validFrom.getHours()).padStart(2, "0");
    const minutes = String(validFrom.getMinutes()).padStart(2, "0");
    setEditValidFrom(`${year}-${month}-${day}T${hours}:${minutes}`);

    if (entry.validUntil) {
      const validUntil = new Date(entry.validUntil);
      const year2 = validUntil.getFullYear();
      const month2 = String(validUntil.getMonth() + 1).padStart(2, "0");
      const day2 = String(validUntil.getDate()).padStart(2, "0");
      const hours2 = String(validUntil.getHours()).padStart(2, "0");
      const minutes2 = String(validUntil.getMinutes()).padStart(2, "0");
      setEditValidUntil(`${year2}-${month2}-${day2}T${hours2}:${minutes2}`);
    } else {
      setEditValidUntil(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setEditValidFrom("");
    setEditValidUntil(null);
  };

  const handleStartEditProjects = (entry: {
    id: string;
    value: { projectIds: string[] };
  }) => {
    setEditingProjectsConfigId(entry.id);
    setSelectedProjectIds(entry.value.projectIds || []);
  };

  const handleCancelEditProjects = () => {
    setEditingProjectsConfigId(null);
    setSelectedProjectIds([]);
  };

  const handleSaveProjects = () => {
    if (!editingProjectsConfigId || !availableProjects?.success) return;

    const selectedProjects =
      availableProjects.projects?.filter((p) =>
        selectedProjectIds.includes(p.id),
      ) || [];

    if (selectedProjects.length === 0) return;

    updateConfigMutation.mutate({
      configId: editingProjectsConfigId,
      projectIds: selectedProjects.map((p) => p.id),
      projectNames: selectedProjects.map((p) => p.name),
    });
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const handleSaveEdit = () => {
    if (!editingConfigId) return;

    updateConfigMutation.mutate({
      configId: editingConfigId,
      validFrom: editValidFrom
        ? new Date(editValidFrom).toISOString()
        : undefined,
      validUntil:
        editValidUntil === null
          ? null
          : editValidUntil
            ? new Date(editValidUntil).toISOString()
            : undefined,
    });
  };

  if (isPending) {
    return (
      <>
        <Toolbar user={null} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </>
    );
  }

  if (!session?.user) {
    return (
      <>
        <Toolbar user={null} />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to access your settings.
            </p>
            <Link
              to="/signin"
              className="inline-block text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toolbar user={session.user} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Settings
            </h1>
            <Settings2 className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Clockify Integration
                </h3>

                {setupStatus?.hasSetup ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-green-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-green-900 text-sm sm:text-base">
                          Connected
                        </p>
                        <p className="text-xs sm:text-sm text-green-700">
                          Your Clockify account is connected and ready to use
                        </p>
                      </div>
                    </div>

                    {isLoadingDetails ? (
                      <div className="text-center py-4 text-gray-600 text-sm">
                        Loading configuration...
                      </div>
                    ) : clockifyDetails?.success ? (
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                            Clockify Account
                          </h4>
                          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                            {clockifyDetails.clockifyUser.profilePicture ? (
                              <img
                                src={
                                  clockifyDetails.clockifyUser.profilePicture
                                }
                                alt={clockifyDetails.clockifyUser.name}
                                className="w-12 sm:w-16 h-12 sm:h-16 rounded-full object-cover border-2 border-indigo-200 shrink-0"
                              />
                            ) : (
                              <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 shrink-0">
                                <User className="w-6 sm:w-8 h-6 sm:h-8 text-indigo-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                {clockifyDetails.clockifyUser.name}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 truncate">
                                {clockifyDetails.clockifyUser.email}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-[10px] sm:text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {
                                      clockifyDetails.clockifyUser.settings
                                        .timeZone
                                    }
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  Week starts:{" "}
                                  {
                                    clockifyDetails.clockifyUser.settings
                                      .weekStart
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 sm:mt-3">
                            <button
                              onClick={() => refreshSettingsMutation.mutate()}
                              disabled={refreshSettingsMutation.isPending}
                              className="flex items-center gap-2 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${refreshSettingsMutation.isPending ? "animate-spin" : ""}`}
                              />
                              {refreshSettingsMutation.isPending
                                ? "Refreshing..."
                                : "Refresh from Clockify"}
                            </button>
                          </div>
                          {refreshMessage && (
                            <div
                              className={`mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                                refreshMessage.type === "success"
                                  ? "bg-green-50 border border-green-200 text-green-800"
                                  : "bg-red-50 border border-red-200 text-red-800"
                              }`}
                            >
                              {refreshMessage.text}
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                            Configuration
                          </h4>
                          <div className="grid grid-cols-2 gap-2 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-gray-600 shrink-0" />
                                <p className="text-[10px] sm:text-sm font-medium text-gray-600">
                                  Regular Hours/Week
                                </p>
                              </div>
                              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                                {clockifyDetails.config.regularHoursPerWeek}h
                              </p>
                            </div>

                            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                <Calendar className="w-3 sm:w-4 h-3 sm:h-4 text-gray-600 shrink-0" />
                                <p className="text-[10px] sm:text-sm font-medium text-gray-600">
                                  Working Days/Week
                                </p>
                              </div>
                              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                                {clockifyDetails.config.workingDaysPerWeek}
                              </p>
                            </div>

                            {clockifyDetails.config.selectedClientName && (
                              <div className="col-span-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                  <Briefcase className="w-3 sm:w-4 h-3 sm:h-4 text-gray-600 shrink-0" />
                                  <p className="text-[10px] sm:text-sm font-medium text-gray-600">
                                    Client Filter
                                  </p>
                                </div>
                                <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                  {clockifyDetails.config.selectedClientName}
                                </p>
                              </div>
                            )}

                            {clockifyDetails.config
                              .cumulativeOvertimeStartDate && (
                              <div className="col-span-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                  <Calendar className="w-3 sm:w-4 h-3 sm:h-4 text-gray-600 shrink-0" />
                                  <p className="text-[10px] sm:text-sm font-medium text-gray-600">
                                    Overtime Tracking Since
                                  </p>
                                </div>
                                <p className="font-medium text-gray-900 text-sm sm:text-base">
                                  {new Date(
                                    clockifyDetails.config.cumulativeOvertimeStartDate,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-blue-800">
                        <strong>Coming in Phase 2:</strong> Weekly time
                        summaries, project tracking, and overtime calculations
                        will be available soon.
                      </p>
                    </div>

                    <Link
                      to="/setup/clockify"
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm sm:text-base min-h-[44px]"
                    >
                      <Settings2 className="w-4 h-4" />
                      Update Configuration
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-gray-600 text-sm sm:text-base">
                      Connect your Clockify account to start tracking your time
                      and view weekly summaries.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-amber-800">
                        <strong>Setup Required:</strong> You need to configure
                        your Clockify integration before you can use the time
                        tracking dashboard.
                      </p>
                    </div>

                    <Link
                      to="/setup/clockify"
                      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm sm:text-base min-h-[44px]"
                    >
                      <Settings2 className="w-4 sm:w-5 h-4 sm:h-5" />
                      Setup Clockify Integration
                      <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
                    </Link>
                  </div>
                )}
              </div>

              {setupStatus?.hasSetup && (
                <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <FolderKanban className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-600 shrink-0" />
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                        Configuration Chronicle
                      </h3>
                    </div>
                    <Link
                      to="/setup/tracked-projects"
                      className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
                    >
                      <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                      Add Configuration
                    </Link>
                  </div>

                  <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                    Manage your tracked projects configurations over time. Each
                    configuration defines which projects should be displayed in
                    detail in your weekly time breakdown.
                  </p>

                  <div>
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-4 text-gray-600 text-sm">
                        <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin mr-2" />
                        Loading history...
                      </div>
                    ) : configHistory?.success && configHistory.history ? (
                      <div className="space-y-3 sm:space-y-4">
                        {configHistory.history.length === 0 ? (
                          <p className="text-xs sm:text-sm text-gray-600">
                            No configuration history yet. Click "Add
                            Configuration" to create your first configuration.
                          </p>
                        ) : (
                          configHistory.history.map((entry) => {
                            const now = new Date();
                            const validFrom = new Date(entry.validFrom);
                            const validUntil = entry.validUntil
                              ? new Date(entry.validUntil)
                              : null;
                            const isCurrentlyActive =
                              validFrom <= now &&
                              (validUntil === null || validUntil > now);
                            const isFuture = validFrom > now;
                            const isEditing = editingConfigId === entry.id;
                            const isEditingProjects =
                              editingProjectsConfigId === entry.id;

                            return (
                              <div
                                key={entry.id}
                                className={`p-3 sm:p-4 rounded-lg border ${
                                  isCurrentlyActive
                                    ? "bg-indigo-50 border-indigo-200"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                {isEditing ? (
                                  <div className="space-y-3 sm:space-y-4">
                                    <div>
                                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                        Start Date
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={editValidFrom}
                                        onChange={(e) =>
                                          setEditValidFrom(e.target.value)
                                        }
                                        className="block w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[44px]"
                                      />
                                    </div>
                                    <div>
                                      <label className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                        <span>
                                          End Date (leave empty for current)
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={editValidUntil !== null}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              const now = new Date();
                                              const year = now.getFullYear();
                                              const month = String(
                                                now.getMonth() + 1,
                                              ).padStart(2, "0");
                                              const day = String(
                                                now.getDate(),
                                              ).padStart(2, "0");
                                              const hours = String(
                                                now.getHours(),
                                              ).padStart(2, "0");
                                              const minutes = String(
                                                now.getMinutes(),
                                              ).padStart(2, "0");
                                              setEditValidUntil(
                                                `${year}-${month}-${day}T${hours}:${minutes}`,
                                              );
                                            } else {
                                              setEditValidUntil(null);
                                            }
                                          }}
                                          className="w-5 h-5 sm:w-4 sm:h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                        />
                                      </label>
                                      {editValidUntil !== null && (
                                        <input
                                          type="datetime-local"
                                          value={editValidUntil}
                                          onChange={(e) =>
                                            setEditValidUntil(e.target.value)
                                          }
                                          className="block w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mt-2 text-sm min-h-[44px]"
                                        />
                                      )}
                                    </div>
                                    {updateConfigMutation.isError && (
                                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                                        <p className="text-xs sm:text-sm text-red-800">
                                          {updateConfigMutation.error
                                            ?.message ||
                                            "Error updating configuration"}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                      <button
                                        onClick={handleSaveEdit}
                                        disabled={
                                          updateConfigMutation.isPending
                                        }
                                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm min-h-[44px]"
                                      >
                                        {updateConfigMutation.isPending ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-4 h-4" />
                                            Save
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        disabled={
                                          updateConfigMutation.isPending
                                        }
                                        className="px-4 py-2.5 sm:py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : isEditingProjects ? (
                                  <div className="space-y-3 sm:space-y-4">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                                      Edit Tracked Projects
                                    </p>
                                    {isLoadingProjects ? (
                                      <div className="flex items-center justify-center py-4 text-gray-600 text-sm">
                                        <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin mr-2" />
                                        Loading projects...
                                      </div>
                                    ) : availableProjects?.success &&
                                      availableProjects.projects ? (
                                      <>
                                        <div className="max-h-56 sm:max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                                          {availableProjects.projects.map(
                                            (project) => (
                                              <label
                                                key={project.id}
                                                className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors min-h-[44px] ${
                                                  selectedProjectIds.includes(
                                                    project.id,
                                                  )
                                                    ? "bg-indigo-50"
                                                    : ""
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={selectedProjectIds.includes(
                                                    project.id,
                                                  )}
                                                  onChange={() =>
                                                    toggleProjectSelection(
                                                      project.id,
                                                    )
                                                  }
                                                  className="mt-0.5 w-5 h-5 sm:w-4 sm:h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <div
                                                      className="w-3 h-3 rounded-full shrink-0"
                                                      style={{
                                                        backgroundColor:
                                                          project.color,
                                                      }}
                                                    />
                                                    <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                                                      {project.name}
                                                    </p>
                                                  </div>
                                                  {project.clientName && (
                                                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">
                                                      {project.clientName}
                                                    </p>
                                                  )}
                                                </div>
                                              </label>
                                            ),
                                          )}
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-gray-500">
                                          {selectedProjectIds.length} project(s)
                                          selected
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-xs sm:text-sm text-red-600">
                                        Unable to load projects
                                      </p>
                                    )}
                                    {updateConfigMutation.isError && (
                                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                                        <p className="text-xs sm:text-sm text-red-800">
                                          {updateConfigMutation.error
                                            ?.message ||
                                            "Error updating configuration"}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                      <button
                                        onClick={handleSaveProjects}
                                        disabled={
                                          updateConfigMutation.isPending ||
                                          selectedProjectIds.length === 0
                                        }
                                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm min-h-[44px]"
                                      >
                                        {updateConfigMutation.isPending ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-4 h-4" />
                                            Save Projects
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={handleCancelEditProjects}
                                        disabled={
                                          updateConfigMutation.isPending
                                        }
                                        className="px-4 py-2.5 sm:py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                                          {isCurrentlyActive && (
                                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                                              Current
                                            </span>
                                          )}
                                          {isFuture && (
                                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                                              Scheduled
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs sm:text-sm font-medium text-gray-900">
                                          {new Date(
                                            entry.validFrom,
                                          ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                                          {entry.validUntil === null
                                            ? isFuture
                                              ? "Will be active from this date"
                                              : "Active since this date"
                                            : `Active until ${new Date(
                                                entry.validUntil,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRefreshConfig({
                                              id: entry.id,
                                              validFrom: entry.validFrom,
                                              validUntil: entry.validUntil,
                                            })
                                          }
                                          disabled={
                                            refreshingConfigId === entry.id ||
                                            checkCommittedWeeksMutation.isPending
                                          }
                                          className="p-2.5 sm:p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                                          title="Refresh data from Clockify for all weeks in this period"
                                        >
                                          <RefreshCw
                                            className={`w-4 h-4 ${refreshingConfigId === entry.id ? "animate-spin" : ""}`}
                                          />
                                        </button>
                                        <button
                                          onClick={() => handleStartEdit(entry)}
                                          className="p-2.5 sm:p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                          title="Edit dates"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleStartEditProjects(entry)
                                          }
                                          className="p-2.5 sm:p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                          title="Edit tracked projects"
                                        >
                                          <FolderKanban className="w-4 h-4" />
                                        </button>
                                        {(isFuture || !isCurrentlyActive) && (
                                          <ConfirmPopover
                                            trigger={
                                              <button
                                                disabled={
                                                  deleteEntryMutation.isPending
                                                }
                                                className="p-2.5 sm:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                title="Delete this configuration entry"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            }
                                            okLabel="Delete"
                                            cancelLabel="Cancel"
                                            onConfirm={() =>
                                              deleteEntryMutation.mutate(
                                                entry.id,
                                              )
                                            }
                                          >
                                            <p className="text-gray-900 text-sm">
                                              Are you sure you want to delete
                                              this configuration entry? This
                                              action cannot be undone.
                                            </p>
                                          </ConfirmPopover>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 sm:mt-3">
                                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">
                                        Tracked projects:
                                      </p>
                                      {entry.value.projectNames.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                          {entry.value.projectIds.map(
                                            (projectId, idx) => {
                                              const projectName =
                                                entry.value.projectNames[idx];
                                              const isInvalid =
                                                availableProjectIds.size > 0 &&
                                                !availableProjectIds.has(
                                                  projectId,
                                                );
                                              return (
                                                <span
                                                  key={projectId}
                                                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs border ${
                                                    isInvalid
                                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                                      : "bg-white text-gray-800 border-gray-200"
                                                  }`}
                                                  title={
                                                    isInvalid
                                                      ? "Project not found in Clockify - may have been renamed or deleted"
                                                      : undefined
                                                  }
                                                >
                                                  {isInvalid && (
                                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                                  )}
                                                  <span className="truncate max-w-[120px] sm:max-w-none">
                                                    {projectName}
                                                  </span>
                                                </span>
                                              );
                                            },
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] sm:text-xs text-gray-500">
                                          No projects tracked
                                        </p>
                                      )}
                                      {entry.value.projectIds.some(
                                        (id) =>
                                          availableProjectIds.size > 0 &&
                                          !availableProjectIds.has(id),
                                      ) && (
                                        <p className="text-[10px] sm:text-xs text-amber-700 mt-1.5 sm:mt-2 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          Some projects not found in Clockify.
                                          Click the folder icon to update.
                                        </p>
                                      )}
                                    </div>
                                    {refreshConfigMessage?.configId ===
                                      entry.id && (
                                      <div
                                        className={`mt-2 p-2 rounded-lg text-xs ${
                                          refreshConfigMessage.type ===
                                          "success"
                                            ? "bg-green-50 border border-green-200 text-green-800"
                                            : "bg-red-50 border border-red-200 text-red-800"
                                        }`}
                                      >
                                        {refreshConfigMessage.text}
                                      </div>
                                    )}
                                    {refreshProgress?.configId === entry.id && (
                                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                          <span className="text-sm font-medium text-blue-900">
                                            Refreshing data from Clockify...
                                          </span>
                                        </div>
                                        <p className="text-xs text-blue-700">
                                          {refreshProgress.currentStatus}
                                        </p>
                                        <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-blue-600 transition-all duration-300"
                                            style={{
                                              width: `${(refreshProgress.completedWeeks / refreshProgress.totalWeeks) * 100}%`,
                                            }}
                                          />
                                        </div>
                                        <p className="text-[10px] text-blue-600 mt-1">
                                          {refreshProgress.completedWeeks} of{" "}
                                          {refreshProgress.totalWeeks} weeks
                                        </p>
                                      </div>
                                    )}
                                    {pendingRefresh?.configId === entry.id && (
                                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                                          <span className="text-sm font-medium text-amber-900">
                                            Committed Weeks Detected
                                          </span>
                                        </div>
                                        <p className="text-xs text-amber-700 mb-3">
                                          {pendingRefresh.committedWeeks.length}{" "}
                                          of {pendingRefresh.totalWeeks} weeks
                                          are committed (locked). Refreshing
                                          committed weeks will track any data
                                          changes as discrepancies.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleConfirmRefreshWithCommitted(
                                                false,
                                              )
                                            }
                                            className="px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-100 transition-colors"
                                          >
                                            Skip Committed Weeks
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleConfirmRefreshWithCommitted(
                                                true,
                                              )
                                            }
                                            className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                                          >
                                            Include All Weeks
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleCancelPendingRefresh}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-red-600">
                        Error loading configuration history
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Profile
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <User className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        Name
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {session.user.name || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Mail className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        Email
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        Member Since
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {new Date(session.user.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-4 sm:w-5 h-4 sm:h-5 flex items-center justify-center shrink-0">
                      {session.user.emailVerified ? (
                        <span className="text-green-600 font-bold text-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold text-sm">
                          !
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        Email Status
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        {session.user.emailVerified
                          ? "Verified"
                          : "Not verified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
