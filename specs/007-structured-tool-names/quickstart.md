# Quickstart: Structured Tool Names

**Feature**: 007-structured-tool-names
**Version**: 0.11.0
**Date**: 2025-10-28

## Overview

This quickstart guide demonstrates how to use the new structured tool naming format in MCP Workbench v0.11.0. The structured format replaces concatenated tool name strings with explicit objects containing toolbox, server, and tool fields.

## What Changed

### Before (v0.10.0)

```json
// Concatenated string format
{
  "name": "use_tool",
  "arguments": {
    "toolbox_name": "dev",
    "tool_name": "dev__filesystem__read_file",
    "arguments": { "path": "/file" }
  }
}
```

### After (v0.11.0)

```json
// Structured object format
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "dev",
      "server": "filesystem",
      "tool": "read_file"
    },
    "arguments": { "path": "/file" }
  }
}
```

## Basic Workflow

### Step 1: Discover Available Toolboxes

Toolbox information is provided in the initialization `instructions` field when connecting to the workbench:

```text
Available Toolboxes:

dev (2 servers)
  Description: Development environment toolbox

prod (1 server)
  Description: Production environment toolbox

Use `open_toolbox` to connect to a toolbox, then `use_tool` to invoke tools.
```

### Step 2: Open a Toolbox

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
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    },
    {
      "name": "write_file",
      "toolbox_name": "dev",
      "source_server": "filesystem",
      "description": "Write content to a file",
      "inputSchema": { /* ... */ }
    },
    {
      "name": "get",
      "toolbox_name": "dev",
      "source_server": "memory",
      "description": "Get a value from memory",
      "inputSchema": { /* ... */ }
    }
  ]
}
```

**Key Points**:
- Each tool has separate `toolbox_name`, `source_server`, and `name` fields
- No concatenated strings - each component is clearly identified
- `name` field contains the **original tool name** from the downstream server

### Step 3: Invoke a Tool

Use the fields from `open_toolbox` response to construct the `use_tool` call:

```json
{
  "name": "use_tool",
  "arguments": {
    "tool": {
      "toolbox": "dev",        // From tools[].toolbox_name
      "server": "filesystem",   // From tools[].source_server
      "tool": "read_file"       // From tools[].name
    },
    "arguments": {
      "path": "/etc/hosts"
    }
  }
}
```

**Response**: (proxied from downstream filesystem server)
```json
{
  "content": [{
    "type": "text",
    "text": "127.0.0.1 localhost\n..."
  }],
  "isError": false
}
```

## Common Scenarios

### Scenario 1: Working with Multiple Servers

If multiple servers provide tools with the same name, distinguish them using the `source_server` field:

**Tool List**:
```json
{
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

**Invoke Local Upload**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "local-storage",
    "tool": "upload"
  },
  "arguments": { "file": "data.txt" }
}
```

**Invoke Remote Upload**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "remote-storage",
    "tool": "upload"
  },
  "arguments": { "file": "data.txt" }
}
```

### Scenario 2: Multiple Environments (Dev/Prod)

Use different toolboxes for different environments:

**Development Database Query**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "database",
    "tool": "query"
  },
  "arguments": { "sql": "SELECT * FROM users LIMIT 10" }
}
```

**Production Database Query**:
```json
{
  "tool": {
    "toolbox": "prod",
    "server": "database",
    "tool": "query"
  },
  "arguments": { "sql": "SELECT * FROM users LIMIT 10" }
}
```

### Scenario 3: Tool Discovery and Selection

```typescript
// TypeScript/JavaScript example
async function invokeTool(toolbox: string, serverPattern: string, toolName: string) {
  // Step 1: Open toolbox
  const result = await client.callTool({
    name: "open_toolbox",
    arguments: { toolbox_name: toolbox }
  });

  // Step 2: Find matching tool
  const tool = result.tools.find(t =>
    t.name === toolName &&
    t.source_server.includes(serverPattern)
  );

  if (!tool) {
    throw new Error(`Tool ${toolName} not found in server matching ${serverPattern}`);
  }

  // Step 3: Invoke tool with structured identifier
  return await client.callTool({
    name: "use_tool",
    arguments: {
      tool: {
        toolbox: tool.toolbox_name,
        server: tool.source_server,
        tool: tool.name
      },
      arguments: { /* tool-specific args */ }
    }
  });
}

// Usage
await invokeTool("dev", "filesystem", "read_file");
```

## Error Handling

### Invalid Toolbox

```json
// Request
{
  "tool": {
    "toolbox": "staging",  // Not opened
    "server": "api",
    "tool": "get_users"
  }
}

// Response
{
  "content": [{
    "type": "text",
    "text": "Toolbox 'staging' not found"
  }],
  "isError": true
}
```

### Invalid Server

```json
// Request
{
  "tool": {
    "toolbox": "dev",
    "server": "database",  // Not in dev toolbox
    "tool": "query"
  }
}

// Response
{
  "content": [{
    "type": "text",
    "text": "Server 'database' not found in toolbox 'dev'"
  }],
  "isError": true
}
```

### Invalid Tool

```json
// Request
{
  "tool": {
    "toolbox": "dev",
    "server": "filesystem",
    "tool": "delete_all"  // Doesn't exist
  }
}

// Response
{
  "content": [{
    "type": "text",
    "text": "Tool 'delete_all' not found in server 'filesystem' (toolbox 'dev')"
  }],
  "isError": true
}
```

### Empty Field

```json
// Request
{
  "tool": {
    "toolbox": "dev",
    "server": "",  // Empty string
    "tool": "read_file"
  }
}

// Response
{
  "content": [{
    "type": "text",
    "text": "Invalid tool identifier: server cannot be empty"
  }],
  "isError": true
}
```

## Migration from v0.10.0

### Migration Strategy

**Option 1: Update All Calls** (Recommended)
```typescript
// Old code
const toolName = "dev__filesystem__read_file";

await client.callTool({
  name: "use_tool",
  arguments: {
    toolbox_name: "dev",
    tool_name: toolName,
    arguments: { path: "/file" }
  }
});

// New code
await client.callTool({
  name: "use_tool",
  arguments: {
    tool: {
      toolbox: "dev",
      server: "filesystem",
      tool: "read_file"
    },
    arguments: { path: "/file" }
  }
});
```

**Option 2: Build Helper Function**
```typescript
// Helper to construct structured tool identifier
function makeToolId(toolbox: string, server: string, tool: string) {
  return {
    tool: { toolbox, server, tool },
    arguments: {}
  };
}

// Usage
const params = makeToolId("dev", "filesystem", "read_file");
params.arguments = { path: "/file" };

await client.callTool({
  name: "use_tool",
  arguments: params
});
```

### Breaking Changes Checklist

- [ ] Update all `use_tool` calls to use structured `tool` object
- [ ] Update code that parses `open_toolbox` response tool names
- [ ] Remove any string concatenation logic (`${toolbox}__${server}__${tool}`)
- [ ] Remove any string parsing logic (`split('__')`)
- [ ] Update tests to use new format
- [ ] Update documentation and examples

### No Backward Compatibility

**Important**: v0.11.0 does **not** support the old concatenated string format. All clients must upgrade to the new structured format.

## Configuration

The workbench configuration format has **not changed**:

```json
{
  "toolboxes": {
    "dev": {
      "description": "Development toolbox",
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
        },
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"]
        }
      }
    }
  }
}
```

**No configuration changes required** - only API parameter format changed.

## Best Practices

### 1. Always Open Toolbox Before Use

```typescript
// ✅ Good
await client.callTool({ name: "open_toolbox", arguments: { toolbox_name: "dev" } });
await client.callTool({ name: "use_tool", arguments: { tool: { ... } } });

// ❌ Bad - toolbox not opened
await client.callTool({ name: "use_tool", arguments: { tool: { ... } } });
```

### 2. Cache Tool List After Opening

```typescript
// ✅ Good - call once, cache result
const toolbox = await openToolbox("dev");
const tools = toolbox.tools;

// Later, lookup from cache
const tool = tools.find(t => t.name === "read_file");

// ❌ Bad - calling open_toolbox repeatedly
for (const operation of operations) {
  const toolbox = await openToolbox("dev"); // Wasteful
}
```

### 3. Validate Tool Existence Before Invoking

```typescript
// ✅ Good - check if tool exists
const toolExists = tools.some(t =>
  t.name === "read_file" &&
  t.source_server === "filesystem"
);

if (!toolExists) {
  throw new Error("Required tool not available");
}

// ❌ Bad - assume tool exists
await useTool({ toolbox: "dev", server: "filesystem", tool: "read_file" });
```

### 4. Use TypeScript Types

```typescript
// ✅ Good - type-safe
interface ToolIdentifier {
  toolbox: string;
  server: string;
  tool: string;
}

function buildToolCall(id: ToolIdentifier, args: Record<string, unknown>) {
  return {
    name: "use_tool" as const,
    arguments: { tool: id, arguments: args }
  };
}

// ❌ Bad - stringly-typed
function buildToolCall(toolbox: string, server: string, tool: string, args: any) {
  // Easy to mix up parameter order
}
```

## Troubleshooting

### Error: "Toolbox 'X' not found"

**Cause**: Toolbox name misspelled or not configured

**Solution**:
1. Check initialization instructions for available toolboxes
2. Verify toolbox name matches configuration exactly (case-sensitive)
3. Call `open_toolbox` before `use_tool`

### Error: "Server 'X' not found in toolbox 'Y'"

**Cause**: Server name doesn't match configuration

**Solution**:
1. Check `open_toolbox` response for actual server names
2. Verify server name matches `source_server` field exactly
3. Check workbench-config.json for correct server name

### Error: "Tool 'X' not found in server 'Y'"

**Cause**: Tool doesn't exist or was filtered out

**Solution**:
1. Check `open_toolbox` response for available tools
2. Verify tool name matches `name` field exactly (not concatenated name)
3. Check `toolFilters` in configuration - tool may be filtered out

### Tools List is Empty

**Cause**: All tools filtered out or server returned no tools

**Solution**:
1. Check `toolFilters` in configuration - ensure not set to empty array
2. Verify downstream server is functioning correctly
3. Check if server requires environment variables or authentication

## Next Steps

- Read [use_tool.md](contracts/use_tool.md) for complete API reference
- Read [open_toolbox.md](contracts/open_toolbox.md) for discovery details
- Review [data-model.md](data-model.md) for TypeScript type definitions
- See [research.md](research.md) for design rationale

## Version

**MCP Workbench**: 0.11.0
**MCP SDK**: ^1.6.1
**Breaking Change**: Yes - see migration guide above
