import { test as base } from "@playwright/test";
import { spawn } from "child_process";
import { portManager } from "./portManager";

/**
 * Server fixture type definition
 */
export type ServerFixtures = {
  serverUrl: string;
};

/**
 * Extended Playwright test with server fixture
 * Each test gets its own isolated server instance with in-memory database
 */
export const test = base.extend<ServerFixtures>({
  serverUrl: async ({}, use, testInfo) => {
    const port = await portManager.getRandomFreePort();
    const serverUrl = `http://localhost:${port}`;
    
    console.log(`[server] Starting on ${serverUrl} for "${testInfo.title}"`);

    // Start Vite dev server with unique port and in-memory DB
    const server = spawn("bunx", ["vite", "dev", "--port", String(port)], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: ":memory:",
        ENVIRONMENT: "test",
        PORT: String(port),
        // Auth secrets for test (unique per test to avoid conflicts)
        BETTER_AUTH_SECRET: "test-secret-" + port + "-" + Date.now(),
        BETTER_AUTH_URL: serverUrl,
        VITE_SERVER_URL: serverUrl,
        // Allow user signup for tests
        ALLOW_USER_SIGNUP: "true",
        // Admin credentials for tests
        ADMIN_EMAIL: "admin@test.com",
        ADMIN_LABEL: "Test Admin",
        ADMIN_PASSWORD: "test123",
      },
      stdio: "pipe",
    });

    // Capture server output for debugging
    let serverOutput = "";
    server.stdout?.on("data", (data) => {
      serverOutput += data.toString();
    });
    server.stderr?.on("data", (data) => {
      serverOutput += data.toString();
    });

    try {
      // Wait for server to be ready
      await waitForServerReady(serverUrl, { timeout: 30000 });
      console.log(`[server] Ready on ${serverUrl}`);

      // Provide server URL to test
      await use(serverUrl);

    } catch (error) {
      console.error(`[server] Failed to start for "${testInfo.title}":`, error);
      console.error(`[server] Output:`, serverOutput);
      throw error;
    } finally {
      // Cleanup: kill server
      console.log(`[server] Stopping ${serverUrl}`);
      server.kill("SIGTERM");

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        server.on("exit", () => {
          resolve();
        });
        
        // Force kill if not exited after 5 seconds
        setTimeout(() => {
          server.kill("SIGKILL");
          resolve();
        }, 5000);
      });

      // Release the port back to the pool
      portManager.releasePort(port);
      console.log(`[server] Stopped, port ${port} released`);
    }
  },
});

/**
 * Wait for server to be ready by polling the health endpoint
 */
async function waitForServerReady(
  url: string,
  { timeout }: { timeout: number },
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "playwright-test-health-check",
        },
      });
      
      // Server is responding (404 is fine, means server is up)
      if (response.ok || response.status === 404) {
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }

    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server not ready after ${timeout}ms`);
}

// Export expect from Playwright for convenience
export { expect } from "@playwright/test";