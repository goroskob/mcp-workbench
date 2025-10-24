# MCP Workbench

**MCP Workbench** is a meta-MCP server that aggregates tools from other MCP servers and organizes them into dynamic "toolboxes" for efficient discovery and invocation.

## Overview

Instead of managing connections to multiple MCP servers manually, MCP Workbench allows you to:

1. **Organize tools by domain** - Group related MCP servers into named toolboxes (e.g., "incident-analysis", "gitlab-workflow")
2. **Dynamic discovery** - Open a toolbox to discover all available tools from its servers
3. **Unified invocation** - Call tools through a single interface that proxies to the appropriate server
4. **Efficient resource management** - Open/close toolboxes as needed to manage connections

## Installation

### Option 1: No Installation Required (Use with npx)

You can use `npx` to run mcp-workbench directly from GitHub without manual installation:

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "npx",
      "args": ["-y", "github:goroskob/mcp-workbench#v0.0.2"],
      "env": {
        "WORKBENCH_CONFIG": "/absolute/path/to/workbench-config.json"
      }
    }
  }
}
```

The `-y` flag tells npx to automatically install without prompting. The first run will download and cache the package, subsequent runs will use the cached version.

### Option 2: Install Globally

```bash
npm install -g github:goroskob/mcp-workbench#v0.0.2
```

Then use in Claude Desktop config:

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

### Option 3: From Source (For Development)

```bash
git clone https://github.com/goroskob/mcp-workbench.git
cd mcp-workbench
npm install
npm run build
```

## Configuration

Create a `workbench-config.json` file:

```json
{
  "toolboxes": {
    "my-toolbox": {
      "description": "Description of what this toolbox is for",
      "mcp_servers": [
        {
          "name": "server-name",
          "command": "node",
          "args": ["path/to/server.js"],
          "env": {
            "API_KEY": "your-key-here"
          },
          "tool_filters": ["*"],
          "transport": "stdio"
        }
      ]
    }
  }
}
```

### Configuration Options

- **toolboxes**: Object mapping toolbox names to configurations
  - **description**: Human-readable purpose of the toolbox
  - **mcp_servers**: Array of MCP server configurations
    - **name**: Unique identifier for this server
    - **command**: Command to execute the MCP server
    - **args**: Arguments to pass to the command
    - **env**: Environment variables for the server process
    - **tool_filters**: Array of tool names to include, or `["*"]` for all tools
    - **transport**: Transport type (currently only `"stdio"` is supported)

## Usage

### Start the Server

```bash
# Set config path (or use default ./workbench-config.json)
export WORKBENCH_CONFIG=/path/to/workbench-config.json

# Run the server
npm start
```

### Use with Claude Desktop

Add to your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Using npx (recommended - no manual installation):**

```json
{
  "mcpServers": {
    "mcp-workbench": {
      "command": "npx",
      "args": ["-y", "github:goroskob/mcp-workbench#v0.0.2"],
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

**Or from local installation:**

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
- After updating the configuration, restart Claude Desktop

### Available Tools

The workbench provides four main tools:

#### 1. `workbench_list_toolboxes`

List all available toolboxes and their status.

```typescript
// Input: (no parameters)
// Output:
{
  "toolboxes": [
    {
      "name": "incident-analysis",
      "description": "Tools for analyzing incidents",
      "tool_count": 15,
      "is_open": false
    }
  ],
  "total_count": 3,
  "open_count": 0
}
```

#### 2. `workbench_open_toolbox`

Open a toolbox and discover its tools.

```typescript
// Input:
{
  "toolbox_name": "incident-analysis"
}

// Output:
{
  "toolbox": "incident-analysis",
  "description": "Tools for analyzing incidents",
  "servers_connected": 2,
  "tools": [
    {
      "name": "list_databases",
      "source_server": "clickhouse",
      "description": "List available databases",
      "inputSchema": {...},
      "annotations": {...}
    },
    // ... more tools
  ]
}
```

#### 3. `workbench_use_tool`

Execute a tool from an opened toolbox.

```typescript
// Input:
{
  "toolbox_name": "incident-analysis",
  "tool_name": "list_databases",
  "arguments": {
    // tool-specific arguments
  }
}

// Output: (tool's direct response)
```

#### 4. `workbench_close_toolbox`

Close a toolbox and disconnect from its servers.

```typescript
// Input:
{
  "toolbox_name": "incident-analysis"
}

// Output:
"Successfully closed toolbox 'incident-analysis' and disconnected from all servers."
```

## Workflow Example

```typescript
// 1. List available toolboxes
workbench_list_toolboxes()

// 2. Open the toolbox you need
workbench_open_toolbox({ toolbox_name: "data-analysis" })

// 3. Use tools from the toolbox
workbench_use_tool({
  toolbox_name: "data-analysis",
  tool_name: "query_database",
  arguments: { query: "SELECT * FROM users LIMIT 10" }
})

// 4. Close when done
workbench_close_toolbox({ toolbox_name: "data-analysis" })
```

## Use Cases

### Skill-Specific Tool Sets

Create toolboxes for specific Claude skills or sub-agents:

```json
{
  "toolboxes": {
    "incident-response": {
      "description": "Tools for incident analysis and response",
      "mcp_servers": [
        {"name": "clickhouse-logs", ...},
        {"name": "prometheus-metrics", ...},
        {"name": "pagerduty", ...}
      ]
    },
    "code-review": {
      "description": "Tools for code review workflows",
      "mcp_servers": [
        {"name": "gitlab", ...},
        {"name": "sonarqube", ...}
      ]
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
      "mcp_servers": [
        {"name": "prod-db", ...},
        {"name": "prod-metrics", ...}
      ]
    },
    "staging": {
      "description": "Staging environment tools",
      "mcp_servers": [
        {"name": "staging-db", ...},
        {"name": "staging-metrics", ...}
      ]
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
│  │  4 Workbench Tools:          │   │
│  │  - list_toolboxes            │   │
│  │  - open_toolbox              │   │
│  │  - use_tool                  │   │
│  │  - close_toolbox             │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  Client Manager              │   │
│  │  - Connection pooling        │   │
│  │  - Tool discovery            │   │
│  │  - Request proxying          │   │
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

## Troubleshooting

### "Failed to connect to MCP server"

- Verify the command and args are correct
- Check that required environment variables are set
- Ensure the MCP server is installed and accessible

### "Toolbox not found"

- Check that the toolbox name matches the configuration
- Use `workbench_list_toolboxes` to see available toolboxes

### "Tool not found in toolbox"

- Verify the toolbox is opened with `workbench_open_toolbox`
- Check the tool name from the open toolbox response
- Ensure tool_filters include the tool (or use `["*"]`)

## License

MIT

## Contributing

Contributions welcome! This is a meta-MCP pattern that can be extended with:

- Additional transport types (HTTP, SSE)
- Tool name conflict resolution strategies
- Caching and performance optimizations
- Tool usage analytics
- Dynamic toolbox reconfiguration
