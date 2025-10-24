/**
 * Configuration loader for MCP Workbench
 */

import { readFile } from "fs/promises";
import { WorkbenchConfig } from "./types.js";

/**
 * Load and validate workbench configuration from a JSON file
 */
export async function loadConfig(configPath: string): Promise<WorkbenchConfig> {
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content) as WorkbenchConfig;

    // Basic validation
    if (!config.toolboxes || typeof config.toolboxes !== "object") {
      throw new Error("Configuration must have a 'toolboxes' object");
    }

    // Validate each toolbox
    for (const [name, toolbox] of Object.entries(config.toolboxes)) {
      if (!toolbox.description) {
        throw new Error(`Toolbox '${name}' must have a description`);
      }

      if (!Array.isArray(toolbox.mcp_servers) || toolbox.mcp_servers.length === 0) {
        throw new Error(`Toolbox '${name}' must have at least one MCP server`);
      }

      // Validate each server config
      for (const server of toolbox.mcp_servers) {
        if (!server.name || !server.command) {
          throw new Error(
            `Server in toolbox '${name}' must have 'name' and 'command' fields`
          );
        }
      }
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a default example configuration
 */
export function createExampleConfig(): WorkbenchConfig {
  return {
    toolboxes: {
      example: {
        description: "Example toolbox with placeholder servers",
        mcp_servers: [
          {
            name: "example-server",
            command: "node",
            args: ["example-server.js"],
            env: {},
            tool_filters: ["*"],
            transport: "stdio",
          },
        ],
      },
    },
  };
}
