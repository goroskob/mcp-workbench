# Quickstart: Multiple Toolboxes with Duplicate Tools

**Feature**: 001-duplicate-tools-support
**Date**: 2025-10-27

## Overview

This guide demonstrates how to configure and use multiple toolboxes containing duplicate MCP servers, and how to invoke tools using the new `{toolbox}__{server}_{tool}` naming convention.

## Prerequisites

- MCP Workbench installed (version with this feature)
- At least one MCP server available (e.g., `@modelcontextprotocol/server-filesystem`)
- Understanding of basic MCP concepts (servers, tools, toolboxes)

---

## Scenario 1: Development and Production Environments

### Use Case

You want separate toolboxes for "dev" and "prod" environments, both using the filesystem server but pointing to different directories.

### Configuration

Create `workbench-config.json`:

```json
{
  "toolMode": "dynamic",
  "toolboxes": {
    "dev": {
      "description": "Development environment with /tmp/dev filesystem",
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/dev"]
        }
      }
    },
    "prod": {
      "description": "Production environment with /var/prod filesystem",
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

### Usage

**Step 1: Start the workbench**

```bash
export WORKBENCH_CONFIG=./workbench-config.json
npx mcp-workbench
```

**Step 2: List available toolboxes**

```json
// MCP Request
{
  "method": "tools/call",
  "params": {
    "name": "workbench_list_toolboxes",
    "arguments": {}
  }
}

// Response
{
  "content": [{
    "type": "text",
    "text": "{\"toolboxes\":[{\"name\":\"dev\",\"description\":\"Development environment with /tmp/dev filesystem\",\"tool_count\":0,\"is_open\":false},{\"name\":\"prod\",\"description\":\"Production environment with /var/prod filesystem\",\"tool_count\":0,\"is_open\":false}]}"
  }]
}
```

**Step 3: Open the dev toolbox**

```json
// MCP Request
{
  "method": "tools/call",
  "params": {
    "name": "workbench_open_toolbox",
    "arguments": {
      "toolbox_name": "dev"
    }
  }
}

// Response (dynamic mode)
{
  "content": [{
    "type": "text",
    "text": "{\"toolbox\":\"dev\",\"description\":\"Development environment with /tmp/dev filesystem\",\"servers_connected\":1,\"tools_registered\":10}"
  }]
}
```

**Step 4: Open the prod toolbox** (duplicate filesystem server)

```json
// MCP Request
{
  "method": "tools/call",
  "params": {
    "name": "workbench_open_toolbox",
    "arguments": {
      "toolbox_name": "prod"
    }
  }
}

// Response (dynamic mode)
{
  "content": [{
    "type": "text",
    "text": "{\"toolbox\":\"prod\",\"description\":\"Production environment with /var/prod filesystem\",\"servers_connected\":1,\"tools_registered\":10}"
  }]
}
```

**Step 5: Invoke tools from specific toolboxes**

```json
// Read from dev environment
{
  "method": "tools/call",
  "params": {
    "name": "dev__filesystem_read_file",
    "arguments": {
      "path": "test.txt"
    }
  }
}
// Reads from /tmp/dev/test.txt

// Read from prod environment
{
  "method": "tools/call",
  "params": {
    "name": "prod__filesystem_read_file",
    "arguments": {
      "path": "test.txt"
    }
  }
}
// Reads from /var/prod/test.txt
```

**Key Points**:
- Both toolboxes have a "filesystem" server, but they point to different directories
- Tools are uniquely named: `dev__filesystem_read_file` vs. `prod__filesystem_read_file`
- Each toolbox maintains its own independent connection to the filesystem server

---

## Scenario 2: Multiple API Environments

### Use Case

You have staging, canary, and production API servers, all exposing the same tools but pointing to different backend endpoints.

### Configuration

```json
{
  "toolMode": "dynamic",
  "toolboxes": {
    "staging": {
      "description": "Staging API environment",
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["./my-api-server.js"],
          "env": {
            "API_URL": "https://staging.api.example.com",
            "API_KEY": "staging_key_123"
          }
        }
      }
    },
    "canary": {
      "description": "Canary deployment for testing",
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["./my-api-server.js"],
          "env": {
            "API_URL": "https://canary.api.example.com",
            "API_KEY": "canary_key_456"
          }
        }
      }
    },
    "production": {
      "description": "Production API environment",
      "mcpServers": {
        "api": {
          "command": "node",
          "args": ["./my-api-server.js"],
          "env": {
            "API_URL": "https://api.example.com",
            "API_KEY": "prod_key_789"
          }
        }
      }
    }
  }
}
```

### Usage

```bash
# Open all three toolboxes
# (assuming MCP client sends workbench_open_toolbox for each)

# Tools available:
# - staging__api_get_user
# - staging__api_create_order
# - canary__api_get_user
# - canary__api_create_order
# - production__api_get_user
# - production__api_create_order

# Test a feature in staging first
tools/call -> staging__api_create_order { "product_id": "test-123" }

# Verify it works in canary
tools/call -> canary__api_create_order { "product_id": "test-123" }

# Roll out to production
tools/call -> production__api_create_order { "product_id": "real-456" }
```

**Key Points**:
- Same server name ("api") across all three toolboxes
- Different environment variables route to different backend URLs
- Tools are uniquely identifiable by toolbox prefix

---

## Scenario 3: Proxy Mode with Duplicate Tools

### Use Case

Your MCP client doesn't support dynamic tool registration, so you need to use proxy mode.

### Configuration

```json
{
  "toolMode": "proxy",
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

### Usage

**Step 1: Open toolboxes** (same as dynamic mode)

```json
{
  "method": "tools/call",
  "params": {
    "name": "workbench_open_toolbox",
    "arguments": { "toolbox_name": "dev" }
  }
}

// Response (proxy mode) - returns full tool list
{
  "content": [{
    "type": "text",
    "text": "{\"toolbox\":\"dev\",\"description\":\"Development environment\",\"servers_connected\":1,\"tools\":[{\"name\":\"dev__filesystem_read_file\",\"source_server\":\"filesystem\",\"toolbox_name\":\"dev\",\"description\":\"[dev/filesystem] Read a file\",\"inputSchema\":{...}},{\"name\":\"dev__filesystem_write_file\",...}]}"
  }]
}
```

**Step 2: Invoke tools via `workbench_use_tool`**

```json
// Read from dev environment
{
  "method": "tools/call",
  "params": {
    "name": "workbench_use_tool",
    "arguments": {
      "toolbox_name": "dev",
      "tool_name": "dev__filesystem_read_file",
      "arguments": {
        "path": "test.txt"
      }
    }
  }
}

// Read from prod environment
{
  "method": "tools/call",
  "params": {
    "name": "workbench_use_tool",
    "arguments": {
      "toolbox_name": "prod",
      "tool_name": "prod__filesystem_read_file",
      "arguments": {
        "path": "test.txt"
      }
    }
  }
}
```

**Key Points**:
- Tool names use same `{toolbox}__{server}_{tool}` format in proxy mode
- MCP client explicitly specifies `toolbox_name` and `tool_name` in `workbench_use_tool` call
- Tools are not dynamically registered - they're returned in `workbench_open_toolbox` response

---

## Tool Naming Reference

### Format

```
{toolbox}__{server}_{original_tool}
```

### Examples

| Toolbox | Server      | Original Tool   | Registered Name                    |
|---------|-------------|------------------|------------------------------------|
| dev     | filesystem  | read_file        | `dev__filesystem_read_file`        |
| dev     | filesystem  | write_file       | `dev__filesystem_write_file`       |
| prod    | filesystem  | read_file        | `prod__filesystem_read_file`       |
| prod    | filesystem  | write_file       | `prod__filesystem_write_file`      |
| staging | api         | get_user         | `staging__api_get_user`            |
| canary  | api         | get_user         | `canary__api_get_user`             |
| main    | memory      | store_value      | `main__memory_store_value`         |

### Parsing Tool Names

If you need to extract components from a tool name:

```javascript
function parseToolName(registeredName) {
  const [toolbox, serverAndTool] = registeredName.split('__');
  const firstUnderscore = serverAndTool.indexOf('_');
  const server = serverAndTool.substring(0, firstUnderscore);
  const originalTool = serverAndTool.substring(firstUnderscore + 1);

  return { toolbox, server, originalTool };
}

// Example
parseToolName("dev__filesystem_read_file")
// => { toolbox: "dev", server: "filesystem", originalTool: "read_file" }
```

---

## Troubleshooting

### Error: "Tool name contains invalid format"

**Cause**: Toolbox name contains double underscores `__`

**Solution**: Rename your toolbox to avoid `__` characters

```json
// ❌ Invalid
{
  "toolboxes": {
    "dev__v2": { ... }  // Contains __
  }
}

// ✅ Valid
{
  "toolboxes": {
    "dev-v2": { ... }   // Use hyphen instead
  }
}
```

### Error: "Tool not found"

**Cause**: Using old tool name format without toolbox prefix

**Solution**: Include the toolbox prefix in your tool invocation

```json
// ❌ Old format (won't work)
{
  "name": "filesystem_read_file"
}

// ✅ New format (correct)
{
  "name": "dev__filesystem_read_file"
}
```

### Multiple Toolboxes Don't Affect Each Other

**Behavior**: Closing one toolbox doesn't affect tools from duplicate servers in other toolboxes

**Example**:
```bash
# Open dev and prod (both have "filesystem" server)
workbench_open_toolbox { toolbox_name: "dev" }
workbench_open_toolbox { toolbox_name: "prod" }

# Both toolboxes have tools registered:
# - dev__filesystem_read_file
# - prod__filesystem_read_file

# Close dev toolbox
workbench_close_toolbox { toolbox_name: "dev" }

# Result:
# - dev__filesystem_read_file is REMOVED
# - prod__filesystem_read_file is STILL AVAILABLE
```

---

## Migration from Old Version

### Tool Name Changes

If you're upgrading from a version without this feature, your tool names will change:

**Before** (version ≤ 0.3.3):
- Tool names: `filesystem_read_file`, `memory_store`, etc.
- Single toolbox only (or conflicts with duplicates)

**After** (this feature):
- Tool names: `main__filesystem_read_file`, `main__memory_store`, etc.
- Multiple toolboxes supported, including duplicates

### Update MCP Client Tool Invocations

```diff
// Old invocation
{
  "method": "tools/call",
  "params": {
-   "name": "filesystem_read_file",
+   "name": "main__filesystem_read_file",
    "arguments": { "path": "test.txt" }
  }
}
```

### Configuration Files

**Good news**: No configuration changes required! The same `workbench-config.json` format works:

```json
{
  "toolboxes": {
    "main": {
      "description": "Main toolbox",
      "mcpServers": {
        "filesystem": { ... }
      }
    }
  }
}
```

Tools will automatically be registered as `main__filesystem_*` instead of `filesystem_*`.

---

## Best Practices

### 1. Use Descriptive Toolbox Names

```json
// ✅ Good - clear purpose
{
  "toolboxes": {
    "dev": { ... },
    "staging": { ... },
    "prod": { ... }
  }
}

// ❌ Avoid - ambiguous
{
  "toolboxes": {
    "t1": { ... },
    "t2": { ... },
    "t3": { ... }
  }
}
```

### 2. Avoid Special Characters in Toolbox Names

```json
// ✅ Good - alphanumeric and hyphens
{
  "toolboxes": {
    "dev-v2": { ... },
    "staging-us-east": { ... }
  }
}

// ❌ Avoid - special characters
{
  "toolboxes": {
    "dev__v2": { ... },      // Double underscore reserved
    "staging.prod": { ... }, // Dots can be confusing
    "dev/prod": { ... }      // Slashes not recommended
  }
}
```

### 3. Document Toolbox Purposes

Use the `description` field to explain what each toolbox is for:

```json
{
  "toolboxes": {
    "dev": {
      "description": "Development environment - connects to local services and /tmp/dev filesystem",
      "mcpServers": { ... }
    },
    "prod": {
      "description": "Production environment - connects to live services with read-only access",
      "mcpServers": { ... }
    }
  }
}
```

### 4. Organize by Environment or Function

```json
// By environment
{
  "toolboxes": {
    "dev": { ... },
    "staging": { ... },
    "prod": { ... }
  }
}

// By function
{
  "toolboxes": {
    "databases": { "mcpServers": { "postgres": {...}, "redis": {...} } },
    "apis": { "mcpServers": { "rest-api": {...}, "graphql": {...} } },
    "monitoring": { "mcpServers": { "metrics": {...}, "logs": {...} } }
  }
}
```

---

## Next Steps

- Review the [data model documentation](./data-model.md) for implementation details
- Check the [research document](./research.md) for design decisions
- See [plan.md](./plan.md) for the full implementation plan
- Read updated [README.md](../../README.md) and [CLAUDE.md](../../CLAUDE.md) when feature is merged
