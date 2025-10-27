# Data Model: Tool Naming Format Update

**Feature**: Tool Naming Format Update
**Branch**: `002-tool-naming-format`
**Date**: 2025-10-27

## Overview

This document defines the data structures affected by the tool naming format change. Since this is primarily a string format change, the focus is on how tool names are represented, parsed, and validated.

## Core Entities

### Tool Name (String Format)

**Description**: A fully qualified identifier for a tool in the workbench system.

**Format**: `{toolbox}__{server}__{tool}`

**Components**:
- `toolbox`: Name of the toolbox containing the server (alphanumeric, hyphens, underscores)
- `server`: Name of the MCP server providing the tool (alphanumeric, hyphens, underscores)
- `tool`: Original tool name from the downstream server (may contain underscores and other valid characters)

**Separator**: Double underscore (`__`) between all three components

**Examples**:
```
dev__filesystem__read_file
prod__memory__store_value
testing__clickhouse__run_query
main__serena__find_symbol
```

**Validation Rules**:
1. Must contain exactly two double-underscore separators
2. All three components (toolbox, server, tool) must be non-empty
3. Tool component may contain single underscores (e.g., `read_file`)
4. Tool component may contain multiple consecutive underscores (e.g., `my__special__tool` becomes the tool portion)

**Invalid Examples**:
```
dev__filesystem_read_file          # Old format (mixed separators)
dev_filesystem__read_file          # Wrong separator order
__filesystem__read_file            # Missing toolbox
dev____read_file                   # Missing server
dev__filesystem__                  # Missing tool
```

### Parsed Tool Name (TypeScript Interface)

**Description**: The decomposed components of a tool name after parsing.

**TypeScript Definition**:
```typescript
interface ParsedToolName {
  toolbox: string;      // The toolbox name
  server: string;       // The server name
  originalTool: string; // The original tool name (without prefixes)
}
```

**Properties**:
- `toolbox`: First component before first `__`
- `server`: Second component between first and second `__`
- `originalTool`: Third component after second `__` (everything remaining)

**Example Parsing**:
```typescript
Input:  "dev__filesystem__read_file"
Output: { toolbox: "dev", server: "filesystem", originalTool: "read_file" }

Input:  "prod__memory__store_value_async"
Output: { toolbox: "prod", server: "memory", originalTool: "store_value_async" }

Input:  "test__server__tool__with__underscores"
Output: { toolbox: "test", server: "server", originalTool: "tool__with__underscores" }
```

**Null Return**: Parsing returns `null` when:
- Input doesn't contain exactly 2 double underscores as separators
- Any component is empty
- Format is otherwise invalid

### Tool Metadata (Existing Structure - No Changes)

**Description**: Additional metadata stored with registered tools (unchanged by this feature).

**TypeScript Definition** (from `src/types.ts`):
```typescript
interface ToolInfo extends Tool {
  source_server: string;       // Server that provides the tool
  toolbox_name: string;        // Toolbox containing the server
  _meta?: {
    source_server: string;
    toolbox_name: string;
    original_name: string;     // Tool name before prefixing
  };
}
```

**Impact of Naming Change**:
- `name` field: Updated to use new format `{toolbox}__{server}__{tool}`
- `original_name`: Unchanged (stores the unprefixed tool name)
- `source_server`: Unchanged (stores server name)
- `toolbox_name`: Unchanged (stores toolbox name)

## State Transitions

### Tool Name Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Tool Discovery (from downstream MCP server)             │
│    Input: original tool name (e.g., "read_file")           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Tool Name Generation                                     │
│    Combine: toolbox + "__" + server + "__" + originalTool   │
│    Output: "dev__filesystem__read_file"                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Tool Registration (Dynamic Mode) OR                      │
│    Tool List Return (Proxy Mode)                           │
│    Registered/returned name: "dev__filesystem__read_file"   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Tool Invocation (client calls tool)                      │
│    Input: "dev__filesystem__read_file"                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Tool Name Parsing                                         │
│    Split on "__" with limit 3                                │
│    Output: { toolbox: "dev", server: "filesystem",          │
│             originalTool: "read_file" }                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Tool Delegation (to downstream server)                   │
│    Call original tool: "read_file" on filesystem server     │
└─────────────────────────────────────────────────────────────┘
```

## Validation Rules

### Input Validation (during parsing)

```typescript
function validateToolName(name: string): ValidationResult {
  // Rule 1: Must contain exactly 2 double underscores
  const parts = name.split('__');
  if (parts.length !== 3) {
    return {
      valid: false,
      error: 'Tool name must contain exactly 2 double underscores (format: {toolbox}__{server}__{tool})'
    };
  }

  // Rule 2: All components must be non-empty
  const [toolbox, server, tool] = parts;
  if (!toolbox || !server || !tool) {
    return {
      valid: false,
      error: 'Tool name components (toolbox, server, tool) cannot be empty'
    };
  }

  // Rule 3: Components should contain valid characters (optional strict validation)
  // Note: This is informational - actual validation depends on downstream requirements
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(toolbox) || !validPattern.test(server)) {
    return {
      valid: false,
      error: 'Toolbox and server names should contain only alphanumeric characters, hyphens, and underscores'
    };
  }

  return { valid: true };
}
```

## Edge Cases

### Case 1: Tool Names with Single Underscores

**Input**: Original tool `read_file`
**Generated**: `dev__filesystem__read_file`
**Parsed**: `{ toolbox: "dev", server: "filesystem", originalTool: "read_file" }`
**Status**: ✅ Handled correctly

### Case 2: Tool Names with Multiple Underscores

**Input**: Original tool `read_file_async_v2`
**Generated**: `dev__filesystem__read_file_async_v2`
**Parsed**: `{ toolbox: "dev", server: "filesystem", originalTool: "read_file_async_v2" }`
**Status**: ✅ Handled correctly (everything after 2nd `__` is the tool name)

### Case 3: Tool Names with Double Underscores

**Input**: Original tool `my__special__tool`
**Generated**: `dev__filesystem__my__special__tool`
**Parsed**: `{ toolbox: "dev", server: "filesystem", originalTool: "my__special__tool" }`
**Status**: ✅ Handled correctly (split limited to 3 parts, remainder is tool name)

### Case 4: Invalid Format (Old Style)

**Input**: `dev__filesystem_read_file` (old mixed format)
**Parsed**: Returns `null` (only 2 parts after split on `__`)
**Error**: "Invalid tool name format. Expected format: {toolbox}__{server}__{tool}"
**Status**: ✅ Properly rejected with helpful error

## Migration Considerations

### Client-Side Tool Name Updates

**Before** (old format):
```typescript
const toolName = `${toolbox}__${server}_${tool}`;
// Example: "dev__filesystem_read_file"
```

**After** (new format):
```typescript
const toolName = `${toolbox}__${server}__${tool}`;
// Example: "dev__filesystem__read_file"
```

### Parsing Logic Updates

**Before** (complex mixed parsing):
```typescript
const parts = name.split('__');
const serverAndTool = parts[1];
const firstUnderscoreIndex = serverAndTool.indexOf('_');
const server = serverAndTool.substring(0, firstUnderscoreIndex);
const tool = serverAndTool.substring(firstUnderscoreIndex + 1);
```

**After** (simplified consistent parsing):
```typescript
const [toolbox, server, tool] = name.split('__', 3);
```

## Data Structure Changes Summary

| Structure | Field/Format | Before | After | Impact |
|-----------|-------------|---------|-------|---------|
| Tool Name String | Format | `{toolbox}__{server}_{tool}` | `{toolbox}__{server}__{tool}` | Breaking change |
| ParsedToolName | All fields | Mixed parsing | Simple split | Simplified logic |
| ToolInfo._meta.original_name | Value | Unchanged | Unchanged | No impact |
| Error messages | Format hints | Old format | New format | Updated guidance |

## No Schema Changes Required

This feature does NOT require:
- Database migrations (no persistent storage)
- API contract changes (internal string format only)
- Configuration schema updates (toolbox/server names unchanged)
- Type definition changes (existing types remain compatible)

The change is purely in the **string representation** of tool names, not in the underlying data structures or storage mechanisms.
