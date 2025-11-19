import { expect, test } from "bun:test";
import { validateApiKey } from "../../../src/lib/clockify/client";
import { expectString } from "tests/shared/helpers/expect-ts-helpers";

const validApiKey = process.env.CLOCKIFY_TEST_API_KEY;
const validWorkspaceId = process.env.CLOCKIFY_TEST_WORKSPACE_ID;
const invalidApiKey = "invalid-api-key-12345";

test("validateApiKey-001: validates API key and returns user data", async () => {
  expectString(validApiKey, "CLOCKIFY_TEST_API_KEY not set");
  expectString(validWorkspaceId, "CLOCKIFY_TEST_WORKSPACE_ID not set");

  const result = await validateApiKey(validApiKey!);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBeDefined();

    // Verify user data structure
    const user = result.data;
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("memberships");
    expect(user).toHaveProperty("activeWorkspace");
    expect(user).toHaveProperty("defaultWorkspace");
    expect(user).toHaveProperty("settings");
    expect(user).toHaveProperty("status");

    // Verify settings structure
    expect(user.settings).toHaveProperty("weekStart");
    expect(user.settings).toHaveProperty("timeZone");
    expect(user.settings.weekStart).toMatch(/^(MONDAY|SUNDAY)$/);
    expect(typeof user.settings.timeZone).toBe("string");
    expect(user.settings.timeZone.length).toBeGreaterThan(0);

    // Verify data types
    expect(typeof user.id).toBe("string");
    expect(typeof user.email).toBe("string");
    expect(typeof user.name).toBe("string");
    expect(Array.isArray(user.memberships)).toBe(true);
    expect(typeof user.activeWorkspace).toBe("string");
    expect(typeof user.defaultWorkspace).toBe("string");
    expect(typeof user.status).toBe("string");
  }
});

test("validateApiKey-002: returns error for invalid API key", async () => {
  const result = await validateApiKey(invalidApiKey);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBeDefined();

    const error = result.error;
    expect(error.message).toBeDefined();
    expect(typeof error.message).toBe("string");
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.code).toBe(401); // Unauthorized
  }
});
