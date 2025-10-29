/**
 * Type definitions for E2E test entities
 * Based on data-model.md from specs/010-e2e-testing-suite/
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Workbench configuration types (matching src/types.ts)
export interface WorkbenchConfig {
  toolboxes: Record<string, ToolboxConfig>;
}

export interface ToolboxConfig {
  description: string;
  mcpServers: Record<string, McpServerConfig>;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  toolFilters?: string[];
  transport?: 'stdio';
}

// Test-specific entity types

/**
 * Configuration for a single E2E test run
 */
export interface E2ETestConfig {
  testName: string;
  workbenchConfig: WorkbenchConfig;
  port: number;
  timeout: number;
  isolation: 'port' | 'container';
}

/**
 * Test fixture representing a workbench configuration scenario
 */
export interface WorkbenchConfigFixture {
  name: string;
  config: WorkbenchConfig;
  expectedBehavior: 'success' | 'error';
  errorPattern: string | null;
  description: string;
}

/**
 * Runtime state for a running workbench server instance in a test
 */
export interface TestServerInstance {
  pid: number;
  port: number;
  configPath: string;
  startTime: Date;
  stdout: string[];
  stderr: string[];
  process?: any; // ChildProcess from node:child_process
}

/**
 * Structured tool identifier used in test assertions
 */
export interface ToolIdentifier {
  toolbox: string;
  server: string;
  name: string;
}

/**
 * Tool metadata returned from open_toolbox (extends MCP SDK Tool type)
 */
export interface ToolInfo extends Tool {
  server: string;
  toolbox: string;
}

/**
 * Wrapper around MCP SDK client for test assertions
 */
export interface MCPTestClient {
  client: Client;
  transport: StdioClientTransport;
  connected: boolean;
  openedToolboxes: string[];
}

/**
 * Test fixture defining expected tool schema from downstream server
 */
export interface ExpectedToolSchema {
  toolbox: string;
  server: string;
  name: string;
  inputSchema: object;
  annotations: object | null;
}

/**
 * Outcome of a single E2E test scenario
 * Pass/fail status only per clarifications (no performance metrics)
 */
export interface TestResult {
  testName: string;
  status: 'pass' | 'fail';
  duration: number; // For internal use only, not reported
  error: Error | null;
  assertionCount: number;
}

/**
 * Configuration for starting a test server
 */
export interface ServerStartConfig {
  configPath: string;
  port: number;
  env?: Record<string, string>;
  timeout?: number;
}
