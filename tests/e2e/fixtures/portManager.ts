import { createServer } from "net";

/**
 * Get a random free port for E2E testing
 * Each test gets its own port manager instance via Playwright fixtures
 * @returns Promise<number> A free port number
 */
export async function getRandomFreePort(): Promise<number> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    // Generate random port between 3001 and 65535
    const port = Math.floor(Math.random() * (65535 - 3001) + 3001);

    // Check if port is actually free
    if (await isPortFree(port)) {
      console.log(`[port-manager] Allocated port ${port}`);
      return port;
    }
  }

  console.error(
    `[port-manager] Could not find free port after ${maxAttempts} attempts`,
  );
  throw new Error(`Could not find free port after ${maxAttempts} attempts`);
}

/**
 * Check if a port is free by attempting to bind to it
 * @param port Port number to check
 * @returns Promise<boolean> True if port is free
 */
async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, () => {
      server.once("close", () => {
        resolve(true);
      });
      server.close();
    });

    server.on("error", () => {
      resolve(false);
    });
  });
}
