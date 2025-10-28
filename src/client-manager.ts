/**
 * MCP Client Manager - Handles connections to downstream MCP servers
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { WorkbenchServerConfig, ServerConnection, OpenedToolbox, ToolboxConfig, ToolInfo } from "./types.js";

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

        // Log connection attempt details for debugging
        console.error(`[mcp-workbench] Connecting to server '${serverName}':`);
        console.error(`  Command: ${config.command}`);
        console.error(`  Args: ${JSON.stringify(config.args || [])}`);
        console.error(`  Env vars: ${Object.keys(config.env || {}).join(", ") || "(none)"}`);

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

      console.error(`[mcp-workbench] Successfully connected to '${serverName}', found ${tools.length} tools`);

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
      // Provide more detailed error information
      console.error(`[mcp-workbench] Connection failed for server '${serverName}':`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`  Config: ${JSON.stringify({ command: config.command, args: config.args }, null, 2)}`);
      
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
    toolboxConfig: ToolboxConfig
  ): Promise<{ connections: Map<string, ServerConnection>; tools: ToolInfo[] }> {
    // Check if already open
    if (this.openedToolboxes.has(toolboxName)) {
      const existing = this.openedToolboxes.get(toolboxName)!;
      const tools = this.getToolsFromConnections(toolboxName, existing.connections);
      return { connections: existing.connections, tools };
    }

    const connections = new Map<string, ServerConnection>();

    try {
      // Connect to all servers in parallel for faster startup
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

    // Store opened toolbox
    const openedToolbox: OpenedToolbox = {
      name: toolboxName,
      config: toolboxConfig,
      connections,
      opened_at: new Date(),
    };
    this.openedToolboxes.set(toolboxName, openedToolbox);

    // Get full tool list with schemas
    const tools = this.getToolsFromConnections(toolboxName, connections);

    return { connections, tools };
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
        // Use structured metadata instead of concatenated names
        tools.push({
          ...tool,
          name: tool.name,  // Original tool name (not concatenated)
          description: tool.description,  // Original description (no prefix)
          server: serverName,  // Separate server field
          toolbox: toolboxName,   // Separate toolbox field
        });
      }
    }

    return tools;
  }

  /**
   * Close a toolbox and disconnect from its servers
   */
  async closeToolbox(toolboxName: string): Promise<void> {
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      throw new Error(`Toolbox '${toolboxName}' is not currently open`);
    }

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
  findToolInToolbox(toolboxName: string, serverName: string, toolName: string): { connection: ServerConnection; tool: Tool } {
    // Lookup toolbox
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      throw new Error(`Toolbox '${toolboxName}' not found`);
    }

    // Lookup server connection within toolbox
    const connection = toolbox.connections.get(serverName);
    if (!connection) {
      throw new Error(`Server '${serverName}' not found in toolbox '${toolboxName}'`);
    }

    // Find tool in server's tools array
    const tool = connection.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in server '${serverName}' (toolbox '${toolboxName}')`);
    }

    return { connection, tool };
  }

  /**
   * @deprecated Old method signature for backward compatibility during migration
   */
  private findToolInToolboxOld(toolboxName: string, toolName: string): { connection: ServerConnection; tool: Tool } {
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
  async closeAllToolboxes(): Promise<void> {
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
