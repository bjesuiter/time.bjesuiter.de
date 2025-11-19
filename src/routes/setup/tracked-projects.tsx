import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/client/auth-client";
import { Toolbar } from "@/components/Toolbar";
import {
  getClockifyDetails,
  getClockifyProjects,
} from "@/server/clockifyServerFns";
import { createConfig, getCurrentConfig } from "@/server/configServerFns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban,
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/setup/tracked-projects")({
  component: TrackedProjectsSetup,
});

function TrackedProjectsSetup() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  // Get Clockify configuration
  const { data: clockifyDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["clockify-details"],
    queryFn: () => getClockifyDetails(),
    enabled: !!session?.user,
  });

  // Get available projects from Clockify
  const { data: availableProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: [
      "clockify-projects",
      clockifyDetails?.config?.clockifyWorkspaceId,
      clockifyDetails?.config?.selectedClientId,
    ],
    queryFn: () =>
      getClockifyProjects({
        data: {
          workspaceId: clockifyDetails!.config.clockifyWorkspaceId,
          clientId: clockifyDetails!.config.selectedClientId || undefined,
        },
      }),
    enabled:
      !!clockifyDetails?.success &&
      !!clockifyDetails.config.clockifyWorkspaceId,
  });

  // Get current config to validate start date
  const { data: currentConfig } = useQuery({
    queryKey: ["current-config"],
    queryFn: async () => {
      const result = await getCurrentConfig({ data: undefined });
      return result;
    },
    enabled: !!session?.user,
  });

  // State
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize validFrom to current date/time
  useEffect(() => {
    const now = new Date();
    // Format as datetime-local input value (YYYY-MM-DDTHH:mm)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setValidFrom(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, []);

  // Mutation to create config
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      projectIds: string[];
      projectNames: string[];
      validFrom: string;
    }) => createConfig({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-projects"] });
      queryClient.invalidateQueries({ queryKey: ["config-history"] });
      queryClient.invalidateQueries({ queryKey: ["current-config"] });
      navigate({ to: "/settings" });
    },
    onError: (error: any) => {
      setError(error?.message || "Failed to create configuration");
    },
  });

  const handleSave = () => {
    setError(null);

    // Validation
    if (selectedProjectIds.length === 0) {
      setError("Please select at least one project to track");
      return;
    }

    if (!validFrom) {
      setError("Please specify when this configuration should take effect");
      return;
    }

    // Validate start date against current config
    if (currentConfig?.success && currentConfig.config) {
      const currentValidFrom = new Date(currentConfig.config.validFrom);
      const newValidFrom = new Date(validFrom);
      if (newValidFrom < currentValidFrom) {
        setError(
          `Start date cannot be before the current config's start date (${currentValidFrom.toLocaleString()})`,
        );
        return;
      }
    }

    if (!availableProjects?.success || !availableProjects.projects) {
      setError("Unable to load projects");
      return;
    }

    const selectedProjects = availableProjects.projects.filter((p) =>
      selectedProjectIds.includes(p.id),
    );

    createConfigMutation.mutate({
      projectIds: selectedProjects.map((p) => p.id),
      projectNames: selectedProjects.map((p) => p.name),
      validFrom: new Date(validFrom).toISOString(),
    });
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

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
              Please sign in to configure tracked projects.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toolbar user={session.user} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FolderKanban className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Setup Tracked Projects
              </h1>
            </div>
            <p className="text-gray-600">
              Select which projects should be displayed in detail in your weekly
              time breakdown. Other projects will be grouped under "Extra Work".
            </p>
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

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            {isLoadingDetails || isLoadingProjects ? (
              <div className="flex items-center justify-center py-12 text-gray-600">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading...
              </div>
            ) : availableProjects?.success && availableProjects.projects ? (
              <div className="space-y-6">
                {/* Projects Selection */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Select Projects
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose which projects to track ({selectedProjectIds.length}{" "}
                    selected):
                  </p>

                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {availableProjects.projects.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No projects found. Create some projects in Clockify
                        first.
                      </div>
                    ) : (
                      availableProjects.projects.map((project) => (
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
                            onChange={() => toggleProjectSelection(project.id)}
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

                {/* Effective Date */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Effective Date
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    When should this configuration take effect? You can set a
                    date in the past or future.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="validFrom"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Effective From
                      </label>
                      <input
                        type="datetime-local"
                        id="validFrom"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {currentConfig?.success && currentConfig.config && (
                          <>
                            Current config starts:{" "}
                            {new Date(
                              currentConfig.config.validFrom,
                            ).toLocaleString()}
                          </>
                        )}
                      </p>
                    </div>

                    {currentConfig?.success && currentConfig.config && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> If you set a future date, the
                          current configuration will remain active until that
                          date. If you set a past date, it will replace the
                          current configuration retroactively.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> You can edit this configuration's
                      dates after saving it from the Configuration History
                      section on the Settings page.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate({ to: "/settings" })}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={createConfigMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {createConfigMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Configuration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  Unable to load projects. Please check your Clockify
                  configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
