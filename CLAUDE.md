# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP Workbench is a **meta-MCP server** that aggregates tools from other MCP servers and organizes them into "toolboxes" for discovery and invocation. It acts as an orchestrator that connects to downstream MCP servers, providing two meta-tools (`open_toolbox` and `use_tool`) that enable tool discovery and invocation through a proxy pattern.

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

The workbench acts as both an **MCP server** (exposes 2 meta-tools) and an **MCP client** (connects to downstream servers).

### Tool Invocation Pattern

The workbench uses a proxy pattern for tool invocation:
- Tools are discovered via the `open_toolbox` meta-tool, which returns full tool list with schemas
- Tools are invoked via the `use_tool` meta-tool using structured identifiers: `{ toolbox, server, name }`
- Toolboxes remain open until server shutdown (automatic cleanup)

### Core Components

**src/index.ts** - Main MCP server
- Implements 2 workbench meta-tools: `open_toolbox` and `use_tool`
- Manages server lifecycle (initialization, automatic cleanup on SIGINT/SIGTERM)
- Loads configuration via `config-loader.ts`

**src/client-manager.ts** - MCP client connection pool
- Opens/closes connections to downstream MCP servers as MCP clients
- Queries `tools/list` from each server during toolbox open
- Maintains runtime state of opened toolboxes with their connections
- **Delegates** tool calls to appropriate downstream server via `use_tool` meta-tool
- Key methods:
  - `connectToServer()` creates `StdioClientTransport` for each downstream server
  - `openToolbox()` connects to all servers in a toolbox and returns tool list
  - `callTool()` routes tool calls to the appropriate downstream server

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
- `WorkbenchConfig` - Configuration schema with `toolboxes` map
- `ToolboxConfig`, `McpServerConfig`, `WorkbenchServerConfig` - Define toolbox and server configurations
- `ServerConnection` - Tracks MCP client instances, transports, and cached tools
- `OpenedToolbox` - Represents runtime state with connections
- `ToolInfo` - Extends MCP SDK's `Tool` type with `server` and `toolbox` metadata
- `OpenToolboxResult` - Contains full `tools: ToolInfo[]` array with schemas

### The Workbench Meta-Tools

The workbench exposes 2 meta-tools:

**Toolbox Discovery:**
- Toolbox listing is provided via the `instructions` field in the MCP initialization response
- Shows all configured toolboxes with names, descriptions, and server counts
- Available immediately on connection without additional tool calls

**Meta-Tools:**
1. **open_toolbox** - Connects to all MCP servers in a toolbox (idempotent - safe to call multiple times)
   - Returns full tool list with schemas for use with `use_tool`
   - Toolboxes remain open until server shutdown with automatic cleanup

2. **use_tool** - Executes a tool from an opened toolbox by delegating to the downstream server
   - Accepts structured tool identifier: `{ toolbox, server, name }`
   - Routes the call to the appropriate downstream MCP server

### Tool Identification (Structured Format)

Tools are identified using structured objects with three required fields:

```typescript
{
  toolbox: string;  // Toolbox containing this tool
  server: string;   // MCP server providing this tool
  name: string;     // Original tool name
}
```

**Example:**
- Toolbox name: `dev`
- Server name: `filesystem`
- Original tool: `read_file`
- Structured identifier: `{ toolbox: "dev", server: "filesystem", name: "read_file" }`

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
- **toolbox**: Used as identifier in tool calls
- **mcpServers**: Uses the **standard MCP configuration schema** (compatible with Claude Desktop/.claude.json)
  - Keys are server names (unique identifiers, used as tool name prefix)
  - Values follow the standard MCP server config: `command`, `args`, `env`
- **Workbench-specific extensions**:
  - **toolFilters**: `["*"]` = all tools, or specify exact tool names to include
  - **transport**: Currently only `"stdio"` is implemented (HTTP/SSE planned)

The `mcpServers` format matches the standard used by Claude Desktop and other MCP clients, making it easy to copy server configurations between tools. See [MCP Configuration](https://docs.claude.com/en/docs/claude-code/mcp.md) for details.

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
- Static content (clients must reconnect to see config changes)

### Lazy Connection Management
Connections are **not** created at server startup. They're created when `open_toolbox` is called:
- Multiple toolboxes can be open simultaneously
- Idempotent opens (safe to call multiple times on same toolbox)
- Toolboxes remain open until server shutdown with automatic cleanup

### Tool Discovery and Invocation Patterns

#### Opening a Toolbox
When `open_toolbox` is called:
1. Checks if toolbox already open (idempotent - returns immediately if yes)
2. Connects to all downstream MCP servers in the toolbox
3. Queries `tools/list` from each server
4. Returns full tool list with schemas and metadata
5. Toolbox remains open until server shutdown

#### Invoking a Tool
When `use_tool` is called:
1. MCP client specifies structured tool identifier: `{ toolbox, server, name }` plus `arguments`
2. Workbench finds the appropriate server connection using the structured identifier
3. Delegates to downstream server: `client.callTool({ name, arguments })`
4. Returns downstream response directly

#### Server Shutdown
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

The project includes a comprehensive automated E2E test suite built with Vitest:

```bash
# Run all E2E tests (37 tests across 4 scenarios)
npm run test:e2e

# Run specific scenario
npm run test:e2e -- workflow-validation

# Watch mode for development
npm run test:e2e:watch
```

**Test Coverage:**
- **Workflow Validation** (9 tests): Complete workflow from initialization to cleanup
- **Configuration Validation** (10 tests): Env vars, tool filters, multiple toolboxes, invalid configs
- **Error Handling** (12 tests): Invalid tools, bad arguments, server failures, config errors
- **CI Integration** (6 tests): GitHub Actions compatibility and performance validation

**Test Architecture:**
- Real integration tests using `@modelcontextprotocol/server-memory`
- Stdio transport for authentic production-like testing
- Fast execution (~3.5 seconds for full suite)
- Automated via GitHub Actions on all PRs

See [e2e/](e2e/) directory for test implementation and [specs/010-e2e-testing-suite/quickstart.md](specs/010-e2e-testing-suite/quickstart.md) for detailed testing guide.

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

### Tool Identification and Conflicts
Tools are identified using structured objects with `toolbox`, `server`, and `name` fields: `{ toolbox: string, server: string, name: string }`

**Invocation Flow:**
1. MCP client receives tool metadata from `open_toolbox` with separate fields
2. Client constructs `use_tool` call using structured identifier
3. Workbench uses the structured fields to look up the toolbox and server connection
4. Workbench delegates to the downstream server using the original tool name

## TypeScript Notes

- Strict mode enabled in `tsconfig.json`
- Using ES2022 target with Node16 module resolution
- Tool handler type casting: `const params = args as InputType;` due to SDK signature
- Type assertion `as const` used for `type: "text"` to satisfy SDK's discriminated unions

## Active Technologies
- TypeScript 5.7.2 with ES2022 target, Node.js 18+ runtime
- @modelcontextprotocol/sdk ^1.6.1
- zod ^3.23.8 for validation
- In-memory state management (no persistent storage required)
- Vitest 2.1.8 for E2E testing

## End-to-End Testing Architecture

### Overview
The E2E test suite validates the complete workbench workflow using real MCP servers and the stdio transport protocol. Tests are located in `e2e/` at repository root.

### Test Infrastructure

**Directory Structure:**
```
e2e/
├── fixtures/
│   ├── configs/           # Test configuration files
│   ├── downstream-servers/ # Helper functions for test servers
│   └── expected-responses/ # Expected tool schemas
├── helpers/
│   ├── types.ts           # TypeScript type definitions
│   ├── isolation.ts       # Port allocation for parallel tests
│   ├── server-manager.ts  # Temp config file management
│   ├── client-factory.ts  # MCP client wrapper
│   └── assertions.ts      # Custom test assertions
└── scenarios/
    ├── workflow-validation.e2e.ts  # US1: Complete workflow tests
    ├── configuration.e2e.ts        # US2: Configuration validation tests
    ├── error-handling.e2e.ts       # US3: Error handling tests
    └── ci-integration.e2e.ts       # US4: CI/CD integration tests
```

**Core Components:**

1. **MCPTestClientWrapper** (`e2e/helpers/client-factory.ts`):
   - Spawns workbench server via stdio transport
   - Manages client connection lifecycle
   - Provides `openToolbox()` and `useTool()` methods
   - Automatically tracks opened toolboxes

2. **Stdio Transport Pattern**:
   - Tests spawn workbench process using `StdioClientTransport`
   - No separate server process needed
   - Connection lifecycle: `connect()` spawns process, `disconnect()` terminates it
   - Environment variables passed via transport config

3. **Test Isolation**:
   - Uses temporary configuration files (created in `tmpdir()`)
   - Each test suite gets unique config file
   - Port allocation helpers available but not needed for stdio
   - Cleanup failures abort test run (per spec requirements)

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Watch mode
npm run test:e2e:watch

# Configuration
vitest.config.e2e.ts
```

### Test Patterns

**Basic Test Structure:**
```typescript
describe('Feature Test', () => {
  let client: MCPTestClientWrapper;
  let configPath: string;

  beforeAll(async () => {
    // Create temp config
    const config = getMemoryServerConfig();
    configPath = createTempConfig(config, 'test-name');

    // Connect client (spawns server)
    client = new MCPTestClientWrapper();
    await client.connect(configPath);
  });

  afterAll(async () => {
    // Cleanup (terminates server)
    await client.disconnect();
    deleteTempConfig(configPath);
  });

  it('should execute workflow', async () => {
    const tools = await client.openToolbox('test');
    const result = await client.useTool(
      { toolbox: 'test', server: 'memory', name: 'tool_name' },
      { /* args */ }
    );
    expect(result).toBeDefined();
  });
});
```

### Downstream Test Servers

**Currently Used:**
- `@modelcontextprotocol/server-memory` (Knowledge Graph MCP Server)
  - Tools: create_entities, create_relations, search_nodes, etc.
  - Used for workflow validation tests
  - Spawned as downstream server by workbench

**Adding New Test Servers:**
1. Add to `package.json` devDependencies
2. Create helper in `e2e/fixtures/downstream-servers/`
3. Add expected schemas in `e2e/fixtures/expected-responses/`

### Test Execution Characteristics

- **Pass/fail output only** (no performance metrics per spec)
- **Deterministic** (no flaky tests)
- **Fast execution** (~3 seconds for all 37 tests, < 5min max)
- **Cleanup failures abort run** (critical safety requirement)
- **Sequential by default** (parallel execution requires proper isolation)
- **CI/CD integrated** (runs on PRs and pushes to main/develop)

### Adding New Test Scenarios

1. Create test file in `e2e/scenarios/`
2. Use standard test structure (see above)
3. Add to `vitest.config.e2e.ts` if needed
4. Document in `specs/010-e2e-testing-suite/`

## Recent Changes
- 009-align-tool-identifier-name: Renamed `tool` property to `name` in structured tool identifiers to align with MCP SDK naming conventions
- 007-structured-tool-names: Replaced string-based tool naming with structured objects (`{ toolbox, server, name }`)
- 006-remove-dynamic-mode: Removed dynamic mode support, retained proxy-only pattern
- 004-remove-manual-close: Removed manual toolbox closing, implemented automatic cleanup on shutdown
- 003-env-var-expansion: Added environment variable expansion with `${VAR}` and `${VAR:-default}` syntax
- 001-duplicate-tools-support: Added support for duplicate tool names across different toolboxes/servers
