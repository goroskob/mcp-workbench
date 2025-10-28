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
import { WorkbenchConfig, OpenToolboxResult } from "./types.js";

// Zod schemas for tool inputs
const OpenToolboxInputSchema = z
  .object({
    toolbox_name: z
      .string()
      .min(1)
      .describe("Name of the toolbox to open (e.g., 'incident-analysis', 'gitlab-workflow')"),
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
      .describe("Server-prefixed tool name (e.g., 'clickhouse-wsw1_run_select_query')"),
    arguments: z
      .record(z.any())
      .describe("Arguments to pass to the tool")
      .optional()
      .default({}),
  })
  .strict();

// Type inference
type OpenToolboxInput = z.infer<typeof OpenToolboxInputSchema>;
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
    this.server = new McpServer(
      {
        name: "mcp-workbench",
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
        instructions: this.generateToolboxInstructions(),
      }
    );

    this.registerTools();
  }

  /**
   * Generate initialization instructions listing available toolboxes
   * @returns Plain text instructions with toolbox metadata
   */
  private generateToolboxInstructions(): string {
    const toolboxEntries = Object.entries(this.config.toolboxes);

    // Handle empty configuration
    if (toolboxEntries.length === 0) {
      return [
        "No toolboxes configured.",
        "",
        "To configure toolboxes, add them to your workbench-config.json file.",
        "See documentation for configuration format.",
      ].join("\n");
    }

    // Generate toolbox listings
    const listings = toolboxEntries
      .map(([name, config]) => {
        const serverCount = Object.keys(config.mcpServers).length;
        const description = config.description || "No description provided";
        return `${name} (${serverCount} servers)\n  Description: ${description}`;
      })
      .join("\n\n");

    // Combine header, listings, and footer
    return [
      "Available Toolboxes:",
      "",
      listings,
      "",
      "Use open_toolbox to connect to a toolbox, then use_tool to invoke tools.",
    ].join("\n");
  }

  /**
   * Register all workbench tools
   */
  private registerTools(): void {
    // Tool 1: Open a toolbox
    const openToolboxDescription = `Open a toolbox and discover its available tools.

This tool connects to all MCP servers configured in the specified toolbox
and retrieves their tool definitions. Once opened, you can use the tools
via use_tool.

Opening a toolbox:
1. Connects to each MCP server in the toolbox
2. Retrieves the list of available tools from each server
3. Applies any tool filters specified in the configuration
4. Returns complete tool list with full schemas

The tool list includes complete schemas and metadata for each tool.
Use use_tool to execute tools by their server-prefixed names.

If the toolbox is already open, returns the cached information (idempotent operation).

Args:
  - toolbox_name: Name of the toolbox to open (from initialization instructions)

Returns:
  JSON format:
  {
    "toolbox": string,              // Toolbox name
    "description": string,          // Purpose description
    "servers_connected": number,    // Number of MCP servers connected
    "tools": [
      {
        "name": string,             // Server-prefixed tool name (e.g., "clickhouse-wsw1_run_select_query")
        "source_server": string,    // Which MCP server provides this
        "toolbox_name": string,     // Toolbox this tool belongs to
        "description": string,      // What the tool does (prefixed with [server])
        "inputSchema": object,      // JSON schema for parameters
        "annotations": object       // Tool hints (readOnly, etc.)
      }
    ]
  }

Examples:
  - Use when: You need to access tools from a specific domain
  - Use when: Starting work on a new task requiring specific toolsets
  - After: Reading initialization instructions to find the right toolbox
  - Next: Use use_tool to execute discovered tools

Error Handling:
  - Returns error if toolbox name doesn't exist
  - Returns error if MCP servers fail to connect
  - Provides connection details in error messages`;

    this.server.registerTool(
      "open_toolbox",
      {
        title: "Open a Toolbox",
        description: openToolboxDescription,
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

          // Open the toolbox (connects to servers and returns tool list)
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

    // Tool 2: Use a tool (proxy mode)
    this.server.registerTool(
      "use_tool",
      {
        title: "Use a Tool from Toolbox",
        description: `Execute a tool from an opened toolbox by delegating to the appropriate downstream MCP server.

How it works:
1. Specify the toolbox name and tool name
2. Provide the tool arguments as an object
3. The workbench proxies the request to the appropriate MCP server
4. Returns the tool's response

Args:
  - toolbox_name: Name of an opened toolbox
  - tool_name: Server-prefixed tool name (e.g., 'clickhouse-wsw1_run_select_query') as shown in open_toolbox response
  - arguments: Tool arguments as a JSON object (optional)

Returns:
  Proxied response from the underlying tool

Examples:
  - Use when: Invoking tools from an opened toolbox
  - Use when: You prefer explicit toolbox/tool naming
  - After: Opening a toolbox with open_toolbox

Error Handling:
  - Returns error if toolbox is not open
  - Returns error if tool is not found in the toolbox
  - Propagates errors from the underlying tool`,
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
            // Find the tool in the opened toolbox
            const { connection, tool } = this.clientManager.findToolInToolbox(
              params.toolbox_name,
              params.tool_name
            );

            // Delegate to the downstream server
            const result = await connection.client.callTool({
              name: tool.name,
              arguments: params.arguments,
            });

            return result;
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error executing tool '${params.tool_name}' in toolbox '${params.toolbox_name}': ${
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
    await this.clientManager.closeAllToolboxes();
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
