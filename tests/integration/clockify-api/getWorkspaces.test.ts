import { expect, test } from "bun:test";
import { getWorkspaces } from "../../../src/lib/clockify/client";
import { expectString } from "tests/shared/helpers/expect-ts-helpers";

const validApiKey = process.env.CLOCKIFY_TEST_API_KEY;

test("getWorkspaces-001: returns array of workspaces with valid API key", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");

  const result = await getWorkspaces(validApiKey!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);

    // Verify first workspace structure
    const workspace = result.data[0];
    expect(workspace).toHaveProperty("id");
    expect(workspace).toHaveProperty("name");
    expect(workspace).toHaveProperty("workspaceSettings");

    // Verify data types
    expect(typeof workspace.id).toBe("string");
    expect(typeof workspace.name).toBe("string");
    expect(typeof workspace.workspaceSettings).toBe("object");
    expect(workspace.workspaceSettings).toHaveProperty("timeTrackingMode");
    expect(workspace.workspaceSettings).toHaveProperty("onlyAdminsCreateTag");
    expect(workspace.workspaceSettings).toHaveProperty("onlyAdminsCreateTask");
    expect(workspace.workspaceSettings).toHaveProperty("timeRoundingInReports");
    expect(workspace.workspaceSettings).toHaveProperty("onlyAdminsSeeBillableRates");
  }
});



test("getWorkspaces-002: workspace data contains required fields", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");

  const result = await getWorkspaces(validApiKey!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);

    // Check all workspaces have required fields
    result.data.forEach((workspace) => {
      expect(workspace).toHaveProperty("id");
      expect(workspace).toHaveProperty("name");
      expect(workspace).toHaveProperty("workspaceSettings");
      expect(workspace).toHaveProperty("hourlyRate");
      expect(workspace).toHaveProperty("memberships");
      expect(workspace).toHaveProperty("imageUrl");
      expect(workspace).toHaveProperty("featureSubscriptionType");

      // Verify workspace settings structure
      expect(workspace.workspaceSettings).toHaveProperty("timeTrackingMode");
      expect(workspace.workspaceSettings).toHaveProperty("onlyAdminsCreateTag");
      expect(workspace.workspaceSettings).toHaveProperty("onlyAdminsCreateTask");
      expect(workspace.workspaceSettings).toHaveProperty("timeRoundingInReports");
      expect(workspace.workspaceSettings).toHaveProperty("onlyAdminsSeeBillableRates");
      expect(workspace.workspaceSettings).toHaveProperty("isProjectPublicByDefault");
    });
  }
});

test("getWorkspaces-003: handles multiple workspaces correctly", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");

  const result = await getWorkspaces(validApiKey!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Should handle 1 or more workspaces
    expect(result.data.length).toBeGreaterThanOrEqual(1);

    // Each workspace should have unique ID
    const workspaceIds = result.data.map(w => w.id);
    const uniqueIds = new Set(workspaceIds);
    expect(uniqueIds.size).toBe(workspaceIds.length);

    // Each workspace should have unique name
    const workspaceNames = result.data.map(w => w.name);
    const uniqueNames = new Set(workspaceNames);
    expect(uniqueNames.size).toBe(workspaceNames.length);
  }
});