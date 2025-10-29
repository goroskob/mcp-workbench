/**
 * Expected tool schemas from downstream MCP servers
 * Used for validation in E2E tests
 */

import type { ExpectedToolSchema } from '../../helpers/types.js';

/**
 * Expected tools from @modelcontextprotocol/server-memory
 * Note: Schemas based on server version 2025.9.25
 */
export const memoryServerTools: ExpectedToolSchema[] = [
  {
    toolbox: 'test',
    server: 'memory',
    name: 'store_value',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Key to store the value under',
        },
        value: {
          type: 'string',
          description: 'Value to store',
        },
      },
      required: ['key', 'value'],
    },
    annotations: null,
  },
  {
    toolbox: 'test',
    server: 'memory',
    name: 'get_value',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Key to retrieve',
        },
      },
      required: ['key'],
    },
    annotations: null,
  },
];

/**
 * Expected tools from @modelcontextprotocol/server-filesystem
 * Note: Schemas based on server version 2025.8.21
 */
export const filesystemServerTools: ExpectedToolSchema[] = [
  {
    toolbox: 'test',
    server: 'filesystem',
    name: 'read_file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to file to read',
        },
      },
      required: ['path'],
    },
    annotations: null,
  },
  {
    toolbox: 'test',
    server: 'filesystem',
    name: 'write_file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to file to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to file',
        },
      },
      required: ['path', 'content'],
    },
    annotations: null,
  },
  {
    toolbox: 'test',
    server: 'filesystem',
    name: 'list_directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to directory to list',
        },
      },
      required: ['path'],
    },
    annotations: null,
  },
];

/**
 * Helper to find expected schema for a tool
 */
export function findExpectedSchema(
  toolbox: string,
  server: string,
  name: string
): ExpectedToolSchema | undefined {
  const allTools = [...memoryServerTools, ...filesystemServerTools];
  return allTools.find(
    (t) => t.toolbox === toolbox && t.server === server && t.name === name
  );
}
