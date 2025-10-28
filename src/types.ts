/**
 * Type definitions for MCP Workbench
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Standard MCP server configuration (matching Claude Desktop schema)
 */
export interface McpServerConfig {
  /** Command to execute the MCP server */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables for the server process */
  env?: Record<string, string>;
}

/**
 * Extended MCP server configuration with workbench-specific options
 */
export interface WorkbenchServerConfig extends McpServerConfig {
  /** Tool filters: array of tool names to include, or ["*"] for all tools */
  toolFilters?: string[];
  /** Transport type: stdio, http, or sse (default: stdio) */
  transport?: "stdio" | "http" | "sse";
  /** Base URL for http/sse transports */
  url?: string;
}

/**
 * Configuration for a toolbox
 */
export interface ToolboxConfig {
  /** Human-readable description of the toolbox purpose */
  description: string;
  /** MCP servers that provide tools for this toolbox (standard MCP schema) */
  mcpServers: Record<string, WorkbenchServerConfig>;
}

/**
 * Root configuration structure
 */
export interface WorkbenchConfig {
  /** Named toolboxes containing MCP server configurations */
  toolboxes: Record<string, ToolboxConfig>;
  // toolMode field removed - proxy mode is now the only mode
}

/**
 * Structured tool identifier with three required components
 */
export interface ToolIdentifier {
  /** Toolbox name containing the tool */
  readonly toolbox: string;
  /** MCP server name providing the tool */
  readonly server: string;
  /** Original tool name from the downstream MCP server */
  readonly tool: string;
}

/**
 * Information about a tool including its source server
 */
export interface ToolInfo extends Tool {
  /** Name of the MCP server that provides this tool */
  server: string;
  /** Name of the toolbox this tool belongs to */
  toolbox: string;
}

/**
 * Result of opening a toolbox
 */
export interface OpenToolboxResult {
  toolbox: string;
  description: string;
  servers_connected: number;
  tools: ToolInfo[];
}

/**
 * Connection state for an MCP server
 */
export interface ServerConnection {
  /** Unique identifier for this server instance */
  name: string;
  config: WorkbenchServerConfig;
  /** The MCP client instance */
  client: any; // Client from SDK
  /** Transport instance */
  transport: any;
  /** Cached tools from this server */
  tools: Tool[];
  /** Connection timestamp */
  connected_at: Date;
}

/**
 * State for an opened toolbox
 */
export interface OpenedToolbox {
  name: string;
  config: ToolboxConfig;
  connections: Map<string, ServerConnection>;
  // registeredTools field removed - no dynamic registration in proxy-only mode
  opened_at: Date;
}
