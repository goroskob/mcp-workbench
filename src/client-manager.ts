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
   * Parse a registered tool name to extract toolbox, server, and original tool name
   * Format: {toolbox}__{server}_{tool}
   * Example: "dev__filesystem_read_file" => { toolbox: "dev", server: "filesystem", originalTool: "read_file" }
   */
  private parseToolName(registeredName: string): { toolbox: string; server: string; originalTool: string } | null {
    // Split on double underscore to separate toolbox from server+tool
    const parts = registeredName.split('__');
    if (parts.length !== 2) {
      return null; // Invalid format
    }

    const toolboxName = parts[0];
    const serverAndTool = parts[1];

    // Find the first underscore in server+tool portion
    const firstUnderscoreIndex = serverAndTool.indexOf('_');
    if (firstUnderscoreIndex === -1) {
      return null; // Invalid format - no underscore between server and tool
    }

    const serverName = serverAndTool.substring(0, firstUnderscoreIndex);
    const originalTool = serverAndTool.substring(firstUnderscoreIndex + 1);

    if (!toolboxName || !serverName || !originalTool) {
      return null; // Empty components
    }

    return {
      toolbox: toolboxName,
      server: serverName,
      originalTool: originalTool
    };
  }

  /**
   * Generate a registered tool name from toolbox, server, and original tool name
   * Format: {toolbox}__{server}_{tool}
   * Example: generateToolName("dev", "filesystem", "read_file") => "dev__filesystem_read_file"
   */
  private generateToolName(toolboxName: string, serverName: string, originalToolName: string): string {
    return `${toolboxName}__${serverName}_${originalToolName}`;
  }

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

    try {
      // Connect to all servers in parallel
      const serverEntries = Object.entries(toolboxConfig.mcpServers);
      const connectionPromises = serverEntries.map(([serverName, serverConfig]) =>
        this.connectToServer(serverName, serverConfig).then(connection => ({
          serverName,
          connection
        }))
      );

      const results = await Promise.all(connectionPromises);

      // Build connections map from results
      for (const { serverName, connection } of results) {
        connections.set(serverName, connection);
      }
    } catch (error) {
      // Cleanup any successful connections before throwing
      for (const conn of connections.values()) {
        try {
          await conn.client.close();
        } catch {}
      }
      throw error;
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
        const prefixedName = this.generateToolName(toolbox.name, serverName, tool.name);
        tools.push({
          name: prefixedName,
          original_name: tool.name,
          server: serverName,
          toolbox_name: toolbox.name,
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
   * Tools are prefixed with server name to avoid conflicts (matching dynamic mode)
   */
  private getToolsFromConnections(
    toolboxName: string,
    connections: Map<string, ServerConnection>
  ): ToolInfo[] {
    const tools: ToolInfo[] = [];

    for (const [serverName, connection] of connections) {
      for (const tool of connection.tools) {
        // Apply same prefix as dynamic mode - toolbox__server_tool
        const prefixedName = this.generateToolName(toolboxName, serverName, tool.name);

        tools.push({
          ...tool,
          name: prefixedName,  // Prefixed name
          description: tool.description
            ? `[${toolboxName}/${serverName}] ${tool.description}`
            : `Tool from ${toolboxName}/${serverName}`,
          source_server: serverName,
          toolbox_name: toolboxName,
          _meta: {
            ...tool._meta,
            source_server: serverName,
            toolbox_name: toolboxName,
            original_name: tool.name,  // Store original for reference
          },
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
        // Prefix tool name with toolbox and server name to support duplicate servers across toolboxes
        const prefixedName = this.generateToolName(toolboxName, serverName, tool.name);

        // Register tool on workbench server with a handler that delegates to downstream
        const registeredTool = mcpServer.registerTool(
          prefixedName,
          {
            title: tool.title,
            description: tool.description
              ? `[${toolboxName}/${serverName}] ${tool.description}`
              : `Tool from ${toolboxName}/${serverName}`,
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
            // Parse the registered tool name to extract components
            const parsed = this.parseToolName(prefixedName);
            if (!parsed) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Error: Invalid tool name format '${prefixedName}'`,
                  },
                ],
                isError: true,
              };
            }

            // Look up the toolbox
            const targetToolbox = this.openedToolboxes.get(parsed.toolbox);
            if (!targetToolbox) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Error: Toolbox '${parsed.toolbox}' not found`,
                  },
                ],
                isError: true,
              };
            }

            // Look up the server connection
            const targetConnection = targetToolbox.connections.get(parsed.server);
            if (!targetConnection) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Error: Server '${parsed.server}' not found in toolbox '${parsed.toolbox}'`,
                  },
                ],
                isError: true,
              };
            }

            // Delegate to the downstream server using original tool name
            try {
              const result = await targetConnection.client.callTool({
                name: parsed.originalTool,
                arguments: args,
              });
              return result;
            } catch (error) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `[${parsed.toolbox}/${parsed.server}/${parsed.originalTool}] Error: ${
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
   * Find a tool in an opened toolbox by its name (with or without server prefix)
   * Returns the connection and tool, or throws an error if not found
   */
  findToolInToolbox(toolboxName: string, toolName: string): { connection: ServerConnection; tool: Tool } {
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      throw new Error(`Toolbox '${toolboxName}' is not currently open. Please open it first with workbench_open_toolbox.`);
    }

    // Parse server prefix: format is {serverName}_{originalToolName}
    const underscoreIndex = toolName.indexOf('_');

    if (underscoreIndex > 0) {
      const potentialServer = toolName.substring(0, underscoreIndex);
      const connection = toolbox.connections.get(potentialServer);

      if (connection) {
        // Extract original tool name (everything after first underscore)
        const originalToolName = toolName.substring(underscoreIndex + 1);
        const tool = connection.tools.find(t => t.name === originalToolName);

        if (tool) {
          return { connection, tool };
        }
      }
    }

    // Fallback: search all connections with original name (backward compatibility)
    for (const connection of toolbox.connections.values()) {
      const tool = connection.tools.find(t => t.name === toolName);
      if (tool) {
        return { connection, tool };
      }
    }

    // Tool not found - provide helpful error message with prefixed names
    const availableTools: string[] = [];
    for (const [serverName, connection] of toolbox.connections) {
      availableTools.push(...connection.tools.map(t => `${serverName}_${t.name}`));
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
