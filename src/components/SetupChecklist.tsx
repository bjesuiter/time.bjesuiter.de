import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Settings, ArrowRight } from "lucide-react";
import type { SetupStatus } from "@/server/clockifyServerFns";

interface SetupChecklistProps {
  setupStatus: SetupStatus;
}

export function SetupChecklist({ setupStatus }: SetupChecklistProps) {
  const { steps } = setupStatus;

  const checklistItems = [
    {
      label: "Connect Clockify API",
      completed: steps.hasApiKey,
      description: "Enter your Clockify API key",
    },
    {
      label: "Select Workspace",
      completed: steps.hasWorkspace,
      description: "Choose your Clockify workspace",
    },
    {
      label: "Select Client",
      completed: steps.hasClient,
      description: "Pick a client to track time for",
    },
    {
      label: "Configure Tracked Projects",
      completed: steps.hasTrackedProjects,
      description: "Select which projects to track",
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Settings className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Complete Your Setup
          </h2>
          <p className="text-sm text-gray-500">
            {completedCount} of {checklistItems.length} steps completed
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {checklistItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              item.completed ? "bg-green-50" : "bg-gray-50"
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`font-medium ${
                  item.completed ? "text-green-800" : "text-gray-700"
                }`}
              >
                {item.label}
              </p>
              <p
                className={`text-sm ${
                  item.completed ? "text-green-600" : "text-gray-500"
                }`}
              >
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        to="/settings"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        Go to Settings
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
