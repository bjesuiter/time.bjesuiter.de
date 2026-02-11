import { expect, test } from "bun:test";
import { getClients } from "../../../src/lib/clockify/client";
import { expectString } from "tests/shared/helpers/expect-ts-helpers";

const validApiKey = process.env.CLOCKIFY_TEST_API_KEY;
const validWorkspaceId = process.env.CLOCKIFY_TEST_WORKSPACE_ID;
const invalidWorkspaceId = "invalid-workspace-id-12345";

test("getClients-001: returns array of clients with valid API key and workspace", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getClients(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Verify client structure (if any clients exist)
    if (result.data.length > 0) {
      const client = result.data[0];
      expect(client).toHaveProperty("id");
      expect(client).toHaveProperty("name");
      expect(client).toHaveProperty("workspaceId");
      expect(client).toHaveProperty("archived");

      // Verify data types
      expect(typeof client.id).toBe("string");
      expect(typeof client.name).toBe("string");
      expect(typeof client.workspaceId).toBe("string");
      expect(typeof client.archived).toBe("boolean");
    }
  }
});

test("getClients-002: returns error for invalid workspace ID", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");

  const result = await getClients(validApiKey!, invalidWorkspaceId);

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

test("getClients-003: client data contains required fields", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getClients(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Check all clients have required fields
    result.data.forEach((client) => {
      expect(client).toHaveProperty("id");
      expect(client).toHaveProperty("name");
      expect(client).toHaveProperty("workspaceId");
      expect(client).toHaveProperty("archived");

      // Verify data types
      expect(typeof client.id).toBe("string");
      expect(typeof client.name).toBe("string");
      expect(typeof client.workspaceId).toBe("string");
      expect(typeof client.archived).toBe("boolean");

      // Verify optional fields
      if (client.address) {
        expect(typeof client.address).toBe("string");
      }
      if (client.note) {
        expect(typeof client.note).toBe("string");
      }
    });
  }
});

test("getClients-004: handles empty client list correctly", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getClients(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Empty array is valid response
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  }
});

test("getClients-005: workspace ID matches in all returned clients", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await getClients(validApiKey!, validWorkspaceId!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // All clients should have the same workspace ID
    result.data.forEach((client) => {
      expect(client.workspaceId).toBe(validWorkspaceId);
    });
  }
});
