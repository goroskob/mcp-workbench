/**
 * MCP client factory for E2E tests
 * Creates and manages MCP test clients
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPTestClient, ToolIdentifier, ToolInfo } from './types.js';

/**
 * Create an MCP test client connected to a workbench server
 *
 * @param configPath - Path to workbench configuration file
 * @param env - Optional environment variables
 * @returns Promise<MCPTestClient> - Connected MCP client wrapper
 * @throws Error if connection fails
 */
export async function createMCPClient(
  configPath: string,
  env: Record<string, string> = {}
): Promise<MCPTestClient> {
  // Create MCP client
  const client = new Client(
    {
      name: 'e2e-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Create stdio transport that spawns the workbench server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      ...process.env,
      ...env,
      WORKBENCH_CONFIG: configPath,
    },
  });

  // Connect client (this spawns the server process)
  await client.connect(transport);

  return {
    client,
    transport,
    connected: true,
    openedToolboxes: [],
  };
}

/**
 * Open a toolbox and retrieve its tools
 *
 * @param mcpClient - MCP test client
 * @param toolboxName - Name of toolbox to open
 * @returns Promise<ToolInfo[]> - List of tools in the toolbox
 * @throws Error if toolbox doesn't exist or can't be opened
 */
export async function openToolbox(
  mcpClient: MCPTestClient,
  toolboxName: string
): Promise<ToolInfo[]> {
  if (!mcpClient.connected) {
    throw new Error('Cannot open toolbox: client not connected');
  }

  // Call open_toolbox meta-tool
  const result = await mcpClient.client.callTool({
    name: 'open_toolbox',
    arguments: {
      toolbox: toolboxName,
    },
  });

  if (result.isError) {
    throw new Error(
      `Failed to open toolbox "${toolboxName}": ${
        result.content?.[0]?.text || 'Unknown error'
      }`
    );
  }

  // Parse result (should contain tools array)
  const resultText = result.content?.[0]?.text || '{}';
  const parsed = JSON.parse(resultText);

  if (!parsed.tools || !Array.isArray(parsed.tools)) {
    throw new Error(
      `Invalid response from open_toolbox: missing tools array`
    );
  }

  // Track opened toolbox
  if (!mcpClient.openedToolboxes.includes(toolboxName)) {
    mcpClient.openedToolboxes.push(toolboxName);
  }

  return parsed.tools as ToolInfo[];
}

/**
 * Execute a tool via use_tool meta-tool
 *
 * @param mcpClient - MCP test client
 * @param identifier - Structured tool identifier
 * @param args - Tool arguments
 * @returns Promise<any> - Tool execution result
 * @throws Error if tool execution fails
 */
export async function useTool(
  mcpClient: MCPTestClient,
  identifier: ToolIdentifier,
  args: any = {}
): Promise<any> {
  if (!mcpClient.connected) {
    throw new Error('Cannot use tool: client not connected');
  }

  // Call use_tool meta-tool with structured identifier
  const result = await mcpClient.client.callTool({
    name: 'use_tool',
    arguments: {
      tool: {
        toolbox: identifier.toolbox,
        server: identifier.server,
        name: identifier.name,
      },
      arguments: args,
    },
  });

  if (result.isError) {
    throw new Error(
      `Tool execution failed (${identifier.toolbox}/${identifier.server}/${identifier.name}): ${
        result.content?.[0]?.text || 'Unknown error'
      }`
    );
  }

  // Parse result
  const resultText = result.content?.[0]?.text || '{}';
  return JSON.parse(resultText);
}

/**
 * Disconnect the MCP test client
 *
 * @param mcpClient - MCP test client to disconnect
 * @throws Error if disconnect fails
 */
export async function disconnect(mcpClient: MCPTestClient): Promise<void> {
  if (!mcpClient.connected) {
    return; // Already disconnected
  }

  try {
    await mcpClient.client.close();
    mcpClient.connected = false;
    mcpClient.openedToolboxes = [];
  } catch (err) {
    throw new Error(
      `Failed to disconnect client: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * MCPTestClient class wrapper for cleaner test code
 * Provides object-oriented interface to client operations
 */
export class MCPTestClientWrapper {
  private mcpClient: MCPTestClient | null = null;

  /**
   * Connect to workbench server
   */
  async connect(configPath: string, env: Record<string, string> = {}): Promise<void> {
    this.mcpClient = await createMCPClient(configPath, env);
  }

  /**
   * Open a toolbox
   */
  async openToolbox(toolboxName: string): Promise<ToolInfo[]> {
    if (!this.mcpClient) {
      throw new Error('Client not connected');
    }
    return openToolbox(this.mcpClient, toolboxName);
  }

  /**
   * Execute a tool
   */
  async useTool(identifier: ToolIdentifier, args: any = {}): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('Client not connected');
    }
    return useTool(this.mcpClient, identifier, args);
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.mcpClient) {
      await disconnect(this.mcpClient);
      this.mcpClient = null;
    }
  }

  /**
   * Get list of opened toolboxes
   */
  getOpenedToolboxes(): string[] {
    return this.mcpClient?.openedToolboxes || [];
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.mcpClient?.connected || false;
  }
}
