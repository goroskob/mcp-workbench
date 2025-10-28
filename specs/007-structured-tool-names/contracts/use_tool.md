# Contract: use_tool Meta-Tool

**Feature**: 007-structured-tool-names
**Tool Name**: `use_tool`
**Type**: Meta-tool (MCP server method)
**Status**: Updated (Breaking Change)

## Purpose

Execute a tool from an opened toolbox by delegating to the appropriate downstream MCP server. This is the primary method for invoking downstream tools in the MCP Workbench.

## Breaking Changes from v0.10.0

### Previous Version (v0.10.0)

```json
{
  "name": "use_tool",
  "arguments": {
    "toolbox_name": "dev",
    "tool_name": "dev__filesystem__read_file",
    "arguments": {
      "path": "/path/to/file"
    }
  }
}
```

### New Version (v0.11.0)

```json
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "dev",
      "server": "filesystem",
      "tool": "read_file"
    },
    "arguments": {
      "path": "/path/to/file"
    }
  }
}
```

### Migration Guide

**Old Format** → **New Format**:
- `toolbox_name` field → `tool.toolbox` field
- `tool_name` concatenated string → `tool.server` + `tool.tool` structured fields
- `arguments` field → unchanged

**Example Migration**:

```diff
  {
    "name": "use_tool",
    "arguments": {
-     "toolbox_name": "dev",
-     "tool_name": "dev__filesystem__read_file",
+     "tool": {
+       "toolbox": "dev",
+       "server": "filesystem",
+       "tool": "read_file"
+     },
      "arguments": {
        "path": "/path/to/file"
      }
    }
  }
```

## Input Schema

### JSON Schema

```json
{
  "type": "object",
  "required": ["tool"],
  "properties": {
    "tool": {
      "type": "object",
      "required": ["toolbox", "server", "tool"],
      "properties": {
        "toolbox": {
          "type": "string",
          "minLength": 1,
          "description": "Name of the toolbox containing the tool"
        },
        "server": {
          "type": "string",
          "minLength": 1,
          "description": "Name of the MCP server providing the tool"
        },
        "tool": {
          "type": "string",
          "minLength": 1,
          "description": "Name of the tool to invoke (original downstream tool name)"
        }
      },
      "additionalProperties": false,
      "description": "Structured identifier for the tool to invoke"
    },
    "arguments": {
      "type": "object",
      "description": "Arguments to pass to the downstream tool",
      "default": {}
    }
  },
  "additionalProperties": false
}
```

### TypeScript Type

```typescript
interface UseToolInput {
  tool: {
    toolbox: string;   // Non-empty string
    server: string;    // Non-empty string
    tool: string;      // Non-empty string
  };
  arguments?: Record<string, unknown>;
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool` | Object | Yes | Structured tool identifier |
| `tool.toolbox` | String | Yes | Name of the opened toolbox (must be already opened via `open_toolbox`) |
| `tool.server` | String | Yes | Name of the MCP server within the toolbox |
| `tool.tool` | String | Yes | Original tool name from the downstream MCP server |
| `arguments` | Object | No | Arguments to pass to the downstream tool (default: `{}`) |

### Validation Rules

1. **Toolbox name**:
   - MUST be non-empty string
   - MUST match an opened toolbox name
   - Case-sensitive

2. **Server name**:
   - MUST be non-empty string
   - MUST match a server within the specified toolbox
   - Case-sensitive

3. **Tool name**:
   - MUST be non-empty string
   - MUST match a tool provided by the specified server
   - Case-sensitive
   - Should be the original tool name (not concatenated)

4. **Arguments**:
   - MUST be a valid object (if provided)
   - Validated by downstream tool's inputSchema
   - Extra properties handled per downstream tool's schema

5. **No extra fields**:
   - Additional properties in the root object are rejected
   - Additional properties in `tool` object are rejected

## Output Schema

### Success Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Result from downstream tool"
    }
  ],
  "isError": false
}
```

**Note**: The actual response structure depends on the downstream tool's response format. The workbench proxies the response without modification.

### Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message with component context"
    }
  ],
  "isError": true
}
```

## Error Cases

### 1. Toolbox Not Found

**Condition**: `tool.toolbox` does not match any opened toolbox

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Toolbox 'production' not found"
  }],
  "isError": true
}
```

### 2. Server Not Found

**Condition**: `tool.server` does not exist in the specified toolbox

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Server 'database' not found in toolbox 'dev'"
  }],
  "isError": true
}
```

### 3. Tool Not Found

**Condition**: `tool.tool` does not exist in the specified server

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Tool 'delete_all' not found in server 'filesystem' (toolbox 'dev')"
  }],
  "isError": true
}
```

### 4. Invalid Tool Identifier

**Condition**: Any field in `tool` object is empty or missing

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Invalid tool identifier: server cannot be empty"
  }],
  "isError": true
}
```

### 5. Invalid Arguments

**Condition**: Arguments fail validation by downstream tool's schema

**Response**: Proxied from downstream tool, typically includes schema validation errors

### 6. Extra Fields

**Condition**: Additional properties provided in request

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Invalid parameters: Unrecognized key: 'extra_field'"
  }],
  "isError": true
}
```

## Usage Examples

### Example 1: Read File

```json
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "dev",
      "server": "filesystem",
      "tool": "read_file"
    },
    "arguments": {
      "path": "/etc/hosts"
    }
  }
}
```

### Example 2: Memory Get

```json
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "dev",
      "server": "memory",
      "tool": "get"
    },
    "arguments": {
      "key": "user_session"
    }
  }
}
```

### Example 3: Tool with No Arguments

```json
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "staging",
      "server": "status",
      "tool": "health_check"
    }
  }
}
```

### Example 4: Multiple Toolboxes (Same Server, Different Toolboxes)

```json
// Development environment
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "dev",
      "server": "api",
      "tool": "get_users"
    }
  }
}

// Production environment
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "prod",
      "server": "api",
      "tool": "get_users"
    }
  }
}
```

## Implementation Notes

### Tool Routing Logic

1. Parse and validate input using Zod schema
2. Extract `tool.toolbox` and lookup opened toolbox
3. Extract `tool.server` and lookup server connection within toolbox
4. Extract `tool.tool` and find matching tool in server's tool list
5. Delegate to downstream server using original tool name:
   ```typescript
   await connection.client.callTool({
     name: tool.tool,
     arguments: toolArgs
   });
   ```
6. Return downstream response without modification

### Error Context Construction

Each error level provides specific component context:
- **Toolbox level**: Only toolbox name
- **Server level**: Server + toolbox context
- **Tool level**: Tool + server + toolbox context

### Validation Order

1. Schema validation (Zod)
2. Toolbox existence check
3. Server existence check (within toolbox)
4. Tool existence check (within server)
5. Arguments validation (delegated to downstream)

## Testing Scenarios

### Happy Path
- ✅ Invoke tool with valid structured identifier
- ✅ Invoke tool with empty arguments object
- ✅ Invoke tool with no arguments field (defaults to {})
- ✅ Invoke tools from multiple toolboxes
- ✅ Invoke different tools from same server

### Error Cases
- ✅ Invalid toolbox name
- ✅ Invalid server name
- ✅ Invalid tool name
- ✅ Empty string in any field
- ✅ Missing required field
- ✅ Extra fields in tool object
- ✅ Extra fields in root object
- ✅ Invalid arguments (downstream validation)

### Edge Cases
- ✅ Tool name containing special characters (__, -, .)
- ✅ Server name matching tool name
- ✅ Multiple servers with same tool name

## Compatibility

**Minimum MCP SDK Version**: 1.6.1

**Client Requirements**:
- Must construct tool identifiers from `open_toolbox` response
- Must use structured `tool` object (not concatenated strings)
- No backward compatibility with v0.10.0 format

**Server Requirements**:
- Node.js 18+
- TypeScript 5.7.2+
- Zod 3.23.8+

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.11.0 | 2025-10-28 | **BREAKING**: Replaced `toolbox_name` and `tool_name` with structured `tool` object |
| v0.10.0 | 2025-10-27 | Removed `workbench_` prefix, renamed from `workbench_use_tool` |
| v0.9.0 | 2025-10-27 | Previous stable version with concatenated tool names |
