import { createServer } from "net";

/**
 * Port manager for allocating random free ports during E2E testing
 * Ensures each test gets a unique port that's actually available
 */
export class PortManager {
  private usedPorts = new Set<number>();

  /**
   * Get a random free port that's not currently in use
   * @returns Promise<number> A free port number
   */
  async getRandomFreePort(): Promise<number> {
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      // Generate random port between 3001 and 65535
      const port = Math.floor(Math.random() * (65535 - 3001) + 3001);

      // Skip if we've already used this port in this session
      if (this.usedPorts.has(port)) {
        continue;
      }

      // Check if port is actually free
      if (await this.isPortFree(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }

    throw new Error(`Could not find free port after ${maxAttempts} attempts`);
  }

  /**
   * Check if a port is free by attempting to bind to it
   * @param port Port number to check
   * @returns Promise<boolean> True if port is free
   */
  private async isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Release a port back to the available pool
   * @param port Port number to release
   */
  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  /**
   * Get count of currently used ports
   * @returns number Number of used ports
   */
  getUsedPortCount(): number {
    return this.usedPorts.size;
  }

  /**
   * Clear all used ports (useful for cleanup)
   */
  clearAllPorts(): void {
    this.usedPorts.clear();
  }
}

// Singleton instance for use across tests
export const portManager = new PortManager();