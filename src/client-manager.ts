/**
 * MCP Client Manager - Handles connections to downstream MCP servers
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WorkbenchServerConfig, ServerConnection, OpenedToolbox, ToolboxConfig, ToolInfo, RegisteredToolInfo } from "./types.js";

/**
 * Manages connections to MCP servers and toolbox lifecycle
 */
export class ClientManager {
  /** Currently opened toolboxes */
  private openedToolboxes: Map<string, OpenedToolbox> = new Map();

  /**
   * Connect to an MCP server and retrieve its tools
   */
  private async connectToServer(
    serverName: string,
    config: WorkbenchServerConfig
  ): Promise<ServerConnection> {
    try {
      // Create client
      const client = new Client(
        {
          name: "mcp-workbench-client",
          version: "0.0.1",
        },
        {
          capabilities: {},
        }
      );

      // Create transport based on config
      let transport: any;

      if (config.transport === "stdio" || !config.transport) {
        // Merge environment variables, filtering out undefined values
        const envVars: Record<string, string> = {};
        for (const [key, value] of Object.entries(process.env)) {
          if (value !== undefined) {
            envVars[key] = value;
          }
        }
        // Add config env vars
        if (config.env) {
          Object.assign(envVars, config.env);
        }

        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: envVars,
        });
      } else {
        throw new Error(
          `Transport type '${config.transport}' not yet implemented. Only 'stdio' is currently supported.`
        );
      }

      // Connect to the server
      await client.connect(transport);

      // List available tools
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools || [];

      // Apply tool filters
      let filteredTools = tools;
      if (config.toolFilters && !config.toolFilters.includes("*")) {
        filteredTools = tools.filter((tool) =>
          config.toolFilters!.includes(tool.name)
        );
      }

      return {
        name: serverName,
        config,
        client,
        transport,
        tools: filteredTools,
        connected_at: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to connect to MCP server '${serverName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Open a toolbox by connecting to all its MCP servers and registering tools
   */
  async openToolbox(
    toolboxName: string,
    toolboxConfig: ToolboxConfig,
    mcpServer: McpServer
  ): Promise<{ connections: Map<string, ServerConnection>; tools: ToolInfo[] }> {
    // Check if already open
    if (this.openedToolboxes.has(toolboxName)) {
      const existing = this.openedToolboxes.get(toolboxName)!;
      const tools = this.getToolsFromConnections(toolboxName, existing.connections);
      return { connections: existing.connections, tools };
    }

    const connections = new Map<string, ServerConnection>();

    // Connect to each server
    for (const [serverName, serverConfig] of Object.entries(toolboxConfig.mcpServers)) {
      try {
        const connection = await this.connectToServer(serverName, serverConfig);
        connections.set(serverName, connection);
      } catch (error) {
        // Cleanup any successful connections before throwing
        for (const conn of connections.values()) {
          try {
            await conn.client.close();
          } catch {}
        }
        throw error;
      }
    }

    // Register tools on the workbench server
    const registeredTools = await this.registerToolsOnServer(
      mcpServer,
      toolboxName,
      connections
    );

    // Store opened toolbox
    const openedToolbox: OpenedToolbox = {
      name: toolboxName,
      config: toolboxConfig,
      connections,
      registeredTools,
      opened_at: new Date(),
    };
    this.openedToolboxes.set(toolboxName, openedToolbox);

    // Get full tool list with schemas
    const tools = this.getToolsFromConnections(toolboxName, connections);

    return { connections, tools };
  }

  /**
   * Extract tool information list from an opened toolbox
   */
  private getToolInfoList(toolbox: OpenedToolbox): RegisteredToolInfo[] {
    const tools: RegisteredToolInfo[] = [];

    for (const [serverName, connection] of toolbox.connections) {
      for (const tool of connection.tools) {
        const prefixedName = `${serverName}_${tool.name}`;
        tools.push({
          name: prefixedName,
          original_name: tool.name,
          server: serverName,
          description: tool.description,
          title: tool.title,
        });
      }
    }

    return tools;
  }

  /**
   * Get full tool list with schemas from connections
   * Used for proxy mode to return complete tool information
   */
  private getToolsFromConnections(
    toolboxName: string,
    connections: Map<string, ServerConnection>
  ): ToolInfo[] {
    const tools: ToolInfo[] = [];

    for (const [serverName, connection] of connections) {
      for (const tool of connection.tools) {
        tools.push({
          ...tool,
          source_server: serverName,
          toolbox_name: toolboxName,
        });
      }
    }

    return tools;
  }

  /**
   * Register all downstream tools on the workbench server
   * Tools are prefixed with server name to avoid conflicts
   */
  private async registerToolsOnServer(
    mcpServer: McpServer,
    toolboxName: string,
    connections: Map<string, ServerConnection>
  ): Promise<Map<string, any>> {
    const registeredTools = new Map<string, any>();

    for (const [serverName, connection] of connections) {
      for (const tool of connection.tools) {
        // Prefix tool name with server name to avoid conflicts
        const prefixedName = `${serverName}_${tool.name}`;

        // Register tool on workbench server with a handler that delegates to downstream
        const registeredTool = mcpServer.registerTool(
          prefixedName,
          {
            title: tool.title,
            description: tool.description
              ? `[${serverName}] ${tool.description}`
              : `Tool from ${serverName} server`,
            inputSchema: tool.inputSchema as any,
            annotations: tool.annotations,
            _meta: {
              ...tool._meta,
              source_server: serverName,
              toolbox_name: toolboxName,
              original_name: tool.name,
            },
          },
          async (args: any) => {
            // Delegate to the downstream server
            try {
              const result = await connection.client.callTool({
                name: tool.name, // Use original name for downstream call
                arguments: args,
              });
              return result;
            } catch (error) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Error calling tool '${tool.name}' on server '${serverName}': ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                ],
                isError: true,
              };
            }
          }
        );

        registeredTools.set(prefixedName, registeredTool);
      }
    }

    return registeredTools;
  }

  /**
   * Unregister all tools for a toolbox from the workbench server
   */
  private unregisterToolsFromServer(toolboxName: string): void {
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      return;
    }

    // Remove all registered tools
    for (const registeredTool of toolbox.registeredTools.values()) {
      try {
        registeredTool.remove();
      } catch (error) {
        console.error(`Error removing tool:`, error);
      }
    }
  }

  /**
   * Close a toolbox and disconnect from its servers
   */
  async closeToolbox(toolboxName: string): Promise<void> {
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      throw new Error(`Toolbox '${toolboxName}' is not currently open`);
    }

    // Unregister all tools first
    this.unregisterToolsFromServer(toolboxName);

    // Disconnect from all servers
    const errors: Error[] = [];
    for (const [serverName, connection] of toolbox.connections) {
      try {
        await connection.client.close();
      } catch (error) {
        errors.push(
          new Error(
            `Failed to disconnect from '${serverName}': ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    }

    // Remove from opened toolboxes
    this.openedToolboxes.delete(toolboxName);

    // Throw if any errors occurred
    if (errors.length > 0) {
      throw new Error(
        `Errors while closing toolbox: ${errors.map((e) => e.message).join("; ")}`
      );
    }
  }


  /**
   * Get list of opened toolboxes
   */
  getOpenedToolboxes(): string[] {
    return Array.from(this.openedToolboxes.keys());
  }

  /**
   * Check if a toolbox is open
   */
  isToolboxOpen(toolboxName: string): boolean {
    return this.openedToolboxes.has(toolboxName);
  }

  /**
   * Get details of an opened toolbox
   */
  getOpenedToolbox(toolboxName: string): OpenedToolbox | undefined {
    return this.openedToolboxes.get(toolboxName);
  }

  /**
   * Find a tool in an opened toolbox by its original name
   * Returns the connection and tool, or throws an error if not found
   */
  findToolInToolbox(toolboxName: string, toolName: string): { connection: ServerConnection; tool: Tool } {
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      throw new Error(`Toolbox '${toolboxName}' is not currently open. Please open it first with workbench_open_toolbox.`);
    }

    // Search all connections for a tool with this name
    for (const connection of toolbox.connections.values()) {
      const tool = connection.tools.find(t => t.name === toolName);
      if (tool) {
        return { connection, tool };
      }
    }

    // Tool not found - provide helpful error message
    const availableTools: string[] = [];
    for (const connection of toolbox.connections.values()) {
      availableTools.push(...connection.tools.map(t => t.name));
    }

    throw new Error(
      `Tool '${toolName}' not found in toolbox '${toolboxName}'. Available tools: ${availableTools.join(", ")}`
    );
  }

  /**
   * Close all toolboxes and cleanup
   */
  async closeAll(): Promise<void> {
    const toolboxNames = Array.from(this.openedToolboxes.keys());
    for (const name of toolboxNames) {
      try {
        await this.closeToolbox(name);
      } catch (error) {
        console.error(`Error closing toolbox '${name}':`, error);
      }
    }
  }
}
