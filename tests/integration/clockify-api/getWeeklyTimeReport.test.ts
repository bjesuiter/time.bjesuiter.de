import { expect, test } from "bun:test";
import { getWeeklyTimeReport } from "../../../src/lib/clockify/client";
import { expectString } from "tests/shared/helpers/expect-ts-helpers";

const validApiKey = process.env.CLOCKIFY_TEST_API_KEY;
const validWorkspaceId = process.env.CLOCKIFY_TEST_WORKSPACE_ID;

/**
 * Integration tests for getWeeklyTimeReport function
 *
 * NOTE: These tests require actual data in your Clockify workspace.
 * You need to set up:
 * - CLOCKIFY_TEST_API_KEY: Your Clockify API key
 * - CLOCKIFY_TEST_WORKSPACE_ID: A workspace ID
 * - CLOCKIFY_TEST_CLIENT_ID: A client ID with time entries
 * - CLOCKIFY_TEST_PROJECT_IDS: Comma-separated list of project IDs (optional)
 *
 * For the date range tests, ensure you have time entries logged in your workspace
 * within the test date ranges.
 *
 * IMPORTANT: All duration values are in SECONDS (not milliseconds).
 * The Clockify API returns durations in seconds, despite some documentation
 * suggesting milliseconds.
 */

test("getWeeklyTimeReport-001: successfully fetches weekly time report with valid parameters", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  // Use a recent week for testing (last week)
  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const startDate = lastWeekStart.toISOString();
  const endDate = lastWeekEnd.toISOString();

  // Get project IDs from env or use empty array
  const projectIdsStr = process.env.CLOCKIFY_TEST_PROJECT_IDS || "";
  const projectIds = projectIdsStr ? projectIdsStr.split(",") : [];

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds,
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(result.data.dailyBreakdown).toBeDefined();
    expect(typeof result.data.dailyBreakdown).toBe("object");
  }
});

test("getWeeklyTimeReport-002: daily breakdown structure contains expected fields", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const startDate = lastWeekStart.toISOString();
  const endDate = lastWeekEnd.toISOString();

  const projectIdsStr = process.env.CLOCKIFY_TEST_PROJECT_IDS || "";
  const projectIds = projectIdsStr ? projectIdsStr.split(",") : [];

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds,
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    const breakdown = result.data.dailyBreakdown;

    // Check structure of each day (if any days have data)
    const dates = Object.keys(breakdown);
    if (dates.length > 0) {
      const firstDate = dates[0];
      const dayData = breakdown[firstDate];

      // Verify required fields
      expect(dayData).toHaveProperty("date");
      expect(dayData).toHaveProperty("trackedProjects");
      expect(dayData).toHaveProperty("totalSeconds");
      expect(dayData).toHaveProperty("extraWorkSeconds");

      // Verify data types
      expect(typeof dayData.date).toBe("string");
      expect(typeof dayData.trackedProjects).toBe("object");
      expect(typeof dayData.totalSeconds).toBe("number");
      expect(typeof dayData.extraWorkSeconds).toBe("number");

      // Verify date format (YYYY-MM-DD)
      expect(dayData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // totalSeconds should be >= 0
      expect(dayData.totalSeconds).toBeGreaterThanOrEqual(0);

      // extraWorkSeconds should be >= 0 (can't be negative)
      expect(dayData.extraWorkSeconds).toBeGreaterThanOrEqual(0);
    }
  }
});

test("getWeeklyTimeReport-003: tracked projects structure is correct when projects exist", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  const projectIdsStr = process.env.CLOCKIFY_TEST_PROJECT_IDS;
  if (!projectIdsStr) {
    console.log("Skipping test: CLOCKIFY_TEST_PROJECT_IDS not set");
    return;
  }

  const projectIds = projectIdsStr.split(",");

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const startDate = lastWeekStart.toISOString();
  const endDate = lastWeekEnd.toISOString();

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds,
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    const breakdown = result.data.dailyBreakdown;

    // Find a day with tracked projects
    for (const date in breakdown) {
      const dayData = breakdown[date];
      const projectKeys = Object.keys(dayData.trackedProjects);

      if (projectKeys.length > 0) {
        const firstProjectId = projectKeys[0];
        const projectData = dayData.trackedProjects[firstProjectId];

        // Verify project structure
        expect(projectData).toHaveProperty("projectId");
        expect(projectData).toHaveProperty("projectName");
        expect(projectData).toHaveProperty("seconds");

        // Verify data types
        expect(typeof projectData.projectId).toBe("string");
        expect(typeof projectData.projectName).toBe("string");
        expect(typeof projectData.seconds).toBe("number");

        // Seconds should be >= 0
        expect(projectData.seconds).toBeGreaterThanOrEqual(0);

        // Project ID should match one of the requested project IDs
        expect(projectIds).toContain(projectData.projectId);

        break; // Only need to check one project
      }
    }
  }
});

test("getWeeklyTimeReport-004: extra work calculation is correct", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  const projectIdsStr = process.env.CLOCKIFY_TEST_PROJECT_IDS || "";
  const projectIds = projectIdsStr ? projectIdsStr.split(",") : [];

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const startDate = lastWeekStart.toISOString();
  const endDate = lastWeekEnd.toISOString();

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds,
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    const breakdown = result.data.dailyBreakdown;

    // Verify calculation for each day
    for (const date in breakdown) {
      const dayData = breakdown[date];

      // Calculate sum of tracked projects
      let trackedSum = 0;
      for (const projectId in dayData.trackedProjects) {
        trackedSum += dayData.trackedProjects[projectId].seconds;
      }

      // Verify extra work = total - tracked
      const expectedExtraWork = dayData.totalSeconds - trackedSum;
      expect(dayData.extraWorkSeconds).toBe(expectedExtraWork);

      // Extra work should never be negative (totalSeconds >= trackedSum)
      expect(dayData.extraWorkSeconds).toBeGreaterThanOrEqual(0);

      // Total should be >= sum of tracked projects
      expect(dayData.totalSeconds).toBeGreaterThanOrEqual(trackedSum);
    }
  }
});

test("getWeeklyTimeReport-005: handles empty date range (no time entries)", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  // Use a future date range where there likely won't be any data
  const futureStart = new Date("2030-01-01T00:00:00.000Z");
  const futureEnd = new Date("2030-01-07T23:59:59.999Z");

  const startDate = futureStart.toISOString();
  const endDate = futureEnd.toISOString();

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds: [],
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(result.data.dailyBreakdown).toBeDefined();

    // Daily breakdown should be empty or have all zeros
    const dates = Object.keys(result.data.dailyBreakdown);
    if (dates.length > 0) {
      for (const date in result.data.dailyBreakdown) {
        const dayData = result.data.dailyBreakdown[date];
        expect(dayData.totalSeconds).toBe(0);
        expect(dayData.extraWorkSeconds).toBe(0);
        expect(Object.keys(dayData.trackedProjects).length).toBe(0);
      }
    }
  }
});

test("getWeeklyTimeReport-006: handles invalid workspace ID", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID || "test-client-id";
  const invalidWorkspaceId = "invalid-workspace-id-12345";

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 7);
  const endDate = new Date(now);

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: invalidWorkspaceId,
    clientId,
    projectIds: [],
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeDefined();
    expect(result.error.message).toBeDefined();
    expect(typeof result.error.message).toBe("string");

    if (result.error.code !== undefined) {
      // Should be 401 (Unauthorized), 403 (Forbidden), or 404 (Not Found)
      expect([401, 403, 404]).toContain(result.error.code);
    }
  }
});

test("getWeeklyTimeReport-007: handles empty project IDs array", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const startDate = lastWeekStart.toISOString();
  const endDate = lastWeekEnd.toISOString();

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds: [], // No tracked projects
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    const breakdown = result.data.dailyBreakdown;

    // All work should be "extra work" since no projects are tracked
    for (const date in breakdown) {
      const dayData = breakdown[date];

      // No tracked projects
      expect(Object.keys(dayData.trackedProjects).length).toBe(0);

      // All time should be extra work
      expect(dayData.extraWorkSeconds).toBe(dayData.totalSeconds);
    }
  }
});

test("getWeeklyTimeReport-008: date keys are in correct format (YYYY-MM-DD)", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  expectString(clientId, "CLOCKIFY_TEST_CLIENT_ID not set");

  const now = new Date();
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const startDate = lastWeekStart.toISOString();
  const endDate = lastWeekEnd.toISOString();

  const projectIdsStr = process.env.CLOCKIFY_TEST_PROJECT_IDS || "";
  const projectIds = projectIdsStr ? projectIdsStr.split(",") : [];

  const result = await getWeeklyTimeReport(validApiKey!, {
    workspaceId: validWorkspaceId!,
    clientId: clientId!,
    projectIds,
    startDate,
    endDate,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    const breakdown = result.data.dailyBreakdown;
    const dates = Object.keys(breakdown);

    for (const date of dates) {
      // Check date format (YYYY-MM-DD)
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's a valid date
      const parsedDate = new Date(date);
      expect(isNaN(parsedDate.getTime())).toBe(false);

      // Verify date field matches the key
      expect(breakdown[date].date).toBe(date);
    }
  }
});
