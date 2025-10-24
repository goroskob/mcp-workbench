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

const UseToolInputSchema = z
  .object({
    toolbox_name: z
      .string()
      .min(1)
      .describe("Name of the toolbox containing the tool"),
    tool_name: z
      .string()
      .min(1)
      .describe("Name of the tool to execute"),
    arguments: z
      .record(z.unknown())
      .describe("Arguments to pass to the tool"),
  })
  .strict();

// Type inference
type ListToolboxesInput = z.infer<typeof ListToolboxesInputSchema>;
type OpenToolboxInput = z.infer<typeof OpenToolboxInputSchema>;
type CloseToolboxInput = z.infer<typeof CloseToolboxInputSchema>;
type UseToolInput = z.infer<typeof UseToolInputSchema>;

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
      version: "0.0.2",
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
        description: `Open a toolbox and discover its available tools.

This tool connects to all MCP servers configured in the specified toolbox
and retrieves their tool definitions. Once opened, you can use the tools
via workbench_use_tool.

Opening a toolbox:
1. Connects to each MCP server in the toolbox
2. Retrieves the list of available tools from each server
3. Applies any tool filters specified in the configuration
4. Returns complete tool definitions including schemas

If the toolbox is already open, returns the cached tool list.

Args:
  - toolbox_name: Name of the toolbox to open (from workbench_list_toolboxes)

Returns:
  JSON format:
  {
    "toolbox": string,              // Toolbox name
    "description": string,          // Purpose description
    "servers_connected": number,    // Number of MCP servers connected
    "tools": [
      {
        "name": string,             // Tool identifier
        "source_server": string,    // Which MCP server provides this
        "description": string,      // What the tool does
        "inputSchema": object,      // Zod/JSON schema for parameters
        "annotations": object       // Tool hints (readOnly, etc.)
      }
    ]
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

          // Open the toolbox (connects to servers)
          const { connections, tools } = await this.clientManager.openToolbox(
            params.toolbox_name,
            toolboxConfig
          );

          const result: OpenToolboxResult = {
            toolbox: params.toolbox_name,
            description: toolboxConfig.description,
            servers_connected: connections.size,
            tools,
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

          return {
            content: [
              {
                type: "text" as const,
                text: `Successfully closed toolbox '${params.toolbox_name}' and disconnected from all servers.`,
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

    // Tool 4: Use a tool from a toolbox
    this.server.registerTool(
      "workbench_use_tool",
      {
        title: "Execute a Tool from Toolbox",
        description: `Execute a tool from an opened toolbox with specified arguments.

This is the primary tool invocation mechanism. It proxies the tool call
to the appropriate MCP server and returns the result.

Prerequisites:
1. The toolbox must be opened first (use workbench_open_toolbox)
2. You must know the tool name (from the open toolbox response)
3. You must provide arguments matching the tool's inputSchema

The tool call is forwarded to the MCP server that provides the tool,
and the result is returned directly.

Args:
  - toolbox_name: Name of the opened toolbox containing the tool
  - tool_name: Name of the tool to execute
  - arguments: Object containing tool parameters (must match tool's inputSchema)

Returns:
  The tool's response is returned directly (format depends on the tool)

Examples:
  - Use when: Executing any tool from an opened toolbox
  - After: Opening a toolbox with workbench_open_toolbox
  - With: Arguments that match the tool's inputSchema

Error Handling:
  - Returns error if toolbox is not open
  - Returns error if tool doesn't exist in toolbox
  - Returns error if arguments don't match tool's schema
  - Returns error from the underlying tool if it fails
  - Provides clear guidance on which toolbox/tool failed`,
        inputSchema: UseToolInputSchema.shape,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      async (args: { [x: string]: any }) => {
        const params = args as UseToolInput;
        try {
          const result = await this.clientManager.callTool(
            params.toolbox_name,
            params.tool_name,
            params.arguments
          );

          // Return the tool result directly
          return result;
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error executing tool: ${
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
