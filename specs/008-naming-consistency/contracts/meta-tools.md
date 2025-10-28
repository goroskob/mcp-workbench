# Meta-Tool API Contracts

**Feature**: 008-naming-consistency
**Date**: 2025-10-28

## Overview

This document defines the updated API contracts for MCP Workbench meta-tools after standardizing parameter and field naming. These are the external-facing contracts that MCP clients will use.

---

## `open_toolbox` Meta-Tool

**Purpose**: Connect to all MCP servers in a toolbox and return available tools.

### Request Schema

**Updated** (v0.12.0+):
```json
{
  "toolbox": "string (required, non-empty)"
}
```

**Changed From** (v0.11.1 and earlier):
```json
{
  "toolbox_name": "string"
}
```

**Validation**:
- `toolbox` MUST be a non-empty string
- `toolbox` MUST match a configured toolbox name in workbench configuration
- Invalid or missing toolbox → Error response with available toolboxes list

### Response Schema

**Updated** (v0.12.0+):
```json
{
  "toolbox": "string",
  "description": "string",
  "servers_connected": "number",
  "tools": [
    {
      "name": "string",
      "description": "string",
      "inputSchema": "object",
      "server": "string",
      "toolbox": "string"
    }
  ]
}
```

**Changed From** (v0.11.1 and earlier):
```json
{
  "toolbox": "string",
  "description": "string",
  "servers_connected": "number",
  "tools": [
    {
      "name": "string",
      "description": "string",
      "inputSchema": "object",
      "source_server": "string",
      "toolbox_name": "string"
    }
  ]
}
```

**Field Changes in Tool Objects**:
- `source_server` → `server`
- `toolbox_name` → `toolbox`

### Examples

**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "open_toolbox",
    "arguments": {
      "toolbox": "development"
    }
  }
}
```

**Success Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "toolbox": "development",
        "description": "Development environment tools",
        "servers_connected": 2,
        "tools": [
          {
            "name": "read_file",
            "description": "Read a file from the filesystem",
            "inputSchema": { "type": "object", "properties": { ... } },
            "server": "filesystem",
            "toolbox": "development"
          },
          {
            "name": "store_value",
            "description": "Store a key-value pair",
            "inputSchema": { "type": "object", "properties": { ... } },
            "server": "memory",
            "toolbox": "development"
          }
        ]
      }
    }
  ]
}
```

**Error Response** (toolbox not found):
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Toolbox 'invalid' not found. Available toolboxes: development, production"
    }
  ],
  "isError": true
}
```

---

## `use_tool` Meta-Tool

**Purpose**: Execute a tool from an opened toolbox by delegating to the downstream MCP server.

### Request Schema

**No Changes** (Already uses standardized structure):
```json
{
  "tool": {
    "toolbox": "string (required)",
    "server": "string (required)",
    "tool": "string (required)"
  },
  "arguments": "object (optional)"
}
```

**Validation**:
- `tool.toolbox`, `tool.server`, and `tool.tool` MUST all be non-empty strings
- Toolbox must be opened via `open_toolbox` before calling `use_tool`
- Server must exist in the specified toolbox
- Tool must be available from the specified server

### Response Schema

**No Changes** (Returns downstream tool's response directly):
```json
{
  "content": [
    // Tool-specific response from downstream server
  ]
}
```

Or on error:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message with toolbox/server/tool context"
    }
  ],
  "isError": true
}
```

### Examples

**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "use_tool",
    "arguments": {
      "tool": {
        "toolbox": "development",
        "server": "filesystem",
        "tool": "read_file"
      },
      "arguments": {
        "path": "/Users/dev/project/README.md"
      }
    }
  }
}
```

**Success Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "# Project README\n\nContents of the README file..."
    }
  ]
}
```

**Error Response** (toolbox not opened):
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Toolbox 'development' is not open. Call open_toolbox first."
    }
  ],
  "isError": true
}
```

---

## Initialization Response (Toolbox Discovery)

**Purpose**: Provide toolbox listing in the MCP initialization `instructions` field.

### No Changes Required

The initialization instructions already use "toolbox" terminology and don't reference specific field names that need updating:

```text
## Available Toolboxes

- **development** (2 servers): Development environment tools
  - Use `open_toolbox` with toolbox name to access

- **production** (1 server): Production environment tools
  - Use `open_toolbox` with toolbox name to access

To open a toolbox and see available tools:
1. Call `open_toolbox` with the desired toolbox name
2. Inspect the returned tools array for available operations
```

---

## Breaking Changes Summary

### For MCP Clients (v0.11.1 → v0.12.0)

**`open_toolbox` Parameter Rename**:
```diff
- { "toolbox_name": "development" }
+ { "toolbox": "development" }
```

**Tool Metadata Field Renames**:
```diff
  {
    "name": "read_file",
-   "source_server": "filesystem",
-   "toolbox_name": "development"
+   "server": "filesystem",
+   "toolbox": "development"
  }
```

**No Changes Required**:
- `use_tool` parameters (already uses ToolIdentifier structure)
- Initialization instructions (already uses "toolbox" terminology)
- Tool invocation flow (no structural changes)

---

## TypeScript Client Example

### Before (v0.11.1)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const result = await client.callTool("open_toolbox", {
  toolbox_name: "development"
});

for (const tool of result.tools) {
  console.log(`${tool.name} from ${tool.source_server} in ${tool.toolbox_name}`);
}
```

### After (v0.12.0)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const result = await client.callTool("open_toolbox", {
  toolbox: "development"  // ✓ Updated parameter name
});

for (const tool of result.tools) {
  console.log(`${tool.name} from ${tool.server} in ${tool.toolbox}`);  // ✓ Updated field names
}
```

---

## Validation Rules

### Parameter Validation (Zod Schemas)

**`open_toolbox`**:
```typescript
const OpenToolboxSchema = z.object({
  toolbox: z.string().min(1)
});
```

**`use_tool`**:
```typescript
const ToolIdentifierSchema = z.object({
  toolbox: z.string().min(1),
  server: z.string().min(1),
  tool: z.string().min(1)
});

const UseToolSchema = z.object({
  tool: ToolIdentifierSchema,
  arguments: z.record(z.any()).optional()
});
```

### Error Message Standards

All error messages MUST use standardized names when referencing parameters:
- "Toolbox 'X' not found" (not "Toolbox name 'X'")
- "Error opening toolbox 'X'" (not "Error opening toolbox_name 'X'")
- "Server 'Y' in toolbox 'X'" (not "Source server 'Y'")

---

## Backward Compatibility

**During Incubation** (pre-1.0.0):
- ❌ No backward compatibility provided
- ❌ No deprecation warnings
- ❌ Old parameter names will fail validation
- ✅ Clients must update to new names immediately upon upgrade

**Post-1.0.0** (if still relevant):
- Would require deprecation warnings in previous minor version
- Would require migration guide
- Would require gradual transition with both names supported temporarily

---

## Summary

**API Surface Changes**: 2
- ✅ `open_toolbox` parameter: `toolbox_name` → `toolbox`
- ✅ Tool metadata fields: `source_server` → `server`, `toolbox_name` → `toolbox`

**No Changes Required**: 2
- ✅ `use_tool` parameters (already standardized)
- ✅ Initialization instructions (already uses correct terminology)

**Impact**: Low implementation effort, high clarity benefit. The changes are purely naming updates with no behavioral modifications.
