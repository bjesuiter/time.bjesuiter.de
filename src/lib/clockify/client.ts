import { HTTPError } from "ky";
import { format, parseISO, isValid } from "date-fns";
import { createClockifyApi } from "./api-instance";
import { createClockifyReportsApi } from "./reports-api-instance";
import type {
  ClockifyClient,
  ClockifyError,
  ClockifyProject,
  ClockifyResult,
  ClockifyUser,
  ClockifyWorkspace,
  ClockifySummaryReportRequest,
  ClockifySummaryReportResponse,
  WeeklyTimeReportInput,
  WeeklyTimeReportOutput,
  DailyBreakdown,
} from "./types";

/**
 * Helper function to handle API errors
 */
async function handleError(error: unknown): Promise<ClockifyError> {
  if (error instanceof HTTPError) {
    try {
      const errorData = await error.response.json();
      return {
        message: errorData.message || error.message,
        code: error.response.status,
      };
    } catch {
      return {
        message: error.message,
        code: error.response.status,
      };
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "An unknown error occurred",
  };
}

/**
 * Validates the API key and fetches user information
 * @param apiKey - The Clockify API key to validate
 * @returns User information if valid, error otherwise
 */
export async function validateApiKey(
  apiKey: string,
): Promise<ClockifyResult<ClockifyUser>> {
  try {
    const api = createClockifyApi(apiKey);
    const user = await api.get("user").json<ClockifyUser>();
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: await handleError(error) };
  }
}

/**
 * Fetches user information including timezone and weekStart settings
 * This is an alias for validateApiKey for semantic clarity
 * @param apiKey - The Clockify API key
 * @returns User information
 */
export async function getUserInfo(
  apiKey: string,
): Promise<ClockifyResult<ClockifyUser>> {
  return validateApiKey(apiKey);
}

/**
 * Fetches all workspaces accessible by the user
 * @param apiKey - The Clockify API key
 * @returns List of workspaces
 */
export async function getWorkspaces(
  apiKey: string,
): Promise<ClockifyResult<ClockifyWorkspace[]>> {
  try {
    const api = createClockifyApi(apiKey);
    const workspaces = await api.get("workspaces").json<ClockifyWorkspace[]>();
    return { success: true, data: workspaces };
  } catch (error) {
    return { success: false, error: await handleError(error) };
  }
}

/**
 * Fetches all clients in a workspace
 * @param apiKey - The Clockify API key
 * @param workspaceId - The workspace ID
 * @returns List of clients
 */
export async function getClients(
  apiKey: string,
  workspaceId: string,
): Promise<ClockifyResult<ClockifyClient[]>> {
  try {
    const api = createClockifyApi(apiKey);
    const clients = await api
      .get(`workspaces/${workspaceId}/clients`)
      .json<ClockifyClient[]>();
    return { success: true, data: clients };
  } catch (error) {
    return { success: false, error: await handleError(error) };
  }
}

/**
 * Fetches all projects in a workspace, optionally filtered by client
 * @param apiKey - The Clockify API key
 * @param workspaceId - The workspace ID
 * @param clientId - Optional client ID to filter projects
 * @returns List of projects
 */
export async function getProjects(
  apiKey: string,
  workspaceId: string,
  clientId?: string,
): Promise<ClockifyResult<ClockifyProject[]>> {
  try {
    const api = createClockifyApi(apiKey);

    // Build query parameters
    const searchParams = new URLSearchParams();
    if (clientId) {
      searchParams.set("clients", clientId);
    }

    const url = `workspaces/${workspaceId}/projects${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const projects = await api.get(url).json<ClockifyProject[]>();
    return { success: true, data: projects };
  } catch (error) {
    return { success: false, error: await handleError(error) };
  }
}

/**
 * Fetches weekly time report with daily breakdown per project
 * Makes three API calls:
 * 1. Get total time per day (all projects for the client)
 * 2. Get time per day per tracked project
 * 3. Get time per day per ALL projects (to identify extra work projects)
 * Then calculates "extra work" as the difference
 * 
 * Note: Clockify API returns durations in seconds (not milliseconds as some docs suggest)
 * 
 * @param apiKey - The Clockify API key
 * @param input - Report parameters (workspaceId, clientId, projectIds, date range)
 * @returns Daily breakdown with tracked projects, totals, extra work, and extra work project breakdown
 */
export async function getWeeklyTimeReport(
  apiKey: string,
  input: WeeklyTimeReportInput,
): Promise<ClockifyResult<WeeklyTimeReportOutput>> {
  try {
    const reportsApi = createClockifyReportsApi(apiKey);
    const { workspaceId, clientId, projectIds, startDate, endDate } = input;

    // Call 1: Get total time per day (all projects for this client)
    const totalTimeRequest: ClockifySummaryReportRequest = {
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      summaryFilter: {
        groups: ["DATE"],
      },
      clients: {
        ids: [clientId],
        contains: "CONTAINS",
      },
      exportType: "JSON",
    };

    // Call 2: Get time per day per tracked project
    const trackedProjectsRequest: ClockifySummaryReportRequest = {
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      summaryFilter: {
        groups: ["DATE", "PROJECT"],
      },
      clients: {
        ids: [clientId],
        contains: "CONTAINS",
      },
      projects: {
        ids: projectIds,
        contains: "CONTAINS",
      },
      exportType: "JSON",
    };

    // Call 3: Get time per day per ALL projects (to identify extra work projects)
    const allProjectsRequest: ClockifySummaryReportRequest = {
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      summaryFilter: {
        groups: ["DATE", "PROJECT"],
      },
      clients: {
        ids: [clientId],
        contains: "CONTAINS",
      },
      exportType: "JSON",
    };

    // Execute all three API calls in parallel
    const [totalTimeResponse, trackedProjectsResponse, allProjectsResponse] =
      await Promise.all([
        reportsApi
          .post(`workspaces/${workspaceId}/reports/summary`, {
            json: totalTimeRequest,
          })
          .json<ClockifySummaryReportResponse>(),
        reportsApi
          .post(`workspaces/${workspaceId}/reports/summary`, {
            json: trackedProjectsRequest,
          })
          .json<ClockifySummaryReportResponse>(),
        reportsApi
          .post(`workspaces/${workspaceId}/reports/summary`, {
            json: allProjectsRequest,
          })
          .json<ClockifySummaryReportResponse>(),
      ]);

    // Transform the responses into the output format
    const dailyBreakdown: Record<string, DailyBreakdown> = {};

    // Create a Set of tracked project IDs for fast lookup
    const trackedProjectIdSet = new Set(projectIds);

    // Process total time per day (Call 1 response)
    const totalTimeByDate: Record<string, number> = {};
    for (const group of totalTimeResponse.groupOne) {
      const date = extractDateFromId(group._id);
      const seconds = group.duration; // Already in seconds
      totalTimeByDate[date] = seconds;
    }

    // Process ALL projects per day (Call 3 response) to identify extra work projects
    const extraWorkProjectsByDate: Record<
      string,
      Record<string, { projectId: string; projectName: string; seconds: number }>
    > = {};
    for (const dateGroup of allProjectsResponse.groupOne) {
      const date = extractDateFromId(dateGroup._id);
      extraWorkProjectsByDate[date] = {};

      if (dateGroup.children) {
        for (const projectGroup of dateGroup.children) {
          const projectId = projectGroup._id;
          // Only include if NOT in tracked projects
          if (!trackedProjectIdSet.has(projectId)) {
            extraWorkProjectsByDate[date][projectId] = {
              projectId,
              projectName: projectGroup.name,
              seconds: projectGroup.duration,
            };
          }
        }
      }
    }

    // Process tracked projects per day (Call 2 response)
    for (const dateGroup of trackedProjectsResponse.groupOne) {
      const date = extractDateFromId(dateGroup._id);

      // Initialize daily breakdown for this date
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = {
          date,
          trackedProjects: {},
          extraWorkProjects: extraWorkProjectsByDate[date] || {},
          totalSeconds: totalTimeByDate[date] || 0,
          extraWorkSeconds: 0,
        };
      }

      // Add tracked projects for this date
      let trackedProjectsSum = 0;
      if (dateGroup.children) {
        for (const projectGroup of dateGroup.children) {
          const projectId = projectGroup._id;
          const projectName = projectGroup.name;
          const seconds = projectGroup.duration; // Already in seconds

          dailyBreakdown[date].trackedProjects[projectId] = {
            projectId,
            projectName,
            seconds,
          };

          trackedProjectsSum += seconds;
        }
      }

      // Calculate extra work (difference between total and tracked)
      dailyBreakdown[date].extraWorkSeconds =
        dailyBreakdown[date].totalSeconds - trackedProjectsSum;
    }

    // Handle dates that appear in total time but not in tracked projects
    // (days where all work was on non-tracked projects)
    for (const date in totalTimeByDate) {
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = {
          date,
          trackedProjects: {},
          extraWorkProjects: extraWorkProjectsByDate[date] || {},
          totalSeconds: totalTimeByDate[date],
          extraWorkSeconds: totalTimeByDate[date], // All time is extra work
        };
      }
    }

    return {
      success: true,
      data: {
        dailyBreakdown,
      },
    };
  } catch (error) {
    return { success: false, error: await handleError(error) };
  }
}

function extractDateFromId(dateId: string): string {
  try {
    const date = parseISO(dateId);
    if (isValid(date)) {
      return format(date, "yyyy-MM-dd");
    }
  } catch {
    // If parsing fails, assume it's already in a usable format
  }
  return dateId;
}
