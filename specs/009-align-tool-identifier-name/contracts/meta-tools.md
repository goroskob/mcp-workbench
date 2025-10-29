# Meta-Tool Contracts: Align Tool Identifier Property with MCP SDK Naming

**Feature**: 009-align-tool-identifier-name
**Date**: 2025-10-28
**Status**: Complete

## Overview

This document defines the updated contract for the `use_tool` meta-tool after renaming the `tool` property to `name` in the structured tool identifier.

## Meta-Tool: use_tool

### Purpose

Execute a tool from an opened toolbox using structured tool identifiers that align with MCP SDK naming conventions.

### Input Schema

```typescript
{
  tool: {
    toolbox: string;  // Name of the opened toolbox (non-empty)
    server: string;   // Name of the MCP server providing the tool (non-empty)
    name: string;     // Name of the tool from the downstream server (non-empty) [CHANGED from 'tool']
  };
  arguments?: Record<string, any>;  // Optional tool-specific arguments (defaults to {})
}
```

### Examples

**Basic invocation**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "filesystem",
    "name": "read_file"
  },
  "arguments": {
    "path": "/etc/hosts"
  }
}
```

**Invocation without arguments**:
```json
{
  "tool": {
    "toolbox": "prod",
    "server": "memory",
    "name": "list_keys"
  }
}
```

**Multi-toolbox scenario**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "database",
    "name": "query"
  },
  "arguments": {
    "sql": "SELECT * FROM users LIMIT 10"
  }
}
```

### Response Format

**Success**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "[Tool-specific response content]"
    }
  ]
}
```

**Error**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error executing tool '{name}' in server '{server}' (toolbox '{toolbox}'): {error message}"
    }
  ],
  "isError": true
}
```

### Error Scenarios

| Scenario | Error Message | isError |
|----------|---------------|---------|
| Invalid tool identifier structure | "Invalid tool invocation parameters: {validation errors}" | true |
| Empty toolbox field | "toolbox: Toolbox name cannot be empty" | true |
| Empty server field | "server: Server name cannot be empty" | true |
| Empty name field | "name: Tool name cannot be empty" | true |
| Toolbox not open | "Error executing tool: Toolbox '{toolbox}' is not open" | true |
| Server not found in toolbox | "Error executing tool: Server '{server}' not found in toolbox '{toolbox}'" | true |
| Tool not found in server | "Error executing tool: Tool '{name}' not found in server '{server}'" | true |
| Downstream tool execution error | "Error executing tool '{name}' in server '{server}' (toolbox '{toolbox}'): {downstream error}" | true |

### Validation Rules

**Structured Tool Identifier**:
- `toolbox` MUST be a non-empty string
- `server` MUST be a non-empty string
- `name` MUST be a non-empty string [CHANGED from 'tool']
- No additional properties are allowed (strict validation)
- All three fields are REQUIRED

**Arguments**:
- OPTIONAL field (defaults to empty object `{}` if not provided)
- MUST be an object/record if provided
- Keys are tool-specific (no validation by workbench)
- Values can be any JSON-serializable type

### Behavior

1. **Validation**: Validate tool identifier structure using Zod schema
2. **Extraction**: Extract `toolbox`, `server`, and `name` from structured identifier [CHANGED]
3. **Lookup**: Find the tool in the opened toolbox using structured lookup
4. **Delegation**: Call the downstream MCP server with original tool name and arguments
5. **Response**: Return the downstream response directly (or wrap errors with context)

### Pre-conditions

- The specified toolbox MUST be open (via prior `open_toolbox` call)
- The specified server MUST exist in the toolbox configuration
- The specified tool MUST be available from the server

### Post-conditions

- Tool invocation is delegated to the downstream MCP server
- Original tool name (from `name` field) is used in delegation
- Downstream response is returned to the caller
- Errors are wrapped with toolbox/server/tool context

## Breaking Changes from Previous Version

### Property Rename

**Before (v0.12.0 and earlier)**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "filesystem",
    "tool": "read_file"
  }
}
```

**After (v0.13.0+)**:
```json
{
  "tool": {
    "toolbox": "dev",
    "server": "filesystem",
    "name": "read_file"
  }
}
```

### Migration Guide

Clients must update all `use_tool` invocations to rename the property:

```javascript
// Before
const result = await client.callTool({
  name: "use_tool",
  arguments: {
    tool: {
      toolbox: "dev",
      server: "filesystem",
      tool: "read_file"  // Old property name
    },
    arguments: { path: "/etc/hosts" }
  }
});

// After
const result = await client.callTool({
  name: "use_tool",
  arguments: {
    tool: {
      toolbox: "dev",
      server: "filesystem",
      name: "read_file"  // New property name
    },
    arguments: { path: "/etc/hosts" }
  }
});
```

### Rationale for Breaking Change

- Aligns with MCP SDK's Tool interface which uses `name`
- Reduces cognitive overhead for MCP-familiar developers
- Makes property semantics clearer (name of the tool vs ambiguous "tool" term)
- Project is in incubation (pre-1.0.0) where breaking changes are permitted

### Error Message Changes

Error messages now reference `name` instead of `tool`:

**Before**:
```
Error executing tool 'read_file' in server 'filesystem' (toolbox 'dev'): ...
```

**After**:
```
Error executing tool 'read_file' in server 'filesystem' (toolbox 'dev'): ...
```

*(Message format unchanged, but internal code references `name` property)*

## Meta-Tool: open_toolbox (No Changes)

The `open_toolbox` meta-tool is NOT affected by this change. It continues to return tool metadata with the `name` field from the MCP SDK's Tool interface, which was already correct.

## Compatibility Notes

### TypeScript Clients

TypeScript clients will get compile-time errors if they don't update:

```typescript
// This will fail type checking after upgrade
const identifier: ToolIdentifier = {
  toolbox: "dev",
  server: "filesystem",
  tool: "read_file"  // ERROR: 'tool' does not exist in type 'ToolIdentifier'
};
```

### JavaScript Clients

JavaScript clients will get runtime Zod validation errors:

```javascript
// This will fail at runtime with clear error message
{
  tool: {
    toolbox: "dev",
    server: "filesystem",
    tool: "read_file"  // Zod error: "Unrecognized key(s) in object: 'tool'"
  }
}
```

### Testing Migration

Update test fixtures to use `name` instead of `tool`:

```javascript
// Before
const testIdentifier = {
  toolbox: "test",
  server: "mock",
  tool: "test_tool"
};

// After
const testIdentifier = {
  toolbox: "test",
  server: "mock",
  name: "test_tool"
};
```

## References

- Feature specification: [spec.md](../spec.md)
- Data model: [data-model.md](../data-model.md)
- Research decisions: [research.md](../research.md)
- MCP SDK Tool interface documentation
- Constitution Principle II: Tool Naming and Conflict Resolution
