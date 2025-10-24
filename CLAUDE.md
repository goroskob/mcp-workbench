# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP Workbench is a **meta-MCP server** that aggregates tools from other MCP servers and organizes them into "toolboxes" for dynamic discovery and invocation. It acts as a proxy/orchestrator that connects to downstream MCP servers and exposes their tools through a unified interface.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript (required before running)
npm run build

# Run the server (requires WORKBENCH_CONFIG env var)
export WORKBENCH_CONFIG=./workbench-config.json
npm start

# Development mode with hot-reload (no build needed)
npm run dev

# Clean build artifacts
npm run clean
```

## Architecture Overview

### Request Flow
```
MCP Client → Workbench Server → Client Manager → Downstream MCP Server(s)
```

The workbench acts as both an **MCP server** (exposes 4 meta-tools) and an **MCP client** (connects to downstream servers).

### Core Components

**src/index.ts** - Main MCP server
- Implements the 4 workbench tools: `list_toolboxes`, `open_toolbox`, `close_toolbox`, `use_tool`
- Manages server lifecycle (initialization, cleanup on SIGINT/SIGTERM)
- Loads configuration via `config-loader.ts`

**src/client-manager.ts** - MCP client connection pool
- Opens/closes connections to downstream MCP servers as MCP clients
- Queries `tools/list` from each server during toolbox open
- Proxies `tools/call` to the appropriate server based on tool name
- Maintains runtime state of opened toolboxes with their connections
- Key method: `connectToServer()` creates `StdioClientTransport` for each downstream server

**src/config-loader.ts** - Configuration validator
- Loads `workbench-config.json` (path from `WORKBENCH_CONFIG` env var)
- Validates toolbox structure at startup
- Each toolbox contains an `mcpServers` object using standard MCP schema

**src/types.ts** - TypeScript type system
- `WorkbenchConfig`, `ToolboxConfig`, `McpServerConfig`, `WorkbenchServerConfig` define configuration schema
- `ServerConnection` tracks MCP client instances, transports, and cached tools
- `OpenedToolbox` represents runtime state of active connections
- `ToolInfo` extends MCP SDK's `Tool` type with `source_server` and `toolbox_name` metadata

### The 4 Workbench Tools

1. **workbench_list_toolboxes** - Lists configured toolboxes (read-only, no connections made)
2. **workbench_open_toolbox** - Connects to all MCP servers in a toolbox, queries their tools, returns merged tool list
3. **workbench_use_tool** - Forwards tool invocation to the appropriate downstream server
4. **workbench_close_toolbox** - Disconnects all servers in a toolbox

## Configuration Format

The server requires a `workbench-config.json` file with this structure:

```json
{
  "toolboxes": {
    "toolbox-name": {
      "description": "Purpose of this toolbox",
      "mcpServers": {
        "server-name": {
          "command": "node",
          "args": ["path/to/server.js"],
          "env": { "API_KEY": "value" },
          "toolFilters": ["*"],  // or ["tool1", "tool2"]
          "transport": "stdio"   // optional, defaults to stdio
        }
      }
    }
  }
}
```

**Configuration Schema Notes:**
- **toolbox_name**: Used as identifier in tool calls
- **mcpServers**: Uses the **standard MCP configuration schema** (compatible with Claude Desktop/.claude.json)
  - Keys are server names (unique identifiers)
  - Values follow the standard MCP server config: `command`, `args`, `env`
- **Workbench-specific extensions**:
  - **toolFilters**: `["*"]` = all tools, or specify exact tool names to include
  - **transport**: Currently only `"stdio"` is implemented (HTTP/SSE planned)

The `mcpServers` format matches the standard used by Claude Desktop and other MCP clients, making it easy to copy server configurations between tools.

## Key Design Patterns

### Lazy Connection Management
Connections are **not** created at server startup. They're created when `workbench_open_toolbox` is called, allowing:
- Multiple toolboxes can be open simultaneously
- Resources freed by closing unused toolboxes
- Fresh tool discovery on each open

### Tool Proxying
`workbench_use_tool` does NOT re-expose downstream tools as native workbench tools. Instead:
1. Finds which server provides the tool (from cached tool list)
2. Calls `client.callTool()` on that server's MCP client
3. Returns the response directly (preserves original behavior)

### Error Handling Pattern
- **Configuration errors**: Fail fast at startup with clear messages
- **Connection errors**: Cleanup partial connections, include server name in error
- **Tool execution errors**: Set `isError: true`, wrap with context (toolbox/tool names)

## Environment Variables

- `WORKBENCH_CONFIG`: Path to configuration file (default: `./workbench-config.json`)

## Testing Approach

Use `workbench-config.test.json` with simple MCP servers:

```bash
export WORKBENCH_CONFIG=./workbench-config.test.json
npm start
```

Recommended test servers (no auth required):
- `@modelcontextprotocol/server-memory` - Simple key-value storage
- `@modelcontextprotocol/server-filesystem` - File operations

## Common Modifications

### Adding Support for New Transport Types
1. Update `WorkbenchServerConfig` type in `src/types.ts` to include new transport options
2. Modify `ClientManager.connectToServer()` to handle new transport type
3. Import appropriate transport from `@modelcontextprotocol/sdk/client/*`

### Adding New Workbench Tools
1. Define Zod schema in `src/index.ts` for input validation
2. Register tool with `server.registerTool()` in `registerTools()` method
3. Use `this.clientManager` to access opened toolboxes
4. Follow handler signature: `async (args: { [x: string]: any }) => ...`

### Handling Tool Name Conflicts
Currently, if two servers expose the same tool name, the first one found is used. To implement prefixing:
1. Modify `ClientManager.openToolbox()` to prefix tool names with server name
2. Update `ClientManager.callTool()` to strip prefix before forwarding
3. Document the prefixing strategy in tool metadata

## TypeScript Notes

- Strict mode enabled in `tsconfig.json`
- Using ES2022 target with Node16 module resolution
- Tool handler type casting: `const params = args as InputType;` due to SDK signature
- Type assertion `as const` used for `type: "text"` to satisfy SDK's discriminated unions
