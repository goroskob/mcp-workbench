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
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

// Zod schemas for tool inputs
const OpenToolboxInputSchema = z
  .object({
    toolbox: z
      .string()
      .min(1)
      .describe("Name of the toolbox to open (e.g., 'incident-analysis', 'gitlab-workflow')"),
  })
  .strict();

// Structured tool identifier schema
const ToolIdentifierSchema = z
  .object({
    toolbox: z.string().min(1, "Toolbox name cannot be empty"),
    server: z.string().min(1, "Server name cannot be empty"),
    tool: z.string().min(1, "Tool name cannot be empty"),
  })
  .strict();

const UseToolInputSchema = z
  .object({
    tool: ToolIdentifierSchema.describe("Structured identifier for the tool to invoke"),
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

// Error message templates for structured tool naming
const ErrorMessages = {
  toolboxNotFound: (toolbox: string) =>
    `Toolbox '${toolbox}' not found`,

  serverNotFound: (server: string, toolbox: string) =>
    `Server '${server}' not found in toolbox '${toolbox}'`,

  toolNotFound: (toolbox: string, server: string, tool: string) =>
    `Tool '${tool}' not found in server '${server}' (toolbox '${toolbox}')`,

  invalidToolIdentifier: (field: string) =>
    `Invalid tool identifier: ${field} cannot be empty`,

  connectionFailed: (server: string, toolbox: string, reason: string) =>
    `Failed to connect to server '${server}' in toolbox '${toolbox}': ${reason}`,
};

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
        version: pkg.version,
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

    // Combine header, listings, and footer with structured format example
    return [
      "Available Toolboxes:",
      "",
      listings,
      "",
      "Use open_toolbox to connect to a toolbox, then use_tool to invoke tools.",
      "",
      "Example tool invocation:",
      JSON.stringify({
        tool: {
          toolbox: "toolbox-name",
          server: "server-name",
          tool: "tool-name"
        },
        arguments: { }
      }, null, 2)
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
  - toolbox: Name of the toolbox to open (from initialization instructions)

Returns:
  JSON format:
  {
    "toolbox": string,              // Toolbox name
    "description": string,          // Purpose description
    "servers_connected": number,    // Number of MCP servers connected
    "tools": [
      {
        "name": string,             // Server-prefixed tool name (e.g., "clickhouse-wsw1_run_select_query")
        "server": string,           // Which MCP server provides this
        "toolbox": string,          // Toolbox this tool belongs to
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
          const toolboxConfig = this.config.toolboxes[params.toolbox];
          if (!toolboxConfig) {
            const available = Object.keys(this.config.toolboxes).join(", ");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: Toolbox '${params.toolbox}' not found. Available toolboxes: ${available}`,
                },
              ],
              isError: true,
            };
          }

          // Open the toolbox (connects to servers and returns tool list)
          const { connections, tools } = await this.clientManager.openToolbox(
            params.toolbox,
            toolboxConfig
          );

          const result: OpenToolboxResult = {
            toolbox: params.toolbox,
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
                text: `Error opening toolbox '${params.toolbox}': ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool 2: Use a tool
    this.server.registerTool(
      "use_tool",
      {
        title: "Use a Tool from Toolbox",
        description: `Execute a tool from an opened toolbox using structured tool identifiers.

How it works:
1. Specify the tool using a structured identifier: { toolbox, server, tool }
2. Provide the tool arguments as an object
3. The workbench proxies the request to the appropriate downstream MCP server
4. Returns the tool's response

Args:
  - tool: Structured tool identifier (required)
    - toolbox: Name of the opened toolbox (string, non-empty)
    - server: Name of the MCP server providing the tool (string, non-empty)
    - tool: Name of the tool from the downstream server (string, non-empty)
  - arguments: Tool arguments as a JSON object (optional)

Returns:
  Proxied response from the underlying tool

Example:
  {
    "tool": {
      "toolbox": "dev",
      "server": "filesystem",
      "tool": "read_file"
    },
    "arguments": { "path": "/etc/hosts" }
  }

Error Handling:
  - Returns error if toolbox is not open
  - Returns error if server is not found in toolbox
  - Returns error if tool is not found in server
  - Returns error if any identifier field is empty
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
        // Validate structured tool identifier with custom error messages
        const validationResult = UseToolInputSchema.safeParse(args);
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(err => {
            const field = err.path.join('.');
            return `${field}: ${err.message}`;
          }).join('; ');
          
          return {
            content: [
              {
                type: "text" as const,
                text: `Invalid tool invocation parameters: ${errors}`,
              },
            ],
            isError: true,
          };
        }

        const params = validationResult.data;
        try {
          // Extract structured tool identifier
          const { toolbox, server, tool } = params.tool;

          // Find the tool in the opened toolbox using structured lookup
          const { connection, tool: foundTool } = this.clientManager.findToolInToolbox(
            toolbox,
            server,
            tool
          );

          // Delegate to the downstream server using original tool name
          const result = await connection.client.callTool({
            name: tool,
            arguments: params.arguments,
          });

          return result;
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error executing tool '${params.tool.tool}' in server '${params.tool.server}' (toolbox '${params.tool.toolbox}'): ${
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
