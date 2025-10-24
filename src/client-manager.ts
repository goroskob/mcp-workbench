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
   * Open a toolbox by connecting to all its MCP servers
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
    const tools: ToolInfo[] = [];

    // Connect to each server
    for (const [serverName, serverConfig] of Object.entries(toolboxConfig.mcpServers)) {
      try {
        const connection = await this.connectToServer(serverName, serverConfig);
        connections.set(serverName, connection);

        // Add tools with metadata
        for (const tool of connection.tools) {
          tools.push({
            ...tool,
            source_server: serverName,
            toolbox_name: toolboxName,
          });
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
    }

    // Store opened toolbox
    this.openedToolboxes.set(toolboxName, {
      name: toolboxName,
      config: toolboxConfig,
      connections,
      opened_at: new Date(),
    });

    return { connections, tools };
  }

  /**
   * Get tools from a set of connections
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
   * Call a tool from an opened toolbox
   */
  async callTool(
    toolboxName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<any> {
    const toolbox = this.openedToolboxes.get(toolboxName);
    if (!toolbox) {
      throw new Error(
        `Toolbox '${toolboxName}' is not open. Please open it first with workbench_open_toolbox.`
      );
    }

    // Find the tool and its server
    let foundServer: ServerConnection | undefined;
    let foundTool: Tool | undefined;

    for (const connection of toolbox.connections.values()) {
      const tool = connection.tools.find((t) => t.name === toolName);
      if (tool) {
        foundTool = tool;
        foundServer = connection;
        break;
      }
    }

    if (!foundServer || !foundTool) {
      const availableTools = Array.from(toolbox.connections.values())
        .flatMap((conn) => conn.tools.map((t) => t.name))
        .join(", ");
      throw new Error(
        `Tool '${toolName}' not found in toolbox '${toolboxName}'. Available tools: ${availableTools}`
      );
    }

    // Call the tool on the remote server
    try {
      const result = await foundServer.client.callTool({
        name: toolName,
        arguments: args,
      });

      return result;
    } catch (error) {
      throw new Error(
        `Error calling tool '${toolName}' on server '${foundServer.name}': ${
          error instanceof Error ? error.message : String(error)
        }`
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
