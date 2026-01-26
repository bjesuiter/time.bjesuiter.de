import { expect, test } from "bun:test";
import { getProjects } from "../../../src/lib/clockify/client";
import { expectString } from "tests/shared/helpers/expect-ts-helpers";

const validApiKey = process.env.CLOCKIFY_TEST_API_KEY;
const validWorkspaceId = process.env.CLOCKIFY_TEST_WORKSPACE_ID;
const invalidWorkspaceId = "invalid-workspace-id-12345";
const invalidClientId = "invalid-client-id-12345";

test("getProjects-001: returns array of projects with valid API key and workspace", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getProjects(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Verify project structure (if any projects exist)
    if (result.data.length > 0) {
      const project = result.data[0];
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("clientId");
      expect(project).toHaveProperty("clientName");
      expect(project).toHaveProperty("workspaceId");
      expect(project).toHaveProperty("billable");
      expect(project).toHaveProperty("archived");

      // Verify data types
      expect(typeof project.id).toBe("string");
      expect(typeof project.name).toBe("string");
      expect(typeof project.clientId).toBe("string");
      expect(typeof project.clientName).toBe("string");
      expect(typeof project.workspaceId).toBe("string");
      expect(typeof project.billable).toBe("boolean");
      expect(typeof project.archived).toBe("boolean");
    }
  }
});

test("getProjects-002: returns error for invalid workspace ID", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");

  const result = await getProjects(validApiKey!, invalidWorkspaceId);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeDefined();
    
    const error = result.error;
    expect(error.message).toBeDefined();
    expect(typeof error.message).toBe("string");
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.code).toBe(403); // Forbidden
  }
});

test("getProjects-003: project data contains required fields", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getProjects(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Check all projects have required fields
    result.data.forEach((project) => {
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("clientId");
      expect(project).toHaveProperty("clientName");
      expect(project).toHaveProperty("workspaceId");
      expect(project).toHaveProperty("billable");
      expect(project).toHaveProperty("archived");
      expect(project).toHaveProperty("memberships");
      expect(project).toHaveProperty("color");

      // Verify data types
      expect(typeof project.id).toBe("string");
      expect(typeof project.name).toBe("string");
      expect(typeof project.clientId).toBe("string");
      expect(typeof project.clientName).toBe("string");
      expect(typeof project.workspaceId).toBe("string");
      expect(typeof project.billable).toBe("boolean");
      expect(typeof project.archived).toBe("boolean");
      expect(Array.isArray(project.memberships)).toBe(true);
      expect(typeof project.color).toBe("string");

      // Verify optional fields
      if (project.hourlyRate) {
        expect(typeof project.hourlyRate.amount).toBe("number");
        expect(typeof project.hourlyRate.currency).toBe("string");
      }
      if (project.estimate) {
        expect(typeof project.estimate.estimate).toBe("string");
        expect(typeof project.estimate.type).toBe("string");
      }
    });
  }
});

test("getProjects-004: filters projects by client ID when provided", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  // First get all projects to find a client ID
  const allProjectsResult = await getProjects(validApiKey!, validWorkspaceId!);
  expect(allProjectsResult.success).toBe(true);
  
  if (allProjectsResult.success && allProjectsResult.data.length > 0) {
    const firstProject = allProjectsResult.data[0];
    const clientId = firstProject.clientId;

    // Now filter by that client ID
    const filteredResult = await getProjects(validApiKey!, validWorkspaceId!, clientId);

    expect(filteredResult.success).toBe(true);
    if (filteredResult.success) {
      expect(filteredResult.data).toBeDefined();
      expect(Array.isArray(filteredResult.data)).toBe(true);

      // All returned projects should belong to the specified client
      filteredResult.data.forEach((project) => {
        expect(project.clientId).toBe(clientId);
      });
    }
  }
});

test("getProjects-005: returns all projects when no client filter provided", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getProjects(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Should have projects from multiple clients (if they exist)
    const clientIds = result.data.map(p => p.clientId);
    const uniqueClientIds = new Set(clientIds);
    
    // At least one client ID should exist
    expect(uniqueClientIds.size).toBeGreaterThanOrEqual(1);
  }
});

test("getProjects-006: returns empty array for invalid client ID", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getProjects(validApiKey!, validWorkspaceId!, invalidClientId);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(0); // Should be empty for invalid client
  }
});

test("getProjects-007: workspace ID matches in all returned projects", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getProjects(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // All projects should have the same workspace ID
    result.data.forEach((project) => {
      expect(project.workspaceId).toBe(validWorkspaceId);
    });
  }
});
