/**
 * Test isolation helpers for parallel execution
 * Provides dynamic port allocation to avoid conflicts
 */

import { createServer } from 'node:net';

/**
 * Allocate an available port dynamically
 * Strategy: Let OS assign an available port by binding to port 0
 *
 * @returns Promise<number> - Available port number
 * @throws Error if port allocation fails after retries
 */
export async function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(0, () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to allocate port: address not available'));
        return;
      }

      const port = address.port;

      // Close the server immediately - port should remain available briefly
      server.close((err) => {
        if (err) {
          reject(new Error(`Failed to close temporary server: ${err.message}`));
          return;
        }
        resolve(port);
      });
    });

    server.on('error', (err) => {
      reject(new Error(`Port allocation failed: ${err.message}`));
    });
  });
}

/**
 * Check if a port is available for binding
 *
 * @param port - Port number to check
 * @returns Promise<boolean> - true if port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}
