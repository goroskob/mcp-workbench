# MCP Workbench

**MCP Workbench** is a meta-MCP server that aggregates tools from other MCP servers and organizes them into dynamic "toolboxes" for efficient discovery and invocation.

## Overview

Instead of managing connections to multiple MCP servers manually, MCP Workbench allows you to:

1. **Organize tools by domain** - Group related MCP servers into named toolboxes (e.g., "incident-analysis", "gitlab-workflow")
2. **Dynamic discovery** - Open a toolbox to discover all available tools from its servers
3. **Unified invocation** - Call tools through dynamic registration (default) or proxy mode
4. **Efficient resource management** - Open/close toolboxes as needed to manage connections

### Two Invocation Modes

- **Dynamic Mode (default)**: Tools are automatically registered on the workbench server and appear natively in your MCP client's tool list with prefixed names (e.g., `main__clickhouse__list_databases` where `main` is the toolbox name)
- **Proxy Mode**: Tools are accessed via the `workbench_use_tool` meta-tool, designed for MCP clients that don't support dynamic tool registration

### Tool Naming Convention

Tools are named using the pattern: `{toolbox}__{server}__{tool}` (note: consistent double underscores between all components)

**Examples:**
- Toolbox "dev", server "filesystem", tool "read_file" → `dev__filesystem__read_file`
- Toolbox "prod", server "clickhouse", tool "query" → `prod__clickhouse__query`

This naming allows multiple toolboxes to use the same MCP server without conflicts. For example, you can have both "dev" and "prod" toolboxes connecting to a "filesystem" server, and their tools (`dev__filesystem__read_file` vs `prod__filesystem__read_file`) will be uniquely addressable.

## Migration Guide: v0.4.0 → v0.5.0

**⚠️ Breaking Change**: Tool naming format has changed in v0.5.0

### What Changed

The separator between server name and tool name changed from single underscore (`_`) to double underscore (`__`) for consistency.

### Before/After Examples

| Component | Old Format (v0.4.0) | New Format (v0.5.0) |
|-----------|---------------------|---------------------|
| Filesystem read | `dev__filesystem_read_file` | `dev__filesystem__read_file` |
| Memory store | `prod__memory_store_value` | `prod__memory__store_value` |
| Clickhouse query | `main__clickhouse_run_query` | `main__clickhouse__run_query` |

### Migration Checklist

- [ ] **Update all tool invocations** to use double underscore before tool name
- [ ] **Update custom parsing logic** if you parse tool names in your client code
- [ ] **Test all tool calls** with new format to verify functionality
- [ ] **Update documentation** and examples in your codebase

### Example Code Updates

**Before (v0.4.0):**
```javascript
// Direct tool call (dynamic mode)
client.callTool({ name: "dev__filesystem_read_file", arguments: {...} })

// Proxy mode
workbench_use_tool({
  toolbox_name: "dev",
  tool_name: "dev__filesystem_read_file",
  arguments: {...}
})
```

**After (v0.5.0):**
```javascript
// Direct tool call (dynamic mode)
client.callTool({ name: "dev__filesystem__read_file", arguments: {...} })

// Proxy mode
workbench_use_tool({
  toolbox_name: "dev",
  tool_name: "dev__filesystem__read_file",
  arguments: {...}
})
```

### Troubleshooting

**Error**: `"Tool 'dev__filesystem_read_file' not found"`
**Solution**: Update to new format `dev__filesystem__read_file` (add double underscore before tool name)

**Error**: `"Invalid tool name format '...' Expected format: {toolbox}__{server}__{tool}"`
**Solution**: Ensure you're using double underscores (`__`) between all three components

### Configuration Files

**No changes required** to your `workbench-config.json` file! The configuration format remains the same - only the runtime tool names have changed.

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
  "toolMode": "dynamic",
  "toolboxes": {
    "my-toolbox": {
      "description": "Description of what this toolbox is for",
      "mcpServers": {
        "server-name": {
          "command": "node",
          "args": ["path/to/server.js"],
          "env": {
            "API_KEY": "your-key-here"
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

- **toolMode**: Tool invocation mode - `"dynamic"` (default) or `"proxy"` (optional, top-level)
  - **dynamic**: Tools are automatically registered with prefixed names (e.g., `main__clickhouse__list_databases`)
  - **proxy**: Tools are accessed via `workbench_use_tool` meta-tool
- **toolboxes**: Object mapping toolbox names to configurations
  - **description**: Human-readable purpose of the toolbox
  - **mcpServers**: Object mapping server names to MCP server configurations (uses standard MCP schema)
    - **command**: Command to execute the MCP server (required)
    - **args**: Arguments to pass to the command (optional)
    - **env**: Environment variables for the server process (optional)
    - **toolFilters**: Array of tool names to include, or `["*"]` for all tools (optional, workbench extension)
    - **transport**: Transport type - currently only `"stdio"` is supported (optional, defaults to `"stdio"`, workbench extension)

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

The workbench provides 3-4 meta-tools depending on the configured `toolMode`:

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

**In Proxy Mode:**
```typescript
// Input:
{
  "toolbox_name": "incident-analysis"
}

// Output: (returns full tool list with schemas)
{
  "toolbox": "incident-analysis",
  "description": "Tools for analyzing incidents",
  "servers_connected": 2,
  "tools": [
    {
      "name": "incident-analysis__clickhouse__list_databases",  // Toolbox and server prefixed
      "source_server": "clickhouse",
      "toolbox_name": "incident-analysis",
      "description": "[incident-analysis/clickhouse] List available databases",
      "inputSchema": {...},
      "annotations": {...}
    },
    // ... more tools
  ]
}
```

**In Dynamic Mode:**
```typescript
// Input:
{
  "toolbox_name": "incident-analysis"
}

// Output: (tools are registered, returns count)
{
  "toolbox": "incident-analysis",
  "description": "Tools for analyzing incidents",
  "servers_connected": 2,
  "tools_registered": 15,
  "message": "Toolbox opened and tools registered with prefix 'toolboxname__servername__'"
}

// After opening, tools like 'incident-analysis__clickhouse__list_databases' appear
// directly in your MCP client's tool list
```

#### 3. `workbench_use_tool` _(Proxy Mode Only)_

Execute a tool from an opened toolbox. Only available when `toolMode: "proxy"`.

```typescript
// Input:
{
  "toolbox_name": "incident-analysis",
  "tool_name": "incident-analysis__clickhouse__list_databases",  // Toolbox and server prefixed
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
"Successfully closed toolbox 'incident-analysis', unregistered tools, and disconnected from all servers."
```

## Workflow Examples

### Proxy Mode Workflow

```typescript
// 1. List available toolboxes
workbench_list_toolboxes()

// 2. Open the toolbox you need
workbench_open_toolbox({ toolbox_name: "data-analysis" })

// 3. Use tools from the toolbox via workbench_use_tool
workbench_use_tool({
  toolbox_name: "data-analysis",
  tool_name: "data-analysis__postgres__query_database",  // Toolbox and server prefixed
  arguments: { query: "SELECT * FROM users LIMIT 10" }
})

// 4. Close when done
workbench_close_toolbox({ toolbox_name: "data-analysis" })
```

### Dynamic Mode Workflow

```typescript
// 1. List available toolboxes
workbench_list_toolboxes()

// 2. Open the toolbox you need
workbench_open_toolbox({ toolbox_name: "data-analysis" })
// This registers tools like 'data-analysis__postgres__query_database' in your MCP client

// 3. Call tools directly by their registered names
data-analysis__postgres__query_database({ query: "SELECT * FROM users LIMIT 10" })

// 4. Close when done (unregisters tools)
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
│  │  Meta-Tools (3-4 tools):     │   │
│  │  - list_toolboxes            │   │
│  │  - open_toolbox              │   │
│  │  - use_tool (proxy mode)     │   │
│  │  - close_toolbox             │   │
│  │                              │   │
│  │  Dynamic Mode:               │   │
│  │  + Registered downstream     │   │
│  │    tools (toolbox__server__toolname) │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  Client Manager              │   │
│  │  - Connection pooling        │   │
│  │  - Tool discovery            │   │
│  │  - Dynamic registration or   │   │
│  │    request proxying          │   │
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

## Migration Guide

### Upgrading from v0.3.x to v0.4.0+

**Breaking Change**: Tool naming convention has changed to support multiple toolboxes with duplicate servers.

**Before (v0.3.x):**
```
{server}_{tool}
Example: filesystem_read_file
```

**After (v0.4.0+):**
```
{toolbox}__{server}__{tool}
Example: main__filesystem__read_file
```

**What You Need to Update:**

1. **MCP Client Tool Invocations**: Update all tool calls to include the toolbox prefix
   ```typescript
   // Old (v0.3.x)
   workbench_use_tool({
     toolbox_name: "mytools",
     tool_name: "filesystem_read_file",  // ❌ Old format
     arguments: { path: "test.txt" }
   })

   // New (v0.4.0+)
   workbench_use_tool({
     toolbox_name: "mytools",
     tool_name: "mytools__filesystem__read_file",  // ✅ New format
     arguments: { path: "test.txt" }
   })
   ```

2. **Configuration Files**: No changes required! Your `workbench-config.json` format remains the same.

3. **Dynamic Mode**: Tools in your MCP client's tool list will now show with toolbox prefix
   ```
   Before: filesystem_read_file, memory_store
   After:  main__filesystem__read_file, main__memory__store
   ```

**Benefits of the Change:**
- ✅ Multiple toolboxes can now use the same MCP server without conflicts
- ✅ Clear indication of which toolbox a tool belongs to
- ✅ Support for environment-specific toolboxes (dev, staging, prod)

**Example: Duplicate Toolboxes**
```json
{
  "toolboxes": {
    "dev": {
      "description": "Development environment",
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/dev"]
        }
      }
    },
    "prod": {
      "description": "Production environment",
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/var/prod"]
        }
      }
    }
  }
}
```

Tools available:
- `dev__filesystem__read_file` → reads from `/tmp/dev`
- `prod__filesystem__read_file` → reads from `/var/prod`

Both can be used simultaneously without conflicts!

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
- Ensure `toolFilters` includes the tool (or use `["*"]`)

## License

MIT

## Contributing

Contributions welcome! This is a meta-MCP pattern that can be extended with:

- Additional transport types (HTTP, SSE)
- Tool name conflict resolution strategies
- Caching and performance optimizations
- Tool usage analytics
- Dynamic toolbox reconfiguration
