/**
 * Configuration loader for MCP Workbench
 */

import { readFile } from "fs/promises";
import { WorkbenchConfig } from "./types.js";
import { expandEnvVars, EnvExpansionError } from "./env-expander.js";

/**
 * Load and validate workbench configuration from a JSON file
 */
export async function loadConfig(configPath: string): Promise<WorkbenchConfig> {
  try {
    const content = await readFile(configPath, "utf-8");
    const rawConfig = JSON.parse(content);

    // Expand environment variables before validation
    let config: WorkbenchConfig;
    try {
      config = expandEnvVars(rawConfig, 'config') as WorkbenchConfig;
    } catch (error) {
      if (error instanceof EnvExpansionError) {
        throw new Error(`Failed to load configuration from ${configPath}:\n${error.message}`);
      }
      throw error;
    }

    // Basic validation
    if (!config.toolboxes || typeof config.toolboxes !== "object") {
      throw new Error("Configuration must have a 'toolboxes' object");
    }

    // Validate toolMode if provided
    if (config.toolMode !== undefined && config.toolMode !== 'dynamic' && config.toolMode !== 'proxy') {
      throw new Error("Configuration field 'toolMode' must be either 'dynamic' or 'proxy'");
    }

    // Validate each toolbox
    for (const [name, toolbox] of Object.entries(config.toolboxes)) {
      if (!toolbox.description) {
        throw new Error(`Toolbox '${name}' must have a description`);
      }

      if (!toolbox.mcpServers || typeof toolbox.mcpServers !== "object") {
        throw new Error(`Toolbox '${name}' must have an 'mcpServers' object`);
      }

      const serverNames = Object.keys(toolbox.mcpServers);
      if (serverNames.length === 0) {
        throw new Error(`Toolbox '${name}' must have at least one MCP server`);
      }

      // Validate each server config
      for (const [serverName, serverConfig] of Object.entries(toolbox.mcpServers)) {
        if (!serverConfig.command) {
          throw new Error(
            `Server '${serverName}' in toolbox '${name}' must have a 'command' field`
          );
        }

        // Validate args is array if provided
        if (serverConfig.args !== undefined && !Array.isArray(serverConfig.args)) {
          throw new Error(
            `Server '${serverName}' in toolbox '${name}': 'args' must be an array`
          );
        }

        // Validate env is object if provided
        if (serverConfig.env !== undefined && typeof serverConfig.env !== "object") {
          throw new Error(
            `Server '${serverName}' in toolbox '${name}': 'env' must be an object`
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
        mcpServers: {
          "example-server": {
            command: "node",
            args: ["example-server.js"],
            env: {},
            toolFilters: ["*"],
            transport: "stdio",
          },
        },
      },
    },
  };
}
