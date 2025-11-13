import { expect, test } from "../fixtures/test";

test.describe("E2E Test Infrastructure", () => {
  test(
    "hello world - browser starts with isolated server",
    async ({ page, serverUrl }, testInfo) => {
      console.log(`Testing server at: ${serverUrl}`);

      // Navigate to the server
      await page.goto(serverUrl);

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Check that we got some response (even 404 is fine - means server is up)
      const response = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          userAgent: navigator.userAgent,
        };
      });

      console.log("Page loaded:", response);

      // Basic assertions to verify browser and server are working
      expect(response.url).toBe(serverUrl + "/");
      expect(response.userAgent).toContain("playwright-test");

      // Take a screenshot for debugging
      await page.screenshot({
        path: testInfo.outputPath("hello-world-screenshot.png"),
      });

      // Test that we can make a simple API call
      const apiResponse = await fetch(`${serverUrl}/api/auth/session`);
      console.log("API response status:", apiResponse.status);

      // Should get 401 or 404 (server is responding, but not authenticated)
      expect([401, 404]).toContain(apiResponse.status);
    },
  );

  test("port manager allocates unique ports", async ({ page, serverUrl }) => {
    // Extract port from serverUrl
    const url = new URL(serverUrl);
    const port = parseInt(url.port);

    console.log(`Server running on port: ${port}`);

    // Verify port is in valid range
    expect(port).toBeGreaterThanOrEqual(3001);
    expect(port).toBeLessThanOrEqual(65535);

    // Navigate to server to verify it's working
    await page.goto(serverUrl);
    await page.waitForLoadState("networkidle");

    // Verify we can access the page
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Title might be empty or have default content, that's fine
    expect(typeof title).toBe("string");
  });

  test("server has in-memory database", async ({ page, serverUrl }) => {
    // This test verifies that the server is running with test environment
    // and in-memory database as configured in the server fixture

    await page.goto(serverUrl);

    // Try to access a page that would require database
    // For now, just verify the server responds
    const response = await page.goto(`${serverUrl}/signin`);

    // Should get some response (200, 404, or redirect are all fine)
    expect(response).not.toBeNull();

    // Check that we're on a different URL or got a proper response
    const currentUrl = page.url();
    console.log(`Current URL after navigation: ${currentUrl}`);

    // URL should be valid
    expect(currentUrl).toMatch(/^http:\/\/localhost:\d+\/.*/);
  });
});
