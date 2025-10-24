#!/usr/bin/env node
/**
 * MCP Workbench - Aggregate MCP tools with dynamic discovery through toolboxes
 *
 * This MCP server connects to other MCP servers and organizes their tools
 * into "toolboxes" for dynamic discovery and invocation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config-loader.js";
import { ClientManager } from "./client-manager.js";
import { WorkbenchConfig, ToolboxSummary, OpenToolboxResult } from "./types.js";

// Zod schemas for tool inputs
const ListToolboxesInputSchema = z.object({}).strict();

const OpenToolboxInputSchema = z
  .object({
    toolbox_name: z
      .string()
      .min(1)
      .describe("Name of the toolbox to open (e.g., 'incident-analysis', 'gitlab-workflow')"),
  })
  .strict();

const CloseToolboxInputSchema = z
  .object({
    toolbox_name: z
      .string()
      .min(1)
      .describe("Name of the toolbox to close"),
  })
  .strict();

// Type inference
type ListToolboxesInput = z.infer<typeof ListToolboxesInputSchema>;
type OpenToolboxInput = z.infer<typeof OpenToolboxInputSchema>;
type CloseToolboxInput = z.infer<typeof CloseToolboxInputSchema>;

/**
 * Main server class
 */
class WorkbenchServer {
  private config: WorkbenchConfig;
  private clientManager: ClientManager;
  private server: McpServer;

  constructor(config: WorkbenchConfig) {
    this.config = config;
    this.clientManager = new ClientManager();
    this.server = new McpServer({
      name: "mcp-workbench",
      version: "0.2.0",
    });

    this.registerTools();
  }

  /**
   * Register all workbench tools
   */
  private registerTools(): void {
    // Tool 1: List available toolboxes
    this.server.registerTool(
      "workbench_list_toolboxes",
      {
        title: "List Available Toolboxes",
        description: `List all available toolboxes configured in the workbench.

A toolbox is a named collection of MCP tools organized by purpose or domain.
Each toolbox can contain tools from one or more MCP servers.

This tool returns:
- List of toolbox names with descriptions
- Tool count for each toolbox
- Whether each toolbox is currently open

Use this tool to discover what toolboxes are available before opening one.

Returns:
  JSON format:
  {
    "toolboxes": [
      {
        "name": string,           // Toolbox identifier
        "description": string,    // What this toolbox is for
        "tool_count": number,     // Number of tools available
        "is_open": boolean        // Whether currently connected
      }
    ]
  }

Examples:
  - Use when: You want to see what toolboxes are available
  - Use when: You need to find the right toolbox for a task
  - Use when: You want to check if a toolbox is already open`,
        inputSchema: ListToolboxesInputSchema.shape,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (args: { [x: string]: any }) => {
        const params = args as ListToolboxesInput;
        try {
          const toolboxes: ToolboxSummary[] = [];

          for (const [name, config] of Object.entries(this.config.toolboxes)) {
            // Calculate tool count estimate (without connecting)
            const serverConfigs = Object.values(config.mcpServers);
            const toolCount = serverConfigs.reduce((sum, server) => {
              if (server.toolFilters && !server.toolFilters.includes("*")) {
                return sum + server.toolFilters.length;
              }
              return sum + 10; // Estimate for "*" filter
            }, 0);

            toolboxes.push({
              name,
              description: config.description,
              tool_count: toolCount,
              is_open: this.clientManager.isToolboxOpen(name),
            });
          }

          const result = {
            toolboxes,
            total_count: toolboxes.length,
            open_count: toolboxes.filter((t) => t.is_open).length,
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error listing toolboxes: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool 2: Open a toolbox
    this.server.registerTool(
      "workbench_open_toolbox",
      {
        title: "Open a Toolbox",
        description: `Open a toolbox and register its tools on the workbench server.

This tool connects to all MCP servers configured in the specified toolbox,
retrieves their tools, and dynamically registers them on the workbench server.
Once opened, tools can be called directly by their prefixed names.

Opening a toolbox:
1. Connects to each MCP server in the toolbox
2. Retrieves the list of available tools from each server
3. Applies any tool filters specified in the configuration
4. Dynamically registers tools with prefix: {server}_{tool_name}
5. Sends tool list changed notification to clients

Tools are prefixed with their server name to avoid conflicts. For example,
a tool named "read_file" from server "filesystem" becomes "filesystem_read_file".

If the toolbox is already open, returns the cached information.

Args:
  - toolbox_name: Name of the toolbox to open (from workbench_list_toolboxes)

Returns:
  JSON format:
  {
    "toolbox": string,              // Toolbox name
    "description": string,          // Purpose description
    "servers_connected": number,    // Number of MCP servers connected
    "tools_registered": number,     // Number of tools registered
    "tools": [                      // List of available tools
      {
        "name": string,             // Prefixed tool name (e.g., "filesystem_read_file")
        "original_name": string,    // Original name from server (e.g., "read_file")
        "server": string,           // Source server name (e.g., "filesystem")
        "description": string,      // Tool description (optional)
        "title": string             // Tool title (optional)
      }
    ],
    "message": string               // Success message
  }

Examples:
  - Use when: You need to access tools from a specific domain
  - Use when: Starting work on a new task requiring specific toolsets
  - After: Using workbench_list_toolboxes to find the right toolbox

Error Handling:
  - Returns error if toolbox name doesn't exist
  - Returns error if MCP servers fail to connect
  - Provides connection details in error messages`,
        inputSchema: OpenToolboxInputSchema.shape,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (args: { [x: string]: any }) => {
        const params = args as OpenToolboxInput;
        try {
          const toolboxConfig = this.config.toolboxes[params.toolbox_name];
          if (!toolboxConfig) {
            const available = Object.keys(this.config.toolboxes).join(", ");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: Toolbox '${params.toolbox_name}' not found. Available toolboxes: ${available}`,
                },
              ],
              isError: true,
            };
          }

          // Open the toolbox (connects to servers and registers tools)
          const { connections, toolsRegistered, tools } = await this.clientManager.openToolbox(
            params.toolbox_name,
            toolboxConfig,
            this.server
          );

          // Notify clients that tool list has changed
          this.server.sendToolListChanged();

          const result: OpenToolboxResult = {
            toolbox: params.toolbox_name,
            description: toolboxConfig.description,
            servers_connected: connections.size,
            tools_registered: toolsRegistered,
            tools: tools,
            message: `Successfully opened toolbox '${params.toolbox_name}' and registered ${toolsRegistered} tools. Tools are now available with server-prefixed names (e.g., {server}_{tool}).`,
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error opening toolbox '${params.toolbox_name}': ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool 3: Close a toolbox
    this.server.registerTool(
      "workbench_close_toolbox",
      {
        title: "Close a Toolbox",
        description: `Close a toolbox and disconnect from its MCP servers.

This tool cleanly disconnects from all MCP servers in the specified toolbox,
freeing up resources and connections. Use this when you're done working
with a toolbox.

Closing a toolbox:
1. Disconnects from each MCP server gracefully
2. Cleans up client connections and resources
3. Removes the toolbox from the open state

After closing, you must reopen the toolbox to use its tools again.

Args:
  - toolbox_name: Name of the toolbox to close

Returns:
  Success message with cleanup details

Examples:
  - Use when: Finished working with a set of tools
  - Use when: Need to free up connections/resources
  - Use when: Switching between different toolboxes

Error Handling:
  - Returns error if toolbox is not currently open
  - Returns error if disconnection fails
  - Attempts to disconnect all servers even if some fail`,
        inputSchema: CloseToolboxInputSchema.shape,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (args: { [x: string]: any }) => {
        const params = args as CloseToolboxInput;
        try {
          await this.clientManager.closeToolbox(params.toolbox_name);

          // Notify clients that tool list has changed
          this.server.sendToolListChanged();

          return {
            content: [
              {
                type: "text" as const,
                text: `Successfully closed toolbox '${params.toolbox_name}', unregistered tools, and disconnected from all servers.`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error closing toolbox '${params.toolbox_name}': ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Cleanup on exit
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await this.cleanup();
      process.exit(0);
    });

    console.error("MCP Workbench server running via stdio");
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.error("Shutting down MCP Workbench...");
    await this.clientManager.closeAll();
  }
}

/**
 * Main entry point
 */
async function main() {
  // Check for config file path
  const configPath = process.env.WORKBENCH_CONFIG || "./workbench-config.json";

  try {
    // Load configuration
    const config = await loadConfig(configPath);

    console.error(`Loaded configuration from: ${configPath}`);
    console.error(
      `Available toolboxes: ${Object.keys(config.toolboxes).join(", ")}`
    );

    // Create and start server
    const server = new WorkbenchServer(config);
    await server.start();
  } catch (error) {
    console.error(
      `Failed to start MCP Workbench: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(
      `\nPlease ensure WORKBENCH_CONFIG environment variable points to a valid configuration file.`
    );
    console.error(`Current path: ${configPath}`);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
