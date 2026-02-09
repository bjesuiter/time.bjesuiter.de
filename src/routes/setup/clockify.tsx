import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronLeft,
  Key,
  Briefcase,
  FolderKanban,
  Settings,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/client/auth-client";
import { Toolbar } from "@/components/Toolbar";
import type {
  ClockifyUser,
  ClockifyWorkspace,
  ClockifyClient,
} from "@/lib/clockify/types";
import {
  checkClockifySetup,
  getClockifyConfig,
  getClockifyDetails,
  validateClockifyKey,
  saveClockifyConfig,
  getClockifyWorkspaces,
  getClockifyClients,
  getClockifyProjects,
} from "@/server/clockifyServerFns";
import { createConfig, getCurrentConfig, updateConfig } from "@/server/configServerFns";

export const Route = createFileRoute("/setup/clockify")({
  component: ClockifySetupWizard,
});

type Step = 1 | 2 | 3 | 4 | 5;

interface SetupState {
  apiKey: string;
  validatedUser: ClockifyUser | null;
  workspaces: ClockifyWorkspace[];
  selectedWorkspaceId: string;
  clients: ClockifyClient[];
  selectedClientId: string | null;
  selectedClientName: string | null;
  regularHoursPerWeek: number;
  workingDaysPerWeek: number;
  cumulativeOvertimeStartDate: string;
}

function ClockifySetupWizard() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isResumedRef = useRef(false);

  const [state, setState] = useState<SetupState>({
    apiKey: "",
    validatedUser: null,
    workspaces: [],
    selectedWorkspaceId: "",
    clients: [],
    selectedClientId: null,
    selectedClientName: null,
    regularHoursPerWeek: 40,
    workingDaysPerWeek: 5,
    cumulativeOvertimeStartDate: "",
  });

  const { data: setupStatus } = useQuery({
    queryKey: ["clockify-setup"],
    queryFn: () => checkClockifySetup(),
    enabled: !!session?.user,
  });

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const hasInitializedProjectSelectionRef = useRef(false);

  const { data: currentConfig } = useQuery({
    queryKey: ["current-config"],
    queryFn: () => getCurrentConfig({ data: undefined }),
    enabled: !!session?.user,
  });

  const { data: availableProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: [
      "clockify-projects",
      state.selectedWorkspaceId,
      state.selectedClientId,
    ],
    queryFn: () => {
      if (!state.selectedWorkspaceId) {
        throw new Error("Clockify workspace not configured");
      }

      return getClockifyProjects({
        data: {
          workspaceId: state.selectedWorkspaceId,
          clientId: state.selectedClientId ?? undefined,
          apiKey: state.apiKey || undefined,
        },
      });
    },
    enabled:
      !!session?.user &&
      !!state.selectedWorkspaceId &&
      !isInitializing &&
      currentStep >= 4,
  });

  const filteredProjects =
    availableProjects?.success && availableProjects.projects
      ? availableProjects.projects.filter((project) => {
          if (!state.selectedClientId && !state.selectedClientName) {
            return true;
          }

          if (
            state.selectedClientId &&
            project.clientId === state.selectedClientId
          ) {
            return true;
          }

          if (
            state.selectedClientName &&
            project.clientName.toLowerCase() ===
              state.selectedClientName.toLowerCase()
          ) {
            return true;
          }

          return false;
        })
      : [];

  useEffect(() => {
    hasInitializedProjectSelectionRef.current = false;
    setSelectedProjectIds([]);
  }, [state.selectedWorkspaceId, state.selectedClientId]);

  useEffect(() => {
    if (hasInitializedProjectSelectionRef.current) {
      return;
    }

    if (!availableProjects?.success) {
      return;
    }

    const availableProjectIdSet = new Set(filteredProjects.map((project) => project.id));
    const preselectedIds =
      currentConfig?.success && currentConfig.config
        ? currentConfig.config.value.projectIds.filter((projectId) =>
            availableProjectIdSet.has(projectId),
          )
        : [];

    setSelectedProjectIds(preselectedIds);
    hasInitializedProjectSelectionRef.current = true;
  }, [availableProjects, currentConfig, filteredProjects]);

  useEffect(() => {
    if (!session?.user) {
      setIsInitializing(false);
      return;
    }

    if (!setupStatus || isResumedRef.current) {
      return;
    }

    isResumedRef.current = true;

    const resumeSetup = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const hasApiKey = setupStatus.steps.hasApiKey;
        setHasStoredApiKey(hasApiKey);

        const configResult = await getClockifyConfig();
        const detailsResult = hasApiKey
          ? await getClockifyDetails()
          : { success: false as const };

        const workspacesResult = hasApiKey
          ? await getClockifyWorkspaces({ data: {} })
          : { success: false as const };

        const workspaces = workspacesResult.success
          ? (workspacesResult.workspaces ?? [])
          : [];

        const selectedWorkspaceId =
          (configResult.success && configResult.config.clockifyWorkspaceId) ||
          workspaces[0]?.id ||
          "";

        const clientsResult =
          hasApiKey && selectedWorkspaceId
            ? await getClockifyClients({ data: { workspaceId: selectedWorkspaceId } })
            : { success: false as const };

        const clients = clientsResult.success ? (clientsResult.clients ?? []) : [];

        setState((prev) => ({
          ...prev,
          validatedUser: detailsResult.success ? detailsResult.clockifyUser : null,
          workspaces,
          selectedWorkspaceId,
          clients,
          selectedClientId:
            (configResult.success ? configResult.config.selectedClientId : null) ??
            null,
          selectedClientName:
            (configResult.success ? configResult.config.selectedClientName : null) ??
            null,
          regularHoursPerWeek: configResult.success
            ? configResult.config.regularHoursPerWeek
            : prev.regularHoursPerWeek,
          workingDaysPerWeek: configResult.success
            ? configResult.config.workingDaysPerWeek
            : prev.workingDaysPerWeek,
          cumulativeOvertimeStartDate:
            configResult.success &&
            configResult.config.cumulativeOvertimeStartDate
              ? configResult.config.cumulativeOvertimeStartDate.split("T")[0]
              : prev.cumulativeOvertimeStartDate,
        }));

        const usesAllClients =
          configResult.success && !configResult.config.selectedClientId;

        if (!setupStatus.steps.hasApiKey) {
          setCurrentStep(1);
        } else if (!setupStatus.steps.hasWorkspace) {
          setCurrentStep(2);
        } else if (usesAllClients && !setupStatus.steps.hasTrackedProjects) {
          // Client filter is optional; when "All clients" is selected, resume at
          // tracked projects instead of forcing users back to settings.
          setCurrentStep(4);
        } else if (!setupStatus.steps.hasClient) {
          setCurrentStep(3);
        } else if (!setupStatus.steps.hasTrackedProjects) {
          setCurrentStep(4);
        } else {
          setCurrentStep(5);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resume setup");
      } finally {
        setIsInitializing(false);
      }
    };

    void resumeSetup();
  }, [session?.user, setupStatus]);

  // Step 1: Validate API Key
  const handleValidateApiKey = async () => {
    if (!state.apiKey && !hasStoredApiKey) {
      setError("Please enter your Clockify API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let validatedUser: ClockifyUser | null = null;
      const hasTypedApiKey = !!state.apiKey;

      if (hasTypedApiKey) {
        const result = await validateClockifyKey({
          data: { apiKey: state.apiKey },
        });

        if (!result.success) {
          setError(result.error || "Invalid API key");
          return;
        }

        validatedUser = result.user;
      }

      const workspacesResult = await getClockifyWorkspaces({
        data: hasTypedApiKey ? { apiKey: state.apiKey } : {},
      });

      if (!workspacesResult.success) {
        setError(workspacesResult.error || "Failed to fetch workspaces");
        return;
      }

      if (!validatedUser) {
        const detailsResult = await getClockifyDetails();
        if (detailsResult.success) {
          validatedUser = detailsResult.clockifyUser;
        }
      }

      setState((prev) => ({
        ...prev,
        validatedUser: validatedUser ?? prev.validatedUser,
        workspaces: workspacesResult.workspaces || [],
        selectedWorkspaceId:
          prev.selectedWorkspaceId || workspacesResult.workspaces?.[0]?.id || "",
      }));

      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select Workspace and fetch clients
  const handleSelectWorkspace = async () => {
    if (!state.selectedWorkspaceId) {
      setError("Please select a workspace");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clientsResult = await getClockifyClients({
        data: state.apiKey
          ? {
              workspaceId: state.selectedWorkspaceId,
              apiKey: state.apiKey,
            }
          : { workspaceId: state.selectedWorkspaceId },
      });

      if (!clientsResult.success) {
        setError(clientsResult.error || "Failed to fetch clients");
        return;
      }

      setState((prev) => ({
        ...prev,
        clients: clientsResult.clients || [],
      }));

      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Configure settings
  const handleConfigureSettings = () => {
    setCurrentStep(4);
  };

  // Step 4: Select tracked projects
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const handleConfigureTrackedProjects = () => {
    setError(null);

    if (!availableProjects?.success) {
      setError("Unable to load projects for the selected client");
      return;
    }

    if (filteredProjects.length === 0) {
      setError("No projects found for the selected client");
      return;
    }

    if (selectedProjectIds.length === 0) {
      setError("Please select at least one project to track");
      return;
    }

    setCurrentStep(5);
  };

  // Step 5: Save configuration
  const handleSaveConfiguration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await saveClockifyConfig({
        data: {
          clockifyApiKey: state.apiKey || undefined,
          clockifyWorkspaceId: state.selectedWorkspaceId,
          clockifyUserId: state.validatedUser?.id,
          timeZone: state.validatedUser?.settings.timeZone,
          weekStart: state.validatedUser?.settings.weekStart,
          regularHoursPerWeek: state.regularHoursPerWeek,
          workingDaysPerWeek: state.workingDaysPerWeek,
          selectedClientId: state.selectedClientId,
          selectedClientName: state.selectedClientName,
          cumulativeOvertimeStartDate:
            state.cumulativeOvertimeStartDate || null,
        },
      });

      if (!result.success) {
        setError(result.error || "Failed to save configuration");
        return;
      }

      if (!availableProjects?.success) {
        setError("Unable to load projects for the selected client");
        return;
      }

      const selectedProjects = filteredProjects.filter((project) =>
        selectedProjectIds.includes(project.id),
      );

      if (selectedProjects.length === 0) {
        setError("Please select at least one project to track");
        setCurrentStep(4);
        return;
      }

      const configResult =
        currentConfig?.success && currentConfig.config
          ? await updateConfig({
              data: {
                configId: currentConfig.config.id,
                projectIds: selectedProjects.map((project) => project.id),
                projectNames: selectedProjects.map((project) => project.name),
              },
            })
          : await createConfig({
              data: {
                projectIds: selectedProjects.map((project) => project.id),
                projectNames: selectedProjects.map((project) => project.name),
                validFrom: new Date().toISOString(),
              },
            });

      if (!configResult.success) {
        setError(configResult.error || "Failed to save tracked projects");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["clockify-setup"] });
      queryClient.invalidateQueries({ queryKey: ["current-config"] });
      queryClient.invalidateQueries({ queryKey: ["tracked-projects"] });
      queryClient.invalidateQueries({
        queryKey: ["config-history", "tracked_projects"],
      });
      queryClient.invalidateQueries({ queryKey: ["clockify-config"] });
      queryClient.invalidateQueries({ queryKey: ["clockify-details"] });

      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toolbar user={session?.user || null} />

      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-5">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Clockify Setup Wizard
            </h1>
            <p className="text-gray-600">
              Connect your Clockify account to start tracking your time
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-start">
              {(
                [
                  { step: 1, label: "API Key" },
                  { step: 2, label: "Workspace" },
                  { step: 3, label: "Settings" },
                  { step: 4, label: "Projects" },
                  { step: 5, label: "Review" },
                ] as const
              ).map(({ step, label }, index) => (
                <div key={step} className="flex items-start flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                        step < currentStep
                          ? "bg-green-500 text-white"
                          : step === currentStep
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {step < currentStep ? "✓" : step}
                    </div>
                    <span className="mt-2 text-xs text-gray-600">{label}</span>
                  </div>
                  {index < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 mt-[1.2rem] ${
                        step < currentStep ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            {isInitializing && (
              <div className="flex items-center justify-center py-10 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading existing setup...
              </div>
            )}

            {/* Step 1: API Key Entry */}
            {!isInitializing && currentStep === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Key className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Enter Your API Key
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="apiKey"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Clockify API Key
                    </label>
                    <input
                      id="apiKey"
                      type="password"
                      value={state.apiKey}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your Clockify API key"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>How to get your API key:</strong>
                    </p>
                    <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                      <li>
                        Go to{" "}
                        <a
                          href="https://app.clockify.me/user/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline inline-flex items-center gap-1"
                        >
                          Clockify Settings
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Scroll down to the "API" section</li>
                      <li>Click "Generate" if you don't have a key yet</li>
                      <li>Copy the API key and paste it above</li>
                    </ol>
                  </div>

                  {hasStoredApiKey && !state.apiKey && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        A stored API key was found. You can continue without
                        entering it again.
                      </p>
                    </div>
                  )}

                  {state.validatedUser && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium mb-2">
                        ✓ API Key Validated
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Name:</strong> {state.validatedUser.name}
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Email:</strong> {state.validatedUser.email}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleValidateApiKey}
                    disabled={(!state.apiKey && !hasStoredApiKey) || isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        {state.apiKey
                          ? "Validate & Continue"
                          : "Continue with stored key"}
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Workspace Selection */}
            {!isInitializing && currentStep === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Select Workspace
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600">
                    Choose the workspace you want to track time from:
                  </p>

                  <div className="space-y-2">
                    {state.workspaces.map((workspace) => (
                      <label
                        key={workspace.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          state.selectedWorkspaceId === workspace.id
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-300 hover:border-indigo-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="workspace"
                          value={workspace.id}
                          checked={state.selectedWorkspaceId === workspace.id}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              selectedWorkspaceId: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-indigo-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {workspace.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            ID: {workspace.id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleSelectWorkspace}
                      disabled={!state.selectedWorkspaceId || isLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Configuration */}
            {!isInitializing && currentStep === 3 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Configure Settings
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Client Filter */}
                  <div>
                    <label
                      htmlFor="client"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Client Filter (Optional)
                    </label>
                    <select
                      id="client"
                      value={state.selectedClientId || ""}
                      onChange={(e) => {
                        const clientId = e.target.value || null;
                        const client = state.clients.find(
                          (c) => c.id === clientId,
                        );
                        setState((prev) => ({
                          ...prev,
                          selectedClientId: clientId,
                          selectedClientName: client?.name || null,
                        }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">All clients</option>
                      {state.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Filter time entries to only show data from a specific
                      client
                    </p>
                  </div>

                  {/* Regular Hours Per Week */}
                  <div>
                    <label
                      htmlFor="regularHours"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Regular Hours Per Week
                    </label>
                    <input
                      id="regularHours"
                      type="number"
                      min="1"
                      max="168"
                      value={state.regularHoursPerWeek}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          regularHoursPerWeek: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your expected working hours per week (e.g., 40 for
                      full-time)
                    </p>
                  </div>

                  {/* Working Days Per Week */}
                  <div>
                    <label
                      htmlFor="workingDays"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Working Days Per Week
                    </label>
                    <input
                      id="workingDays"
                      type="number"
                      min="1"
                      max="7"
                      value={state.workingDaysPerWeek}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          workingDaysPerWeek: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of days you work per week (e.g., 5 for
                      Monday-Friday)
                    </p>
                  </div>

                  {/* Cumulative Overtime Start Date */}
                  <div>
                    <label
                      htmlFor="overtimeStart"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Cumulative Overtime Start Date (Optional)
                    </label>
                    <input
                      id="overtimeStart"
                      type="date"
                      value={state.cumulativeOvertimeStartDate}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          cumulativeOvertimeStartDate: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Start tracking cumulative overtime from this date (e.g.,
                      beginning of the year)
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleConfigureSettings}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Configure Tracked Projects */}
            {!isInitializing && currentStep === 4 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <FolderKanban className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Configure Tracked Projects
                  </h2>
                </div>

                <div className="space-y-6">
                  <p className="text-gray-600">
                    Select which projects should be tracked in detail for your
                    weekly summary.
                  </p>

                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center py-10 text-gray-600">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading projects...
                    </div>
                  ) : availableProjects?.success ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose projects ({selectedProjectIds.length} selected):
                      </p>

                      <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredProjects.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No projects found for the selected client.
                          </div>
                        ) : (
                          filteredProjects.map((project) => (
                            <label
                              key={project.id}
                              className={`flex items-start gap-3 p-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                                selectedProjectIds.includes(project.id)
                                  ? "bg-indigo-50"
                                  : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedProjectIds.includes(project.id)}
                                onChange={() =>
                                  toggleProjectSelection(project.id)
                                }
                                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <p className="font-medium text-gray-900">
                                    {project.name}
                                  </p>
                                </div>
                                {project.clientName && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Client: {project.clientName}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        Unable to load projects. Please verify your Clockify
                        setup and selected client.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleConfigureTrackedProjects}
                      disabled={
                        isLoadingProjects ||
                        !availableProjects?.success ||
                        !filteredProjects.length
                      }
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review & Save */}
            {!isInitializing && currentStep === 5 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Review & Save
                  </h2>
                </div>

                <div className="space-y-6">
                  <p className="text-gray-600">
                    Please review your configuration before saving:
                  </p>

                  <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">User</p>
                      <p className="text-gray-900">
                        {state.validatedUser
                          ? `${state.validatedUser.name} (${state.validatedUser.email})`
                          : "Using your existing Clockify account"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Workspace
                      </p>
                      <p className="text-gray-900">
                        {state.workspaces.find(
                          (w) => w.id === state.selectedWorkspaceId,
                        )?.name || "Not selected"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Time Zone
                      </p>
                      <p className="text-gray-900">
                        {state.validatedUser?.settings.timeZone ||
                          "Using your existing timezone"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Week Start
                      </p>
                      <p className="text-gray-900">
                        {state.validatedUser?.settings.weekStart ||
                          "Using your existing week start"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Client Filter
                      </p>
                      <p className="text-gray-900">
                        {state.selectedClientName || "All clients"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Tracked Projects
                      </p>
                      <p className="text-gray-900">
                        {selectedProjectIds.length} selected
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Regular Hours Per Week
                      </p>
                      <p className="text-gray-900">
                        {state.regularHoursPerWeek}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Working Days Per Week
                      </p>
                      <p className="text-gray-900">
                        {state.workingDaysPerWeek}
                      </p>
                    </div>

                    {state.cumulativeOvertimeStartDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Cumulative Overtime Start
                        </p>
                        <p className="text-gray-900">
                          {new Date(
                            state.cumulativeOvertimeStartDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Back
                    </button>
                    <button
                      onClick={handleSaveConfiguration}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Save Configuration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
