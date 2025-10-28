# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP Workbench is a **meta-MCP server** that aggregates tools from other MCP servers and organizes them into "toolboxes" for discovery and invocation. It acts as an orchestrator that connects to downstream MCP servers and provides two modes of operation:

- **Dynamic mode** (default): Tools are dynamically registered on the workbench server with prefixed names, appearing natively in the MCP client's tool list
- **Proxy mode**: Tools are accessed via a `use_tool` meta-tool, designed for MCP clients that don't support dynamic tool registration

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

### Versioning Policy

**Pre-1.0.0 (Incubation Stage)**: This project is in incubation and uses **relaxed semver** (versions < 1.0.0):

- **Breaking changes permitted in any release** - major, minor, or patch versions
- **No migration guides required** during incubation
- **No backward compatibility guarantees** between releases
- **Fast iteration prioritized** - exploring optimal designs without legacy burden
- **Version increments are advisory**:
  - 0.x.0 → 0.y.0: Significant architectural changes or major feature sets
  - 0.x.y → 0.x.z: New features, enhancements, or minor breaking changes
  - 0.x.y → 0.x.y+1: Bug fixes, documentation updates, small refinements

**Post-1.0.0 (Production)**: Once graduated from incubation, strict semver will apply:
- Breaking changes ONLY in major versions
- Migration guides REQUIRED for all breaking changes
- Backward compatibility MAINTAINED within major version series
- Deprecation warnings REQUIRED before breaking changes

The project will NOT graduate to 1.0.0 until core patterns are stable and validated by production usage.

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

The workbench acts as both an **MCP server** (exposes 2-3 meta-tools depending on mode) and an **MCP client** (connects to downstream servers).

### Tool Invocation Modes

The workbench supports two modes for invoking downstream tools, controlled by the `toolMode` configuration field:

#### Proxy-Only Mode (default, `toolMode: "dynamic"`)
When a toolbox is opened, downstream tools are **dynamically registered** on the workbench server with prefixed names (`{toolbox}__{server}__{tool}`). This means:
- Tools appear natively in the MCP client's tool list
- No proxy layer needed - tools are called directly by name
- Better IDE integration and discoverability
- `open_toolbox` returns a count of registered tools
- Toolboxes remain open until server shutdown (automatic cleanup)
- **Workbench exposes 2 meta-tools**: `workbench_list_toolboxes`, `open_toolbox`

#### Proxy-Only Mode (`toolMode: "proxy"`)
When a toolbox is opened, tool information is returned but tools are **not dynamically registered**. Instead:
- Tools are invoked via the `use_tool` meta-tool
- MCP client explicitly specifies toolbox name, tool name, and arguments
- Designed for MCP clients that don't support dynamic tool registration
- `open_toolbox` returns full tool list with schemas
- Toolboxes remain open until server shutdown (automatic cleanup)
- **Workbench exposes 3 meta-tools**: `workbench_list_toolboxes`, `open_toolbox`, `use_tool`

**Tool naming is consistent in both modes**: Tools are always identified with the `{toolbox}__{server}__{tool}` prefix to avoid conflicts.

### Core Components

**src/index.ts** - Main MCP server
- Implements 2-3 workbench meta-tools (2 in proxy-only mode, 3 in proxy-only mode): `list_toolboxes`, `open_toolbox`, and `use_tool` (proxy-only mode only)
- Manages server lifecycle (initialization, automatic cleanup on SIGINT/SIGTERM)
- Loads configuration via `config-loader.ts`
- Sends `tool list changed` notifications when toolboxes open

**src/client-manager.ts** - MCP client connection pool and tool registry
- Opens/closes connections to downstream MCP servers as MCP clients
- Queries `tools/list` from each server during toolbox open
- **Dynamically registers** downstream tools on the workbench server with prefixed names
- **Delegates** tool calls to appropriate downstream server via registered handlers
- Maintains runtime state of opened toolboxes with their connections and registered tools
- Key methods:
  - `connectToServer()` creates `StdioClientTransport` for each downstream server
  - `registerToolsOnServer()` registers downstream tools with `{toolbox}__{server}__{tool}` prefix
  - `unregisterToolsFromServer()` removes tools when toolbox closes

**src/config-loader.ts** - Configuration validator
- Loads `workbench-config.json` (path from `WORKBENCH_CONFIG` env var)
- Expands environment variables before validation using `env-expander.ts`
- Validates toolbox structure at startup
- Each toolbox contains an `mcpServers` object using standard MCP schema
- Wraps expansion errors with configuration file context

**src/env-expander.ts** - Environment variable expansion
- Implements `${VAR}` and `${VAR:-default}` syntax matching Claude Code
- Recursively expands variables in all configuration fields (command, args, env, etc.)
- Validates POSIX-compliant variable names: `[A-Z_][A-Z0-9_]*`
- Throws `EnvExpansionError` with variable name, JSON path, and resolution guidance
- Pattern: `/\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g`
- Key functions:
  - `expandString()` replaces `${VAR}` patterns in a single string
  - `expandEnvVars()` recursively processes strings, objects, arrays, primitives
  - `EnvExpansionError` provides structured error info with location and help text
- Edge cases handled: unclosed braces, invalid names, empty strings, multi-line values
- Backward compatible: configs without `${...}` patterns work unchanged

**src/types.ts** - TypeScript type system
- `WorkbenchConfig` - Configuration schema with optional `toolMode` field and `toolboxes` map
- `ToolboxConfig`, `McpServerConfig`, `WorkbenchServerConfig` - Define toolbox and server configurations
- `ServerConnection` - Tracks MCP client instances, transports, and cached tools
- `OpenedToolbox` - Represents runtime state with connections and `registeredTools` map (proxy-only mode only)
- `ToolInfo` - Extends MCP SDK's `Tool` type with `source_server`, `toolbox_name`, and `original_name` metadata
- `OpenToolboxResult` - Return type varies by mode:
  - **Proxy mode**: Contains full `tools: ToolInfo[]` array with schemas
  - **Dynamic mode**: Contains `tools_registered: number` count (tools are registered, not returned)

### The Workbench Meta-Tools

The workbench exposes 1-2 meta-tools depending on the configured `toolMode`:

**Toolbox Discovery:**
- Toolbox listing is provided via the `instructions` field in the MCP initialization response
- Shows all configured toolboxes with names, descriptions, and server counts
- Available immediately on connection without additional tool calls

**Always Available (Both Modes):**
1. **open_toolbox** - Connects to all MCP servers in a toolbox (idempotent - safe to call multiple times)
   - **Dynamic mode**: Registers tools with prefixed names, sends tool list changed notification, returns tools_registered count
   - **Proxy mode**: Returns full tool list with schemas for use with `use_tool`
   - Toolboxes remain open until server shutdown with automatic cleanup

**Proxy-Only Mode Only:**
2. **use_tool** - Executes a tool from an opened toolbox by delegating to the downstream server (only registered when `toolMode: "proxy"`)

### Tool Identification (Structured Format)

Tools are identified using structured objects with three required fields:

```typescript
{
  toolbox: string;  // Toolbox containing this tool
  server: string;   // MCP server providing this tool
  tool: string;     // Original tool name
}
```

**Example:**
- Toolbox name: `dev`
- Server name: `filesystem`
- Original tool: `read_file`
- Structured identifier: `{ toolbox: "dev", server: "filesystem", tool: "read_file" }`

**Benefits of Structured Format:**
- Eliminates parsing ambiguity (no string splitting on `__`)
- Handles special characters in tool names without issues
- Makes tool origin explicit (separate toolbox/server fields)
- Enables multiple instances of the same server in different toolboxes
- Provides type-safe tool identification with validation

**Breaking Change from v0.10.0**: Previously used concatenated strings (`{toolbox}__{server}__{tool}`), now uses structured objects throughout the codebase.

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
  - **proxy**: Tools are accessed via `use_tool` meta-tool (for clients without dynamic registration support)
- **toolbox_name**: Used as identifier in tool calls
- **mcpServers**: Uses the **standard MCP configuration schema** (compatible with Claude Desktop/.claude.json)
  - Keys are server names (unique identifiers, used as tool name prefix)
  - Values follow the standard MCP server config: `command`, `args`, `env`
- **Workbench-specific extensions**:
  - **toolFilters**: `["*"]` = all tools, or specify exact tool names to include
  - **transport**: Currently only `"stdio"` is implemented (HTTP/SSE planned)

The `mcpServers` format matches the standard used by Claude Desktop and other MCP clients, making it easy to copy server configurations between tools.

**Environment Variable Expansion Flow:**
1. **Load**: Read raw JSON from `workbench-config.json`
2. **Parse**: Parse JSON to JavaScript object
3. **Expand**: Recursively expand `${VAR}` and `${VAR:-default}` patterns in all fields
   - Pattern: `/\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}/g`
   - For required vars (`${VAR}`): Use `process.env[VAR]` or throw `EnvExpansionError`
   - For optional vars (`${VAR:-default}`): Use `process.env[VAR]` or default value
   - Empty string (`process.env[VAR] === ""`) is valid, distinct from unset
4. **Validate**: Run Zod schema validation on expanded configuration
5. **Use**: Pass validated config to workbench server

**Example with expansion:**
```json
{
  "toolboxes": {
    "prod": {
      "mcpServers": {
        "api": {
          "command": "${HOME}/tools/npx",
          "args": ["-y", "api-server", "${DATABASE_URL}"],
          "env": {
            "API_KEY": "${API_KEY}",
            "LOG_LEVEL": "${LOG_LEVEL:-info}"
          }
        }
      }
    }
  }
}
```

With environment variables:
```bash
export HOME="/Users/dev"
export DATABASE_URL="postgresql://localhost/db"
export API_KEY="secret123"
# LOG_LEVEL unset, will use default "info"
```

Becomes (after expansion):
```json
{
  "toolboxes": {
    "prod": {
      "mcpServers": {
        "api": {
          "command": "/Users/dev/tools/npx",
          "args": ["-y", "api-server", "postgresql://localhost/db"],
          "env": {
            "API_KEY": "secret123",
            "LOG_LEVEL": "info"
          }
        }
      }
    }
  }
}
```

## Key Design Patterns

### Initialization Instructions Pattern
Toolbox discovery is integrated into the MCP initialization handshake via the `instructions` field:

**On Server Construction**:
1. `generateToolboxInstructions()` method creates plain text listing
2. Reads toolbox names, descriptions, and server counts from configuration
3. Handles empty configuration gracefully with helpful message
4. Instructions passed to McpServer constructor via `ServerOptions.instructions`
5. SDK automatically includes instructions in initialization response

**Format**:
- Plain text with structured sections
- Lists toolbox name, server count, description
- Includes usage guidance for `open_toolbox`
- No dynamic updates (clients must reconnect to see config changes)

**Benefits**:
- Eliminates extra round-trip for toolbox discovery
- Follows standard MCP initialization pattern
- Available immediately on connection
- No additional tool calls needed

### Lazy Connection Management
Connections are **not** created at server startup. They're created when `open_toolbox` is called, allowing:
- Multiple toolboxes can be open simultaneously
- Idempotent opens (safe to call multiple times on same toolbox)
- Toolboxes remain open until server shutdown with automatic cleanup

### Tool Registration and Invocation Patterns

#### Proxy-Only Mode (Default)
When `open_toolbox` is called:
1. Checks if toolbox already open (idempotent - returns immediately if yes)
2. Connects to all downstream MCP servers
3. Queries `tools/list` from each server
4. Registers each tool on workbench server with prefixed name (`{toolbox}__{server}__{tool}`)
5. Creates handler that delegates to downstream server via `client.callTool()`
6. Sends `tool list changed` notification to MCP clients
7. Returns `tools_registered` count
8. Toolbox remains open until server shutdown

When a registered tool is called:
1. MCP client calls tool by prefixed name (e.g., `main__filesystem__read_file`)
2. Workbench handler parses tool name to extract toolbox, server, and original tool name
3. Dynamically looks up the toolbox and server connection
4. Delegates to downstream server: `client.callTool({ name: "read_file", arguments })`
5. Returns downstream response directly

When server shuts down (SIGINT/SIGTERM):
1. Calls `closeAllToolboxes()` to clean up all open toolboxes
2. For each toolbox: calls `.remove()` on each registered tool
3. Disconnects from all downstream servers
4. Process exits cleanly within 5 seconds

#### Proxy-Only Mode
When `open_toolbox` is called:
1. Checks if toolbox already open (idempotent - returns immediately if yes)
2. Connects to all downstream MCP servers
3. Queries `tools/list` from each server
4. Returns full tool list with schemas and metadata (no registration)
5. Tools are prefixed with server name in the returned list
6. Toolbox remains open until server shutdown

When `use_tool` is called:
1. MCP client specifies `toolbox_name`, `tool_name` (prefixed), and `arguments`
2. Workbench finds the appropriate server connection and original tool name
3. Delegates to downstream server: `client.callTool({ name: original_name, arguments })`
4. Returns downstream response directly

When server shuts down (SIGINT/SIGTERM):
1. Calls `closeAllToolboxes()` to clean up all open toolboxes
2. Disconnects from all downstream servers
3. Process exits cleanly within 5 seconds

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
Tool names are **always prefixed** with toolbox and server name (`{toolbox}__{server}__{tool}`) in both modes to ensure:
- No conflicts between toolboxes with duplicate servers
- No conflicts between servers within a toolbox
- Predictable, consistent naming
- Clear tool origin (both toolbox and server)

**Implementation Details:**
- Tool name generation uses `ClientManager.generateToolName(toolbox, server, tool)` utility method
- Tool name parsing uses `ClientManager.parseToolName(registeredName)` to extract components
- Format uses double underscore `__` consistently between all components (toolbox, server, and tool)

**In proxy-only mode**, prefixing happens during registration via `ClientManager.registerToolsOnServer()`. Each tool is registered with a handler that:
1. Parses the registered tool name to extract toolbox, server, and original tool name
2. Dynamically looks up the toolbox and server connection at invocation time
3. Delegates to the downstream server using the original tool name

**In proxy-only mode**, prefixing happens when building the tool list via `ClientManager.getToolsFromConnections()`.

If you need different behavior, modify the `generateToolName()` and `parseToolName()` methods in [src/client-manager.ts](src/client-manager.ts).

## TypeScript Notes

- Strict mode enabled in `tsconfig.json`
- Using ES2022 target with Node16 module resolution
- Tool handler type casting: `const params = args as InputType;` due to SDK signature
- Type assertion `as const` used for `type: "text"` to satisfy SDK's discriminated unions

## Active Technologies
- TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation (001-duplicate-tools-support)
- In-memory state management (no persistent storage required) (001-duplicate-tools-support)
- TypeScript 5.7.2, Node.js 18+ runtime + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation (003-env-var-expansion)
- N/A (configuration is file-based JSON, no persistent storage) (003-env-var-expansion)
- TypeScript 5.7.2, Node.js 18+ + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 (004-remove-manual-close)
- N/A (in-memory state management only) (004-remove-manual-close)
- TypeScript 5.7.2 with ES2022 target, Node.js 18+ + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 (006-remove-dynamic-mode)
- TypeScript 5.7.2 with ES2022 target, Node.js 18+ + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 (validation) (007-structured-tool-names)

## Recent Changes
- 001-duplicate-tools-support: Added TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime + @modelcontextprotocol/sdk ^1.6.1, zod ^3.23.8 for validation
