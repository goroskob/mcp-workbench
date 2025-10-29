/**
 * Custom Vitest assertions for E2E tests
 * Provides domain-specific matchers for MCP workbench testing
 */

import { expect } from 'vitest';
import type { ToolInfo, ToolIdentifier } from './types.js';

/**
 * Assert that a tool exists in the toolbox with correct metadata
 *
 * @param tools - List of tools from open_toolbox
 * @param identifier - Expected tool identifier
 */
export function assertToolExists(
  tools: ToolInfo[],
  identifier: ToolIdentifier
): void {
  const tool = tools.find(
    (t) =>
      t.toolbox === identifier.toolbox &&
      t.server === identifier.server &&
      t.name === identifier.name
  );

  expect(tool, `Tool not found: ${JSON.stringify(identifier)}`).toBeDefined();

  // Validate tool metadata
  expect(tool!.toolbox).toBe(identifier.toolbox);
  expect(tool!.server).toBe(identifier.server);
  expect(tool!.name).toBe(identifier.name);
}

/**
 * Assert that a tool has the expected input schema
 *
 * @param tool - Tool from open_toolbox
 * @param expectedSchema - Expected JSON schema
 */
export function assertToolSchema(
  tool: ToolInfo,
  expectedSchema: object
): void {
  expect(tool.inputSchema).toBeDefined();
  expect(tool.inputSchema).toMatchObject(expectedSchema);
}

/**
 * Assert that an error result contains expected context
 *
 * @param error - Error object from failed operation
 * @param context - Expected context fields (toolbox, server, tool names)
 */
export function assertErrorContext(
  error: Error,
  context: Partial<ToolIdentifier>
): void {
  const errorMessage = error.message;

  if (context.toolbox) {
    expect(
      errorMessage,
      `Error message missing toolbox context: "${context.toolbox}"`
    ).toContain(context.toolbox);
  }

  if (context.server) {
    expect(
      errorMessage,
      `Error message missing server context: "${context.server}"`
    ).toContain(context.server);
  }

  if (context.name) {
    expect(
      errorMessage,
      `Error message missing tool name context: "${context.name}"`
    ).toContain(context.name);
  }
}

/**
 * Assert that a toolbox listing includes expected toolboxes
 *
 * @param instructions - Instructions text from MCP initialization
 * @param expectedToolboxes - List of expected toolbox names
 */
export function assertToolboxListing(
  instructions: string,
  expectedToolboxes: string[]
): void {
  expect(instructions).toBeDefined();
  expect(instructions.length).toBeGreaterThan(0);

  for (const toolboxName of expectedToolboxes) {
    expect(
      instructions,
      `Toolbox listing missing: "${toolboxName}"`
    ).toContain(toolboxName);
  }
}

/**
 * Assert that tool result matches expected format
 *
 * @param result - Tool execution result
 * @param expectedKeys - Expected keys in result object
 */
export function assertToolResult(result: any, expectedKeys: string[]): void {
  expect(result).toBeDefined();
  expect(typeof result).toBe('object');

  for (const key of expectedKeys) {
    expect(
      result,
      `Tool result missing expected key: "${key}"`
    ).toHaveProperty(key);
  }
}
