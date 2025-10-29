/**
 * Helpers for setting up and managing downstream MCP servers in tests
 * Provides utilities for spawning test server instances
 */

import type { WorkbenchConfig } from '../../helpers/types.js';

/**
 * Get a basic memory server configuration
 */
export function getMemoryServerConfig(): WorkbenchConfig {
  return {
    toolboxes: {
      test: {
        description: 'Test toolbox with memory server',
        mcpServers: {
          memory: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
          },
        },
      },
    },
  };
}

/**
 * Get a basic filesystem server configuration
 * @param rootPath - Root path for filesystem access (default: /tmp)
 */
export function getFilesystemServerConfig(rootPath = '/tmp'): WorkbenchConfig {
  return {
    toolboxes: {
      test: {
        description: 'Test toolbox with filesystem server',
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', rootPath],
          },
        },
      },
    },
  };
}

/**
 * Get a multi-server configuration with both memory and filesystem
 */
export function getMultiServerConfig(): WorkbenchConfig {
  return {
    toolboxes: {
      test: {
        description: 'Test toolbox with multiple servers',
        mcpServers: {
          memory: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
          },
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          },
        },
      },
    },
  };
}

/**
 * Get a configuration with tool filters
 */
export function getFilteredToolsConfig(): WorkbenchConfig {
  return {
    toolboxes: {
      test: {
        description: 'Test toolbox with filtered tools',
        mcpServers: {
          memory: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            toolFilters: ['store_value', 'get_value'], // Only include these tools
          },
        },
      },
    },
  };
}

/**
 * Get a configuration with environment variables
 */
export function getEnvVarConfig(envVars: Record<string, string>): WorkbenchConfig {
  return {
    toolboxes: {
      test: {
        description: 'Test toolbox with environment variables',
        mcpServers: {
          memory: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            env: envVars,
          },
        },
      },
    },
  };
}
