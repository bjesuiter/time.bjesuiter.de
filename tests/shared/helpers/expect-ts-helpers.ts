import { expect } from "bun:test";

export function expectString(
  value: string | undefined,
  customMessage?: string,
): asserts value is string {
  expect(value, customMessage).toBeDefined();
  expect(typeof value, customMessage).toBe("string");
}
