/**
 * Server manager for starting/stopping workbench servers in E2E tests
 * Handles process lifecycle and cleanup
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TestServerInstance, ServerStartConfig, WorkbenchConfig } from './types.js';

/**
 * Start a workbench server instance for testing
 *
 * @param config - Server start configuration
 * @returns Promise<TestServerInstance> - Running server instance
 * @throws Error if server fails to start
 */
export async function startServer(
  config: ServerStartConfig
): Promise<TestServerInstance> {
  const { configPath, port, env = {}, timeout = 10000 } = config;

  // Prepare environment variables
  const serverEnv = {
    ...process.env,
    ...env,
    WORKBENCH_CONFIG: configPath,
    PORT: port.toString(),
  };

  // Start the server process
  const serverProcess = spawn('node', ['dist/index.js'], {
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });

  const stdout: string[] = [];
  const stderr: string[] = [];

  // Capture stdout
  serverProcess.stdout?.on('data', (data) => {
    stdout.push(data.toString());
  });

  // Capture stderr
  serverProcess.stderr?.on('data', (data) => {
    stderr.push(data.toString());
  });

  // Wait for server to be ready (or fail)
  const instance: TestServerInstance = {
    pid: serverProcess.pid!,
    port,
    configPath,
    startTime: new Date(),
    stdout,
    stderr,
    process: serverProcess,
  };

  // Give server time to start
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Server failed to start within ${timeout}ms\nStderr: ${stderr.join('\n')}`
        )
      );
    }, timeout);

    // Check if process exits early (indicates startup failure)
    serverProcess.once('exit', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(
          new Error(
            `Server exited with code ${code}\nStderr: ${stderr.join('\n')}`
          )
        );
      }
    });

    // Assume server is ready after short delay
    // (MCP servers typically start quickly and listen immediately)
    setTimeout(() => {
      clearTimeout(timeoutId);
      resolve();
    }, 2000);
  });

  return instance;
}

/**
 * Stop a running workbench server instance
 * CRITICAL: Cleanup failures abort entire test run per clarifications
 *
 * @param instance - Server instance to stop
 * @throws Error if cleanup fails (causes test run abort)
 */
export async function stopServer(instance: TestServerInstance): Promise<void> {
  const { process: serverProcess, pid } = instance;

  if (!serverProcess) {
    throw new Error(`Cannot stop server: process not available (PID: ${pid})`);
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Force kill if graceful shutdown fails
      try {
        serverProcess.kill('SIGKILL');
      } catch (err) {
        reject(
          new Error(
            `CRITICAL: Failed to force-kill server (PID ${pid}): ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        );
        return;
      }
      reject(
        new Error(
          `Server cleanup timeout: process ${pid} did not exit gracefully within 5s`
        )
      );
    }, 5000);

    serverProcess.once('exit', (code) => {
      clearTimeout(timeout);

      // Any non-zero exit during cleanup is acceptable
      // as long as process exits
      resolve();
    });

    // Send SIGTERM for graceful shutdown
    try {
      serverProcess.kill('SIGTERM');
    } catch (err) {
      clearTimeout(timeout);
      reject(
        new Error(
          `CRITICAL: Failed to send SIGTERM to server (PID ${pid}): ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      );
    }
  });
}

/**
 * Create a temporary configuration file for testing
 *
 * @param config - Workbench configuration object
 * @param name - Optional name for the config file
 * @returns string - Path to created config file
 */
export function createTempConfig(
  config: WorkbenchConfig,
  name?: string
): string {
  const filename = name
    ? `workbench-test-${name}.json`
    : `workbench-test-${Date.now()}.json`;
  const filepath = join(tmpdir(), filename);

  writeFileSync(filepath, JSON.stringify(config, null, 2), 'utf-8');

  return filepath;
}

/**
 * Delete a temporary configuration file
 *
 * @param filepath - Path to config file to delete
 */
export function deleteTempConfig(filepath: string): void {
  try {
    unlinkSync(filepath);
  } catch (err) {
    // Log but don't throw - temp file cleanup is best-effort
    console.warn(`Warning: Failed to delete temp config ${filepath}:`, err);
  }
}
