# Contract: open_toolbox Meta-Tool

**Feature**: 007-structured-tool-names
**Tool Name**: `open_toolbox`
**Type**: Meta-tool (MCP server method)
**Status**: Updated (Breaking Change)

## Purpose

Connect to all MCP servers in a specified toolbox and retrieve the complete list of available tools with their schemas and structured metadata. This is the discovery mechanism for understanding what tools can be invoked via `use_tool`.

## Breaking Changes from v0.10.0

### Response Structure Changes

**Previous Version (v0.10.0)**:
```json
{
  "toolbox": "dev",
  "description": "Development toolbox",
  "servers_connected": 2,
  "tools": [
    {
      "name": "dev__filesystem__read_file",
      "source_server": "filesystem",
      "toolbox_name": "dev",
      "description": "[filesystem] Read a file",
      "inputSchema": { ... }
    }
  ]
}
```

**New Version (v0.11.0)**:
```json
{
  "toolbox": "dev",
  "description": "Development toolbox",
  "servers_connected": 2,
  "tools": [
    {
      "name": "read_file",
      "toolbox_name": "dev",
      "source_server": "filesystem",
      "description": "Read a file",
      "inputSchema": { ... }
    }
  ]
}
```

### Key Changes

1. **`tools[].name` field**:
   - **Old**: Concatenated string (`"dev__filesystem__read_file"`)
   - **New**: Original tool name (`"read_file"`)

2. **`tools[].description` field**:
   - **Old**: Prefixed with server name (`"[filesystem] Read a file"`)
   - **New**: Original description from downstream server (`"Read a file"`)

3. **Field semantics**:
   - `toolbox_name`, `source_server`, and `name` are now separate, clean fields
   - Clients construct `use_tool` parameters directly from these fields

### Migration Guide

**Constructing `use_tool` parameters**:

**Old Approach** (v0.10.0):
```typescript
// Must parse concatenated name
const toolName = "dev__filesystem__read_file";
const parts = toolName.split('__', 3);

await client.callTool({
  name: "use_tool",
  arguments: {
    toolbox_name: parts[0],
    tool_name: toolName,
    arguments: { path: "/file" }
  }
});
```

**New Approach** (v0.11.0):
```typescript
// Direct field mapping from open_toolbox response
const toolInfo = tools[0]; // { name: "read_file", toolbox_name: "dev", source_server: "filesystem" }

await client.callTool({
  name: "use_tool",
  arguments: {
    tool: {
      toolbox: toolInfo.toolbox_name,
      server: toolInfo.source_server,
      tool: toolInfo.name
    },
    arguments: { path: "/file" }
  }
});
```

## Input Schema

### JSON Schema

```json
{
  "type": "object",
  "required": ["toolbox_name"],
  "properties": {
    "toolbox_name": {
      "type": "string",
      "minLength": 1,
      "description": "Name of the toolbox to open"
    }
  },
  "additionalProperties": false
}
```

### TypeScript Type

```typescript
interface OpenToolboxInput {
  toolbox_name: string; // Non-empty string
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toolbox_name` | String | Yes | Name of the toolbox to open (must exist in workbench configuration) |

### Validation Rules

1. **Toolbox name**:
   - MUST be non-empty string
   - MUST match a toolbox defined in `workbench-config.json`
   - Case-sensitive

2. **No extra fields**:
   - Additional properties are rejected

**Note**: Input schema has NOT changed from v0.10.0. The breaking change is in the response structure only.

## Output Schema

### Success Response

```json
{
  "toolbox": "string",
  "description": "string",
  "servers_connected": 0,
  "tools": [
    {
      "name": "string",
      "toolbox_name": "string",
      "source_server": "string",
      "description": "string (optional)",
      "inputSchema": { "type": "object", ... }
    }
  ]
}
```

### TypeScript Type

```typescript
interface OpenToolboxResult {
  /** Name of the opened toolbox */
  toolbox: string;

  /** Description from toolbox configuration */
  description: string;

  /** Number of MCP servers successfully connected */
  servers_connected: number;

  /** Array of available tools with structured metadata */
  tools: ToolInfo[];
}

interface ToolInfo {
  /** Original tool name from downstream MCP server */
  name: string;

  /** Name of the toolbox this tool belongs to */
  toolbox_name: string;

  /** Name of the MCP server that provides this tool */
  source_server: string;

  /** Tool description (if provided by downstream server) */
  description?: string;

  /** JSON Schema for tool input parameters */
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `toolbox` | String | Name of the opened toolbox (matches input `toolbox_name`) |
| `description` | String | Human-readable description from configuration |
| `servers_connected` | Number | Count of successfully connected MCP servers |
| `tools` | Array | List of all available tools from all connected servers |
| `tools[].name` | String | **Original tool name** from downstream server (e.g., `"read_file"`) |
| `tools[].toolbox_name` | String | Toolbox containing this tool (e.g., `"dev"`) |
| `tools[].source_server` | String | MCP server providing this tool (e.g., `"filesystem"`) |
| `tools[].description` | String? | Tool description from downstream server |
| `tools[].inputSchema` | Object | JSON Schema defining tool parameters |

### Tool Ordering

Tools are returned in **server-then-tool order**:
1. Servers are processed in the order they appear in configuration
2. Within each server, tools are in the order returned by the downstream server
3. No alphabetical sorting is applied

## Error Cases

### 1. Toolbox Not Found

**Condition**: `toolbox_name` does not match any configured toolbox

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Toolbox 'production' not found in configuration"
  }],
  "isError": true
}
```

### 2. Connection Failure

**Condition**: One or more servers fail to connect

**Behavior**: Partial success with error context

**Response**:
```json
{
  "toolbox": "dev",
  "description": "Development toolbox",
  "servers_connected": 1,
  "tools": [ /* tools from successful connections */ ],
  "_errors": [
    "Failed to connect to server 'database' in toolbox 'dev': connection timeout"
  ]
}
```

**Note**: If ALL servers fail to connect, return error response instead of partial result.

### 3. Empty Toolbox Name

**Condition**: `toolbox_name` is empty string or whitespace

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Invalid parameters: toolbox_name cannot be empty"
  }],
  "isError": true
}
```

### 4. Extra Fields

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

### Example 1: Open Development Toolbox

**Request**:
```json
{
  "name": "open_toolbox",
  "arguments": {
    "toolbox_name": "dev"
  }
}
```

**Response**:
```json
{
  "toolbox": "dev",
  "description": "Development environment toolbox",
  "servers_connected": 2,
  "tools": [
    {
      "name": "read_file",
      "toolbox_name": "dev",
      "source_server": "filesystem",
      "description": "Read a file from the filesystem",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "File path to read" }
        },
        "required": ["path"]
      }
    },
    {
      "name": "write_file",
      "toolbox_name": "dev",
      "source_server": "filesystem",
      "description": "Write content to a file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["path", "content"]
      }
    },
    {
      "name": "get",
      "toolbox_name": "dev",
      "source_server": "memory",
      "description": "Get a value from memory by key",
      "inputSchema": {
        "type": "object",
        "properties": {
          "key": { "type": "string" }
        },
        "required": ["key"]
      }
    }
  ]
}
```

### Example 2: Idempotent Open

**Request** (second call to same toolbox):
```json
{
  "name": "open_toolbox",
  "arguments": {
    "toolbox_name": "dev"
  }
}
```

**Response**: Identical to first call (cached, no re-connection)

**Behavior**: Toolbox remains open until server shutdown, subsequent calls return cached result immediately

### Example 3: Multiple Servers with Same Tool Name

**Configuration**:
```json
{
  "toolboxes": {
    "dev": {
      "mcpServers": {
        "local-storage": {
          "command": "node",
          "args": ["storage-server.js"]
        },
        "remote-storage": {
          "command": "node",
          "args": ["remote-storage.js"]
        }
      }
    }
  }
}
```

**Response** (both servers provide "upload" tool):
```json
{
  "toolbox": "dev",
  "servers_connected": 2,
  "tools": [
    {
      "name": "upload",
      "toolbox_name": "dev",
      "source_server": "local-storage",
      "description": "Upload to local storage"
    },
    {
      "name": "upload",
      "toolbox_name": "dev",
      "source_server": "remote-storage",
      "description": "Upload to remote storage"
    }
  ]
}
```

**Note**: Tools are distinguished by `source_server` field, no naming conflict.

### Example 4: Constructing use_tool Call from Response

**Step 1**: Open toolbox and receive tool list

**Step 2**: Select a tool from the list
```typescript
const tools = openToolboxResult.tools;
const readFileTool = tools.find(t =>
  t.name === "read_file" && t.source_server === "filesystem"
);
```

**Step 3**: Construct `use_tool` call
```typescript
const useToolArgs = {
  tool: {
    toolbox: readFileTool.toolbox_name,  // "dev"
    server: readFileTool.source_server,   // "filesystem"
    tool: readFileTool.name                // "read_file"
  },
  arguments: {
    path: "/etc/hosts"
  }
};
```

## Implementation Notes

### Connection Management

1. Check if toolbox is already opened (idempotent check)
2. If already open, return cached result immediately
3. If not open:
   - Connect to each server via StdioClientTransport
   - Call `tools/list` on each connected server
   - Apply tool filters from configuration
   - Build ToolInfo array with structured metadata
   - Cache connections and tools
   - Return result

### Tool Metadata Construction

For each tool from downstream server:
```typescript
const toolInfo: ToolInfo = {
  name: downstreamTool.name,           // Original name (no concatenation)
  toolbox_name: toolboxName,           // From configuration
  source_server: serverName,           // From configuration
  description: downstreamTool.description, // Original description (no prefix)
  inputSchema: downstreamTool.inputSchema  // Original schema
};
```

**Breaking change**: Previous versions concatenated toolbox and server names into the `name` field and prefixed descriptions.

### Tool Filters

Apply `toolFilters` from server configuration:
- `["*"]` → Include all tools
- `["tool1", "tool2"]` → Include only specified tools
- Empty array → No tools (effectively disable server)

Filters are applied **per server** before adding to the tools array.

## Testing Scenarios

### Happy Path
- ✅ Open toolbox with single server
- ✅ Open toolbox with multiple servers
- ✅ Open toolbox twice (idempotent)
- ✅ Open multiple different toolboxes

### Tool Discovery
- ✅ Tools from different servers with same name (distinguished by source_server)
- ✅ Tools with optional description field
- ✅ Tools with complex inputSchema
- ✅ Tool filters applied correctly

### Error Cases
- ✅ Non-existent toolbox name
- ✅ Empty toolbox name
- ✅ Extra fields in request
- ✅ Server connection failure (partial success)
- ✅ All servers fail to connect (total failure)

### Edge Cases
- ✅ Toolbox with no servers configured
- ✅ Server with no tools (or all filtered out)
- ✅ Tool names containing special characters (__, -, .)

## Compatibility

**Minimum MCP SDK Version**: 1.6.1

**Client Requirements**:
- Must use separate `toolbox_name`, `source_server`, `name` fields (not concatenated `name`)
- Must construct `use_tool` parameters from these separate fields
- No backward compatibility with v0.10.0 concatenated format

**Server Requirements**:
- Node.js 18+
- TypeScript 5.7.2+
- Zod 3.23.8+

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.11.0 | 2025-10-28 | **BREAKING**: Return original tool names in `tools[].name`, remove description prefixes |
| v0.10.0 | 2025-10-27 | Removed `workbench_` prefix, renamed from `workbench_open_toolbox` |
| v0.9.0 | 2025-10-27 | Previous stable version with concatenated tool names |
