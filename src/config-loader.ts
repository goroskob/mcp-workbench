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

    // Reject dynamic mode (removed in v0.10.0)
    if ((config as any).toolMode === 'dynamic') {
      throw new Error(
        'Dynamic mode is no longer supported as of v0.10.0.\n' +
        'Please remove the "toolMode" field from your configuration.\n' +
        'The workbench now operates exclusively in proxy mode.\n' +
        'See migration guide: https://github.com/hlibkoval/mcp-workbench/blob/main/specs/006-remove-dynamic-mode/quickstart.md'
      );
    }

    // Warn about deprecated toolMode field
    if ((config as any).toolMode === 'proxy') {
      console.warn('Note: toolMode field is deprecated and will be ignored. Proxy mode is now the default.');
    }

    // Warn about any other unexpected toolMode value
    if ((config as any).toolMode !== undefined && (config as any).toolMode !== 'proxy') {
      console.warn(`Unknown toolMode value "${(config as any).toolMode}" will be ignored.`);
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
