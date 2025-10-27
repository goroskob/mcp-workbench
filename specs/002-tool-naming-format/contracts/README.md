# API Contracts: Tool Naming Format Update

**Feature**: Tool Naming Format Update
**Branch**: `002-tool-naming-format`
**Date**: 2025-10-27

## Overview

This document defines the internal API contracts affected by the tool naming format change. Since MCP Workbench is an MCP server (not a REST or GraphQL API), the "contracts" are the internal TypeScript interfaces and function signatures.

## Core Function Contracts

### `ClientManager.generateToolName()`

**Purpose**: Generate a fully qualified tool name from its components.

**Signature**:
```typescript
private generateToolName(
  toolboxName: string,
  serverName: string,
  originalToolName: string
): string
```

**Contract**:
- **Input Constraints**:
  - `toolboxName`: Non-empty string, alphanumeric with hyphens/underscores
  - `serverName`: Non-empty string, alphanumeric with hyphens/underscores
  - `originalToolName`: Non-empty string, any valid tool name (may contain underscores)
- **Output Format**: `{toolboxName}__{serverName}__{originalToolName}`
- **Guarantees**: Always returns a string in the correct format when inputs are valid

**Examples**:
```typescript
generateToolName("dev", "filesystem", "read_file")
// Returns: "dev__filesystem__read_file"

generateToolName("prod", "memory", "store_value_async")
// Returns: "prod__memory__store_value_async"

generateToolName("test", "server", "my__special__tool")
// Returns: "test__server__my__special__tool"
```

**Breaking Change**:
- **Before**: `{toolboxName}__{serverName}_{originalToolName}` (mixed separators)
- **After**: `{toolboxName}__{serverName}__{originalToolName}` (consistent separators)

### `ClientManager.parseToolName()`

**Purpose**: Parse a fully qualified tool name into its components.

**Signature**:
```typescript
private parseToolName(registeredName: string): {
  toolbox: string;
  server: string;
  originalTool: string;
} | null
```

**Contract**:
- **Input Constraints**:
  - `registeredName`: String in format `{toolbox}__{server}__{tool}`
- **Output**:
  - **Success**: Object with `toolbox`, `server`, `originalTool` properties
  - **Failure**: `null` (invalid format)
- **Validation Rules**:
  1. Must contain exactly 2 double underscores
  2. Must split into exactly 3 non-empty parts
  3. Any deviation returns `null`

**Examples**:
```typescript
parseToolName("dev__filesystem__read_file")
// Returns: { toolbox: "dev", server: "filesystem", originalTool: "read_file" }

parseToolName("prod__memory__store_value_async")
// Returns: { toolbox: "prod", server: "memory", originalTool: "store_value_async" }

parseToolName("dev__filesystem_read_file")  // Old format
// Returns: null (invalid format)

parseToolName("invalid")
// Returns: null (missing components)
```

**Breaking Change**:
- **Before**: Complex parsing with mixed separators, special handling for `_` vs `__`
- **After**: Simple `split('__', 3)` with validation

## Internal Type Contracts

### `ParsedToolName` Interface

**Definition**:
```typescript
interface ParsedToolName {
  toolbox: string;      // Toolbox identifier
  server: string;       // Server identifier
  originalTool: string; // Original tool name from downstream server
}
```

**Guarantees**:
- All fields are non-empty strings
- `originalTool` preserves the exact original tool name (including underscores)
- Used as return type from `parseToolName()`

### `ToolInfo` Interface Extension

**Definition** (from `src/types.ts`):
```typescript
interface ToolInfo extends Tool {
  name: string;              // Prefixed name: {toolbox}__{server}__{tool}
  source_server: string;     // Server name
  toolbox_name: string;      // Toolbox name
  _meta?: {
    source_server: string;
    toolbox_name: string;
    original_name: string;   // Original tool name (unprefixed)
  };
}
```

**Changes**:
- `name` field: Updated to new format
- All other fields: Unchanged

## Tool Registration Contract (Dynamic Mode)

### `McpServer.registerTool()`

**Usage Pattern**:
```typescript
mcpServer.registerTool(
  prefixedName,                    // Format: {toolbox}__{server}__{tool}
  {
    title: string,
    description: string,           // Prefixed with [toolbox/server]
    inputSchema: object,
    annotations?: object,
    _meta?: {
      source_server: string,
      toolbox_name: string,
      original_name: string
    }
  },
  handler: async (args: any) => CallToolResult
)
```

**Handler Contract**:
- **Input**: `args` object (tool-specific parameters)
- **Responsibilities**:
  1. Parse registered tool name using `parseToolName()`
  2. Look up toolbox and server connection
  3. Delegate to downstream server using original tool name
  4. Return result or error
- **Output**: `CallToolResult` with content and optional `isError` flag

**Error Handling**:
```typescript
// Invalid tool name format
return {
  content: [{
    type: "text" as const,
    text: `Error: Invalid tool name format '${prefixedName}'. Expected format: {toolbox}__{server}__{tool}`
  }],
  isError: true
};

// Toolbox not found
return {
  content: [{
    type: "text" as const,
    text: `Error: Toolbox '${toolbox}' not found`
  }],
  isError: true
};

// Server not found
return {
  content: [{
    type: "text" as const,
    text: `Error: Server '${server}' not found in toolbox '${toolbox}'`
  }],
  isError: true
};

// Delegation error
return {
  content: [{
    type: "text" as const,
    text: `[${toolbox}/${server}/${originalTool}] Error: ${errorMessage}`
  }],
  isError: true
};
```

## Tool Invocation Contract (Proxy Mode)

### `workbench_use_tool` Meta-Tool

**Input Schema** (unchanged):
```typescript
{
  toolbox_name: string,     // Toolbox identifier
  tool_name: string,        // Prefixed tool name: {toolbox}__{server}__{tool}
  arguments?: object        // Tool-specific arguments
}
```

**Process**:
1. Validate `tool_name` format using `parseToolName()`
2. Look up toolbox and server connection
3. Delegate to downstream server using original tool name
4. Return result or error

**Output**: `CallToolResult` from downstream server

## Validation Contracts

### Tool Name Validation

**Function** (conceptual - implemented inline):
```typescript
function isValidToolName(name: string): boolean {
  const parts = name.split('__');
  return parts.length === 3 &&
         parts[0].length > 0 &&
         parts[1].length > 0 &&
         parts[2].length > 0;
}
```

**Error Message Contract**:
```typescript
function getInvalidFormatError(name: string): string {
  return `Invalid tool name format '${name}'. Expected format: {toolbox}__{server}__{tool} (note: double underscores between all components)`;
}
```

## Backward Compatibility

### Breaking Changes

**Tool Name Format**:
- **Old**: `dev__filesystem_read_file`
- **New**: `dev__filesystem__read_file`
- **Impact**: All clients must update tool invocations

**No Compatibility Layer**:
- No aliasing or dual support (per atomic breaking change decision)
- Old format will be rejected with clear error message
- Migration guide provided in documentation

### Compatibility Matrix

| Component | v0.4.0 (old) | v1.0.0 (new) | Compatible? |
|-----------|--------------|--------------|-------------|
| Tool name format | `{toolbox}__{server}_{tool}` | `{toolbox}__{server}__{tool}` | ❌ No |
| ParsedToolName interface | Complex | Simple | N/A (internal) |
| ToolInfo structure | Same | Same | ✅ Yes |
| Meta-tool signatures | Same | Same | ✅ Yes |
| Configuration schema | Same | Same | ✅ Yes |

## Contract Testing Guidelines

### Unit Test Scenarios

```typescript
describe('generateToolName', () => {
  it('generates correct format with single underscore in tool name', () => {
    expect(generateToolName('dev', 'filesystem', 'read_file'))
      .toBe('dev__filesystem__read_file');
  });

  it('generates correct format with multiple underscores in tool name', () => {
    expect(generateToolName('dev', 'filesystem', 'read_file_async_v2'))
      .toBe('dev__filesystem__read_file_async_v2');
  });

  it('generates correct format with double underscores in tool name', () => {
    expect(generateToolName('dev', 'server', 'my__special__tool'))
      .toBe('dev__server__my__special__tool');
  });
});

describe('parseToolName', () => {
  it('parses valid tool name correctly', () => {
    expect(parseToolName('dev__filesystem__read_file')).toEqual({
      toolbox: 'dev',
      server: 'filesystem',
      originalTool: 'read_file'
    });
  });

  it('returns null for old format', () => {
    expect(parseToolName('dev__filesystem_read_file')).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseToolName('invalid')).toBeNull();
    expect(parseToolName('dev__only_two_parts')).toBeNull();
  });

  it('handles tool names with double underscores', () => {
    expect(parseToolName('dev__server__tool__with__extras')).toEqual({
      toolbox: 'dev',
      server: 'server',
      originalTool: 'tool__with__extras'
    });
  });
});
```

### Integration Test Scenarios

1. **Dynamic Mode Tool Registration**: Verify tools registered with new format can be called
2. **Proxy Mode Tool Listing**: Verify returned tool names use new format
3. **Error Handling**: Verify old format is rejected with helpful error
4. **Cross-Mode Consistency**: Verify both modes produce identical naming

## Summary

This feature changes the **string representation** of tool names while maintaining:
- ✅ Meta-tool signatures (unchanged)
- ✅ Configuration schema (unchanged)
- ✅ ToolInfo structure (field names unchanged, only `name` value changes)
- ✅ MCP protocol compatibility (unchanged)

The contracts are **internal TypeScript interfaces** rather than external APIs, so the breaking change is contained to the tool naming convention itself.
