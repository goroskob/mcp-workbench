# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP Workbench is a **meta-MCP server** that aggregates tools from other MCP servers and organizes them into "toolboxes" for dynamic discovery and invocation. It acts as an orchestrator that connects to downstream MCP servers and **dynamically registers** their tools on the workbench server with prefixed names.

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

## Release Workflow

This project uses automated GitHub Actions for releases and npm publishing.

### Creating a New Release

1. **Update the version** in [package.json](package.json):
   ```bash
   # For a patch release (0.2.0 -> 0.2.1)
   npm version patch

   # For a minor release (0.2.0 -> 0.3.0)
   npm version minor

   # For a major release (0.2.0 -> 1.0.0)
   npm version major
   ```
   This creates a git commit and tag automatically.

2. **Push the tag** to trigger the release workflow:
   ```bash
   git push origin main --tags
   ```

3. **Automated workflow** (defined in [.github/workflows/release.yml](.github/workflows/release.yml)):
   - Builds the project (`npm run build`)
   - Creates a GitHub release with auto-generated release notes
   - Uploads distribution artifacts (tar.gz archive)
   - **Publishes to npm** automatically using `NPM_TOKEN` secret

### Setup Requirements

For automated npm publishing to work, the repository must have:
- **NPM_TOKEN** secret configured in GitHub repository settings
- Token should be an "Automation" type token from https://www.npmjs.com/settings/tokens

### CI/CD Workflows

- **[.github/workflows/build.yml](.github/workflows/build.yml)** - Runs on every push/PR to main/develop
  - Tests build on Node.js 18, 20, 22
  - Verifies TypeScript compilation
  - Validates build output

- **[.github/workflows/release.yml](.github/workflows/release.yml)** - Runs on version tags (v*)
  - Creates GitHub release
  - Publishes to npm registry
  - Uploads distribution archives

## Architecture Overview

### Request Flow
```
MCP Client → Workbench Server (calls registered tool) → Client Manager → Downstream MCP Server(s)
```

The workbench acts as both an **MCP server** (exposes 3 meta-tools + dynamically registered downstream tools) and an **MCP client** (connects to downstream servers).

### Dynamic Tool Registration
When a toolbox is opened, downstream tools are **dynamically registered** on the workbench server with prefixed names (`{server}_{tool}`). This means:
- Tools appear natively in the MCP client's tool list
- No proxy layer needed - tools are called directly by name
- Better IDE integration and discoverability

### Core Components

**src/index.ts** - Main MCP server
- Implements 3 workbench meta-tools: `list_toolboxes`, `open_toolbox`, `close_toolbox`
- Manages server lifecycle (initialization, cleanup on SIGINT/SIGTERM)
- Loads configuration via `config-loader.ts`
- Sends `tool list changed` notifications when toolboxes open/close

**src/client-manager.ts** - MCP client connection pool and tool registry
- Opens/closes connections to downstream MCP servers as MCP clients
- Queries `tools/list` from each server during toolbox open
- **Dynamically registers** downstream tools on the workbench server with prefixed names
- **Delegates** tool calls to appropriate downstream server via registered handlers
- Maintains runtime state of opened toolboxes with their connections and registered tools
- Key methods:
  - `connectToServer()` creates `StdioClientTransport` for each downstream server
  - `registerToolsOnServer()` registers downstream tools with `{server}_{tool}` prefix
  - `unregisterToolsFromServer()` removes tools when toolbox closes

**src/config-loader.ts** - Configuration validator
- Loads `workbench-config.json` (path from `WORKBENCH_CONFIG` env var)
- Validates toolbox structure at startup
- Each toolbox contains an `mcpServers` object using standard MCP schema

**src/types.ts** - TypeScript type system
- `WorkbenchConfig`, `ToolboxConfig`, `McpServerConfig`, `WorkbenchServerConfig` define configuration schema
- `ServerConnection` tracks MCP client instances, transports, and cached tools
- `OpenedToolbox` represents runtime state with connections and `registeredTools` map
- `ToolInfo` extends MCP SDK's `Tool` type with `source_server` and `toolbox_name` metadata
- `OpenToolboxResult` now includes `tools_registered` count instead of full tool list

### The 3 Workbench Meta-Tools

1. **workbench_list_toolboxes** - Lists configured toolboxes (read-only, no connections made)
2. **workbench_open_toolbox** - Connects to all MCP servers in a toolbox, dynamically registers their tools with prefixed names, sends tool list changed notification
3. **workbench_close_toolbox** - Unregisters tools, disconnects all servers in a toolbox, sends tool list changed notification

### Tool Naming Convention

When a toolbox is opened, downstream tools are registered with the format: `{server}_{tool_name}`

**Example:**
- Server name: `filesystem`
- Original tool: `read_file`
- Registered as: `filesystem_read_file`

This prefixing strategy:
- Avoids name conflicts between servers
- Makes tool origin clear
- Provides consistent, predictable naming

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

### Dynamic Tool Registration
When `workbench_open_toolbox` is called:
1. Connects to all downstream MCP servers
2. Queries `tools/list` from each server
3. Registers each tool on workbench server with prefixed name
4. Creates handler that delegates to downstream server via `client.callTool()`
5. Sends `tool list changed` notification to MCP clients

When a registered tool is called:
1. MCP client calls tool by prefixed name (e.g., `filesystem_read_file`)
2. Workbench handler extracts original tool name from metadata
3. Delegates to downstream server: `client.callTool({ name: "read_file", arguments })`
4. Returns downstream response directly

When `workbench_close_toolbox` is called:
1. Calls `.remove()` on each registered tool
2. Disconnects from downstream servers
3. Sends `tool list changed` notification

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

### Adding New Workbench Meta-Tools
1. Define Zod schema in `src/index.ts` for input validation
2. Register tool with `server.registerTool()` in `registerTools()` method
3. Use `this.clientManager` to access opened toolboxes
4. Follow handler signature: `async (args: { [x: string]: any }) => ...`

### Tool Name Conflicts
Tool names are **always prefixed** with server name (`{server}_{tool}`) to ensure:
- No conflicts between servers
- Predictable, consistent naming
- Clear tool origin

If you need different behavior, modify `ClientManager.registerToolsOnServer()` in [src/client-manager.ts](src/client-manager.ts:152).

## TypeScript Notes

- Strict mode enabled in `tsconfig.json`
- Using ES2022 target with Node16 module resolution
- Tool handler type casting: `const params = args as InputType;` due to SDK signature
- Type assertion `as const` used for `type: "text"` to satisfy SDK's discriminated unions
