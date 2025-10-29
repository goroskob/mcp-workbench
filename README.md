# MCP Workbench

> **⚠️ INCUBATION STAGE**: This project is in active development (pre-1.0.0). Breaking changes may occur in any release. Not recommended for production use until 1.0.0. See [Versioning Policy](#versioning-policy) below.

**MCP Workbench** is a meta-MCP server that aggregates tools from other MCP servers and organizes them into "toolboxes" for efficient discovery and invocation.

## Overview

Instead of managing connections to multiple MCP servers manually, MCP Workbench allows you to:

1. **Organize tools by domain** - Group related MCP servers into named toolboxes (e.g., "incident-analysis", "gitlab-workflow")
2. **Dynamic discovery** - Open a toolbox to discover all available tools from its servers
3. **Structured invocation** - Call tools using explicit `{ toolbox, server, name }` identifiers via the `use_tool` meta-tool
4. **Automatic resource management** - Toolboxes remain open until server shutdown, with automatic cleanup of all connections

### Tool Identification

Tools are identified using structured objects with three components:

```typescript
{
  toolbox: "toolbox-name",    // Which toolbox contains this tool
  server: "server-name",      // Which MCP server provides this tool
  name: "tool-name"           // The tool's original name
}
```

**Examples:**
- Toolbox "dev", server "filesystem", name "read_file"
- Toolbox "prod", server "clickhouse", name "query"

This structured approach allows multiple toolboxes to use the same MCP server without conflicts, and eliminates ambiguity with special characters in tool names.

## Installation

### Option 1: No Installation Required (Use with npx)

You can use `npx` to run mcp-workbench directly without any installation:

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "npx",
      "args": ["-y", "mcp-workbench"],
      "env": {
        "WORKBENCH_CONFIG": "/absolute/path/to/workbench-config.json"
      }
    }
  }
}
```

The `-y` flag tells npx to automatically install without prompting. The first run will download and cache the package, subsequent runs will use the cached version.

### Option 2: Install Globally from npm

```bash
npm install -g mcp-workbench
```

Then use in your MCP client config:

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "mcp-workbench",
      "env": {
        "WORKBENCH_CONFIG": "/absolute/path/to/workbench-config.json"
      }
    }
  }
}
```

### Option 3: Clone and Build Locally

```bash
git clone https://github.com/hlibkoval/mcp-workbench.git
cd mcp-workbench
npm install
npm run build
```

Then use in your MCP client config:

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-workbench/dist/index.js"],
      "env": {
        "WORKBENCH_CONFIG": "/absolute/path/to/workbench-config.json"
      }
    }
  }
}
```

## Configuration

Create a `workbench-config.json` file:

```json
{
  "toolboxes": {
    "my-toolbox": {
      "description": "Description of what this toolbox is for",
      "mcpServers": {
        "server-name": {
          "command": "node",
          "args": ["path/to/server.js"],
          "env": {
            "API_KEY": "${API_KEY}",
            "DATABASE_URL": "${DATABASE_URL}"
          },
          "toolFilters": ["*"],
          "transport": "stdio"
        }
      }
    }
  }
}
```

### Configuration Options

- **toolboxes**: Object mapping toolbox names to configurations
  - **description**: Human-readable purpose of the toolbox
  - **mcpServers**: Object mapping server names to MCP server configurations (uses standard MCP schema)
    - **command**: Command to execute the MCP server (required)
    - **args**: Arguments to pass to the command (optional)
    - **env**: Environment variables for the server process (optional)
    - **toolFilters**: Array of tool names to include, or `["*"]` for all tools (optional, workbench extension)
    - **transport**: Transport type - currently only `"stdio"` is supported (optional, defaults to `"stdio"`, workbench extension)

### Environment Variable Expansion

MCP Workbench supports environment variable expansion in configuration files using `${VAR}` and `${VAR:-default}` syntax. This allows you to:

- **Externalize credentials** - Keep API keys and passwords out of configuration files
- **Share configurations** - Use the same config file across different machines and environments
- **Support multiple environments** - Switch between dev/staging/prod using environment variables

#### Syntax

**Required variables** (no default):
```json
{
  "env": {
    "API_KEY": "${API_KEY}",
    "DATABASE_PASSWORD": "${DATABASE_PASSWORD}"
  }
}
```

**Optional variables** (with defaults):
```json
{
  "env": {
    "LOG_LEVEL": "${LOG_LEVEL:-info}",
    "PORT": "${PORT:-3000}",
    "DEBUG_MODE": "${DEBUG_MODE:-false}"
  }
}
```

#### Where It Works

Environment variable expansion is supported in all configuration fields:
- **command**: `"${HOME}/tools/npx"`
- **args**: `["-y", "server", "${DATABASE_PASSWORD}"]`
- **env**: `{"API_KEY": "${API_KEY}"}`

#### Example: Secure Credentials

**Configuration file** (`workbench-config.json`):
```json
{
  "toolboxes": {
    "production": {
      "description": "Production environment tools",
      "mcpServers": {
        "database": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-database"],
          "env": {
            "DATABASE_URL": "${DATABASE_URL}",
            "API_KEY": "${API_KEY}",
            "LOG_LEVEL": "${LOG_LEVEL:-info}"
          }
        }
      }
    }
  }
}
```

**Environment variables**:
```bash
export API_KEY="your-secret-api-key"
export DATABASE_URL="postgresql://user:pass@localhost/db"
# LOG_LEVEL will use default "info" if not set

export WORKBENCH_CONFIG=./workbench-config.json
npx -y mcp-workbench
```

#### Example: Cross-Platform Paths

**Configuration file**:
```json
{
  "toolboxes": {
    "local-dev": {
      "description": "Local development tools",
      "mcpServers": {
        "filesystem": {
          "command": "${HOME}/tools/npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "${PROJECT_ROOT}/data"]
        }
      }
    }
  }
}
```

**Environment variables**:
```bash
export HOME="/Users/yourname"  # macOS
# or
export HOME="/home/yourname"   # Linux

export PROJECT_ROOT="$(pwd)"
export WORKBENCH_CONFIG=./workbench-config.json
npx -y mcp-workbench
```

#### Example: Multi-Environment Support

**Single configuration file** works for dev, staging, and production:

```json
{
  "toolboxes": {
    "api-tools": {
      "description": "API interaction tools",
      "mcpServers": {
        "api-client": {
          "command": "npx",
          "args": ["-y", "mcp-api-client"],
          "env": {
            "API_ENDPOINT": "${API_ENDPOINT}",
            "AUTH_TOKEN": "${AUTH_TOKEN}",
            "ENVIRONMENT": "${ENVIRONMENT}"
          }
        }
      }
    }
  }
}
```

**Development environment**:
```bash
export API_ENDPOINT="http://localhost:3000/api"
export AUTH_TOKEN="dev_token_123"
export ENVIRONMENT="development"
```

**Production environment**:
```bash
export API_ENDPOINT="https://api.production.com"
export AUTH_TOKEN="prod_token_secure"
export ENVIRONMENT="production"
```

#### Error Handling

If a required variable is missing, you'll get a clear error message:

```
Failed to load configuration from ./workbench-config.json:
Environment variable expansion failed
  Variable: API_KEY
  Location: config.toolboxes.production.mcpServers.database.env.API_KEY
  Reason: Variable is not set

Set the environment variable before starting server:
  export API_KEY=value
```

#### Important Notes

- **Empty strings are valid**: `export VAR=""` uses empty string, `unset VAR` triggers error for required variables
- **POSIX variable names**: Must be uppercase letters, digits, and underscores (e.g., `API_KEY`, `DATABASE_URL`)
- **No nested expansion**: Default values are literal strings, no `${...}` in defaults
- **Backward compatible**: Configurations without `${...}` patterns work unchanged

#### Security Best Practices

- **Never commit credentials** to version control
- **Use environment variables** for all sensitive data (API keys, passwords, tokens)
- **Share configuration files safely** - they contain no secrets when using `${VAR}` syntax
- **Use different variables** for different environments (dev/staging/prod)
- **Document required variables** in your project's README

## Usage

### Start the Server

```bash
# Set config path (or use default ./workbench-config.json)
export WORKBENCH_CONFIG=/path/to/workbench-config.json

# Run the server
npm start
```

### Use with Claude Desktop or Claude Code

Add to your configuration file:
- **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Desktop (Linux)**: `~/.config/Claude/claude_desktop_config.json`
- **Claude Code**: `~/.claude.json`

**Using npx (recommended - no manual installation):**

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "npx",
      "args": ["-y", "mcp-workbench"],
      "env": {
        "WORKBENCH_CONFIG": "/Users/yourname/.config/mcp-workbench/workbench-config.json"
      }
    }
  }
}
```

**Or if installed globally:**

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "mcp-workbench",
      "env": {
        "WORKBENCH_CONFIG": "/Users/yourname/.config/mcp-workbench/workbench-config.json"
      }
    }
  }
}
```

**Or if using local clone:**

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-workbench/dist/index.js"],
      "env": {
        "WORKBENCH_CONFIG": "/Users/yourname/.config/mcp-workbench/workbench-config.json"
      }
    }
  }
}
```

**Important**:
- Use absolute paths for `WORKBENCH_CONFIG`, not relative paths
- Replace `/Users/yourname/` with your actual home directory
- Make sure you've created your `workbench-config.json` file first (see Configuration section)
- After updating the configuration, restart Claude Desktop or Claude Code

### Available Tools

The workbench provides 2 meta-tools for toolbox management and tool invocation:

#### Toolbox Discovery via Initialization

When an MCP client connects to the workbench, the initialization response includes an `instructions` field with a listing of all configured toolboxes:

```
Available Toolboxes:

incident-analysis (2 servers)
  Description: Tools for analyzing incidents

data-processing (3 servers)
  Description: Tools for data transformation

To access tools from a toolbox, use open_toolbox with the toolbox name.
```

This allows clients to discover available toolboxes without making additional tool calls.

#### 1. `open_toolbox`

Open a toolbox and discover its tools.

```typescript
// Input:
{
  "toolbox": "incident-analysis"
}

// Output: (returns full tool list with schemas)
{
  "toolbox": "incident-analysis",
  "description": "Tools for analyzing incidents",
  "servers_connected": 2,
  "tools": [
    {
      "name": "list_databases",               // Original tool name
      "server": "clickhouse",                 // MCP server providing this tool
      "toolbox": "incident-analysis",         // Toolbox containing this tool
      "description": "List available databases",
      "inputSchema": {...},
      "annotations": {...}
    },
    // ... more tools
  ]
}
```

#### 2. `use_tool`

Execute a tool from an opened toolbox using structured tool identifiers.

```typescript
// Input: (using structured tool identifier)
{
  "tool": {
    "toolbox": "incident-analysis",
    "server": "clickhouse",
    "name": "list_databases"
  },
  "arguments": {
    // tool-specific arguments
  }
}

// Output: (tool's direct response)
```

## Workflow Example

```typescript
// 1. Read initialization instructions to see available toolboxes
// (automatically provided during MCP initialization)

// 2. Open the toolbox you need
open_toolbox({ toolbox: "data-analysis" })
// Returns tool list with separate toolbox, server, name fields

// 3. Use tools from the toolbox via use_tool with structured identifiers
use_tool({
  tool: {
    toolbox: "data-analysis",
    server: "postgres",
    name: "query_database"
  },
  arguments: { query: "SELECT * FROM users LIMIT 10" }
})

// Toolboxes remain open until server shutdown - no manual close needed
// All connections are automatically cleaned up when the server terminates
```

## Use Cases

### Skill-Specific Tool Sets

Create toolboxes for specific Claude skills or sub-agents:

```json
{
  "toolboxes": {
    "incident-response": {
      "description": "Tools for incident analysis and response",
      "mcpServers": {
        "clickhouse-logs": {...},
        "prometheus-metrics": {...},
        "pagerduty": {...}
      }
    },
    "code-review": {
      "description": "Tools for code review workflows",
      "mcpServers": {
        "gitlab": {...},
        "sonarqube": {...}
      }
    }
  }
}
```

### Environment-Specific Tools

Organize tools by environment:

```json
{
  "toolboxes": {
    "production": {
      "description": "Production environment monitoring",
      "mcpServers": {
        "prod-db": {...},
        "prod-metrics": {...}
      }
    },
    "staging": {
      "description": "Staging environment tools",
      "mcpServers": {
        "staging-db": {...},
        "staging-metrics": {...}
      }
    }
  }
}
```

## Architecture

```
┌─────────────────────────────────────┐
│      MCP Client (Claude, etc.)      │
└────────────┬────────────────────────┘
             │
             │ stdio/MCP protocol
             │
┌────────────▼────────────────────────┐
│        MCP Workbench Server         │
│  ┌──────────────────────────────┐   │
│  │  Meta-Tools (2 tools):       │   │
│  │  - open_toolbox              │   │
│  │  - use_tool                  │   │
│  │                              │   │
│  │  Tool Invocation:            │   │
│  │  Structured identifiers      │   │
│  │  { toolbox, server, name }   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  Client Manager              │   │
│  │  - Connection pooling        │   │
│  │  - Tool discovery            │   │
│  │  - Request proxying          │   │
│  │  - Automatic cleanup on      │   │
│  │    server shutdown           │   │
│  └──────────────────────────────┘   │
└────────┬────────────┬───────────────┘
         │            │
         │ MCP client connections
         │            │
    ┌────▼───┐   ┌───▼────┐
    │ MCP    │   │ MCP    │
    │Server 1│   │Server 2│
    └────────┘   └────────┘
```

## Development

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

### End-to-End Testing

The project includes comprehensive E2E tests that validate the complete workbench workflow from configuration loading through tool execution and cleanup.

**Running E2E Tests:**

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in watch mode
npm run test:e2e:watch
```

**What's Tested:**
- Complete workflow validation (initialization → open toolbox → execute tools → cleanup)
- Server startup and MCP client connection
- Toolbox opening and tool discovery
- Tool execution via `use_tool` meta-tool
- Proper connection cleanup and resource management

**Test Architecture:**
- Uses Vitest as the test runner
- Tests spawn workbench server via stdio transport
- Uses real downstream MCP servers (@modelcontextprotocol/server-memory)
- All tests complete in under 5 minutes (typically ~400ms)
- Pass/fail output only (no performance metrics)

## Troubleshooting

### "Failed to connect to MCP server"

- Verify the command and args are correct
- Check that required environment variables are set
- Ensure the MCP server is installed and accessible

### "Toolbox not found"

- Check that the toolbox name matches the configuration
- Review initialization instructions to see available toolboxes

### "Tool not found in toolbox"

- Verify the toolbox is opened with `open_toolbox`
- Check the tool name from the open toolbox response
- Ensure `toolFilters` includes the tool (or use `["*"]`)

## Versioning Policy

This project uses **relaxed semantic versioning** while in incubation (versions < 1.0.0):

- **Breaking changes may occur in any release** (major, minor, or patch)
- **No migration guides provided** during incubation
- **No backward compatibility guarantees** between releases
- **Fast iteration prioritized** over stability

**What this means for users:**
- Pin to exact versions in your dependencies: `"mcp-workbench": "0.11.1"` (not `^0.11.1`)
- Review release notes carefully before updating
- Test thoroughly after updates
- Expect API changes, configuration changes, and behavior changes

**After 1.0.0:**
- Strict semantic versioning will be followed
- Breaking changes only in major versions
- Migration guides provided for all breaking changes
- Backward compatibility maintained within major version series

## License

MIT

## Contributing

Contributions welcome! This is a meta-MCP pattern that can be extended with:

- Additional transport types (HTTP, SSE)
- Tool name conflict resolution strategies
- Caching and performance optimizations
- Tool usage analytics
- Dynamic toolbox reconfiguration
