# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP Workbench is a **meta-MCP server** that aggregates tools from other MCP servers and organizes them into "toolboxes" for discovery and invocation. It acts as an orchestrator that connects to downstream MCP servers and provides two modes of operation:

- **Dynamic mode** (default): Tools are dynamically registered on the workbench server with prefixed names, appearing natively in the MCP client's tool list
- **Proxy mode**: Tools are accessed via a `workbench_use_tool` meta-tool, designed for MCP clients that don't support dynamic tool registration

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

The workbench acts as both an **MCP server** (exposes 3-4 meta-tools depending on mode) and an **MCP client** (connects to downstream servers).

### Tool Invocation Modes

The workbench supports two modes for invoking downstream tools, controlled by the `toolMode` configuration field:

#### Dynamic Mode (default, `toolMode: "dynamic"`)
When a toolbox is opened, downstream tools are **dynamically registered** on the workbench server with prefixed names (`{server}_{tool}`). This means:
- Tools appear natively in the MCP client's tool list
- No proxy layer needed - tools are called directly by name
- Better IDE integration and discoverability
- `workbench_open_toolbox` returns a count of registered tools
- **Workbench exposes 3 meta-tools**: `workbench_list_toolboxes`, `workbench_open_toolbox`, `workbench_close_toolbox`

#### Proxy Mode (`toolMode: "proxy"`)
When a toolbox is opened, tool information is returned but tools are **not dynamically registered**. Instead:
- Tools are invoked via the `workbench_use_tool` meta-tool
- MCP client explicitly specifies toolbox name, tool name, and arguments
- Designed for MCP clients that don't support dynamic tool registration
- `workbench_open_toolbox` returns full tool list with schemas
- **Workbench exposes 4 meta-tools**: `workbench_list_toolboxes`, `workbench_open_toolbox`, `workbench_close_toolbox`, `workbench_use_tool`

**Tool naming is consistent in both modes**: Tools are always identified with the `{server}_{tool}` prefix to avoid conflicts.

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
- `WorkbenchConfig` - Configuration schema with optional `toolMode` field and `toolboxes` map
- `ToolboxConfig`, `McpServerConfig`, `WorkbenchServerConfig` - Define toolbox and server configurations
- `ServerConnection` - Tracks MCP client instances, transports, and cached tools
- `OpenedToolbox` - Represents runtime state with connections and `registeredTools` map (dynamic mode only)
- `ToolInfo` - Extends MCP SDK's `Tool` type with `source_server`, `toolbox_name`, and `original_name` metadata
- `OpenToolboxResult` - Return type varies by mode:
  - **Proxy mode**: Contains full `tools: ToolInfo[]` array with schemas
  - **Dynamic mode**: Contains `tools_registered: number` count (tools are registered, not returned)

### The Workbench Meta-Tools

The workbench exposes 3-4 meta-tools depending on the configured `toolMode`:

**Always Available (Both Modes):**
1. **workbench_list_toolboxes** - Lists configured toolboxes (read-only, no connections made)
2. **workbench_open_toolbox** - Connects to all MCP servers in a toolbox
   - **Dynamic mode**: Registers tools with prefixed names, sends tool list changed notification, returns tools_registered count
   - **Proxy mode**: Returns full tool list with schemas for use with `workbench_use_tool`
3. **workbench_close_toolbox** - Disconnects all servers in a toolbox, sends tool list changed notification
   - **Dynamic mode**: Also unregisters all dynamically registered tools

**Proxy Mode Only:**
4. **workbench_use_tool** - Executes a tool from an opened toolbox by delegating to the downstream server (only registered when `toolMode: "proxy"`)

### Tool Naming Convention

When a toolbox is opened, downstream tools are registered with the format: `{toolbox}__{server}__{tool_name}` (note: consistent double underscores between all components)

**Example:**
- Toolbox name: `dev`
- Server name: `filesystem`
- Original tool: `read_file`
- Registered as: `dev__filesystem__read_file`

**Format Details:**
- Double underscore `__` separates all components (toolbox, server, tool)
- Example with multiple toolboxes:
  - `dev__filesystem__read_file` → delegates to dev toolbox's filesystem server
  - `prod__filesystem__read_file` → delegates to prod toolbox's filesystem server

This prefixing strategy:
- Avoids name conflicts between toolboxes with duplicate servers
- Makes tool origin clear (toolbox and server)
- Enables multiple instances of the same server in different toolboxes
- Provides consistent, predictable naming

## Configuration Format

The server requires a `workbench-config.json` file with this structure:

```json
{
  "toolMode": "dynamic",
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
- **toolMode** (optional, top-level): Tool invocation mode - `"dynamic"` (default) or `"proxy"`
  - **dynamic**: Tools are dynamically registered on the workbench server and appear in MCP client's tool list
  - **proxy**: Tools are accessed via `workbench_use_tool` meta-tool (for clients without dynamic registration support)
- **toolbox_name**: Used as identifier in tool calls
- **mcpServers**: Uses the **standard MCP configuration schema** (compatible with Claude Desktop/.claude.json)
  - Keys are server names (unique identifiers, used as tool name prefix)
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

### Tool Registration and Invocation Patterns

#### Dynamic Mode (Default)
When `workbench_open_toolbox` is called:
1. Connects to all downstream MCP servers
2. Queries `tools/list` from each server
3. Registers each tool on workbench server with prefixed name (`{toolbox}__{server}_{tool}`)
4. Creates handler that delegates to downstream server via `client.callTool()`
5. Sends `tool list changed` notification to MCP clients
6. Returns `tools_registered` count

When a registered tool is called:
1. MCP client calls tool by prefixed name (e.g., `main__filesystem__read_file`)
2. Workbench handler parses tool name to extract toolbox, server, and original tool name
3. Dynamically looks up the toolbox and server connection
4. Delegates to downstream server: `client.callTool({ name: "read_file", arguments })`
5. Returns downstream response directly

When `workbench_close_toolbox` is called:
1. Calls `.remove()` on each registered tool
2. Disconnects from downstream servers
3. Sends `tool list changed` notification

#### Proxy Mode
When `workbench_open_toolbox` is called:
1. Connects to all downstream MCP servers
2. Queries `tools/list` from each server
3. Returns full tool list with schemas and metadata (no registration)
4. Tools are prefixed with server name in the returned list

When `workbench_use_tool` is called:
1. MCP client specifies `toolbox_name`, `tool_name` (prefixed), and `arguments`
2. Workbench finds the appropriate server connection and original tool name
3. Delegates to downstream server: `client.callTool({ name: original_name, arguments })`
4. Returns downstream response directly

When `workbench_close_toolbox` is called:
1. Disconnects from downstream servers (no tools to unregister)

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
Tool names are **always prefixed** with toolbox and server name (`{toolbox}__{server}_{tool}`) in both modes to ensure:
- No conflicts between toolboxes with duplicate servers
- No conflicts between servers within a toolbox
- Predictable, consistent naming
- Clear tool origin (both toolbox and server)

**Implementation Details:**
- Tool name generation uses `ClientManager.generateToolName(toolbox, server, tool)` utility method
- Tool name parsing uses `ClientManager.parseToolName(registeredName)` to extract components
- Format uses double underscore `__` between toolbox and server, single underscore `_` between server and tool

**In dynamic mode**, prefixing happens during registration via `ClientManager.registerToolsOnServer()`. Each tool is registered with a handler that:
1. Parses the registered tool name to extract toolbox, server, and original tool name
2. Dynamically looks up the toolbox and server connection at invocation time
3. Delegates to the downstream server using the original tool name

**In proxy mode**, prefixing happens when building the tool list via `ClientManager.getToolsFromConnections()`.

If you need different behavior, modify the `generateToolName()` and `parseToolName()` methods in [src/client-manager.ts](src/client-manager.ts).

## TypeScript Notes

- Strict mode enabled in `tsconfig.json`
- Using ES2022 target with Node16 module resolution
- Tool handler type casting: `const params = args as InputType;` due to SDK signature
- Type assertion `as const` used for `type: "text"` to satisfy SDK's discriminated unions

## Active Technologies
- TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation (001-duplicate-tools-support)
- In-memory state management (no persistent storage required) (001-duplicate-tools-support)

## Recent Changes
- 001-duplicate-tools-support: Added TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation
