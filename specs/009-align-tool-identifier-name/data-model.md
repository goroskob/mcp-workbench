# Data Model: Align Tool Identifier Property with MCP SDK Naming

**Feature**: 009-align-tool-identifier-name
**Date**: 2025-10-28
**Status**: Complete

## Overview

This feature involves renaming a property in the structured tool identifier. There are no persistent data entities, but this document captures the affected type structures and their relationships.

## Type Structures

### Structured Tool Identifier (Modified)

**Current Definition**:
```typescript
{
  toolbox: string;  // Name of the toolbox containing the tool
  server: string;   // Name of the MCP server providing the tool
  tool: string;     // Name of the tool from the downstream server
}
```

**New Definition**:
```typescript
{
  toolbox: string;  // Name of the toolbox containing the tool
  server: string;   // Name of the MCP server providing the tool
  name: string;     // Name of the tool from the downstream server (aligned with MCP SDK)
}
```

**Schema Definition Location**: src/index.ts (ToolIdentifierSchema)

**Zod Schema**:
```typescript
const ToolIdentifierSchema = z.object({
  toolbox: z.string().min(1, "Toolbox name cannot be empty"),
  server: z.string().min(1, "Server name cannot be empty"),
  name: z.string().min(1, "Tool name cannot be empty"),  // Changed from 'tool'
}).strict();
```

**Validation Rules**:
- All three fields are REQUIRED (non-optional)
- All fields MUST be non-empty strings (min length 1)
- No additional properties allowed (strict mode)
- Field names MUST match exactly (case-sensitive)

### Use Tool Input (Modified)

**Definition**:
```typescript
{
  tool: {            // Parameter name unchanged (holds the entire structured identifier)
    toolbox: string;
    server: string;
    name: string;    // Changed from 'tool'
  };
  arguments?: Record<string, any>;  // Optional tool-specific arguments
}
```

**Schema Definition Location**: src/index.ts (UseToolInputSchema)

**Zod Schema**:
```typescript
const UseToolInputSchema = z.object({
  tool: ToolIdentifierSchema.describe("Structured identifier for the tool to invoke"),
  arguments: z.record(z.any())
    .describe("Arguments to pass to the tool")
    .optional()
    .default({}),
}).strict();
```

**Usage Pattern**:
```typescript
// Example invocation
{
  "tool": {
    "toolbox": "dev",
    "server": "filesystem",
    "name": "read_file"  // Changed from 'tool'
  },
  "arguments": {
    "path": "/etc/hosts"
  }
}
```

### ToolInfo (No Changes)

**Definition** (src/types.ts):
```typescript
export interface ToolInfo extends Tool {
  /** Name of the MCP server that provides this tool */
  server: string;
  /** Name of the toolbox this tool belongs to */
  toolbox: string;
}
```

**Note**: ToolInfo extends the MCP SDK's Tool interface which has a `name` property. This interface is NOT changed by this feature - it already uses `name` correctly from the SDK. The mismatch was only in the structured tool identifier used for invocation.

## Relationships

### Tool Identification Flow

```
User Request with Structured Identifier
  { toolbox: "dev", server: "filesystem", name: "read_file" }
    ↓
UseToolInputSchema Validation
  ↓
ToolIdentifierSchema Validation (checks toolbox, server, name fields)
  ↓
Extract Fields
  const { toolbox, server, name } = params.tool;
    ↓
Find Tool in Toolbox
  clientManager.findToolInToolbox(toolbox, server, name)
    ↓
Delegate to Downstream Server
  connection.client.callTool({ name, arguments })
    ↓
Return Response
```

### Naming Alignment

**Before (Inconsistent)**:
- Structured Identifier: `{ toolbox, server, tool }`  ← Used "tool"
- MCP SDK Tool Interface: `{ name, ... }`              ← Uses "name"
- Mismatch caused cognitive overhead

**After (Consistent)**:
- Structured Identifier: `{ toolbox, server, name }`   ← Now uses "name"
- MCP SDK Tool Interface: `{ name, ... }`              ← Uses "name"
- Consistent naming reduces confusion

## State Transitions

*N/A - No stateful entities or workflows*

## Validation Rules Summary

| Field | Type | Required | Min Length | Max Length | Pattern |
|-------|------|----------|------------|------------|---------|
| toolbox | string | Yes | 1 | N/A | Any non-empty |
| server | string | Yes | 1 | N/A | Any non-empty |
| name | string | Yes | 1 | N/A | Any non-empty |

**Error Scenarios**:
- Missing field → Zod validation error: "Required"
- Empty string → Zod validation error: "{Field} name cannot be empty"
- Wrong type → Zod validation error: "Expected string, received {type}"
- Extra fields → Zod validation error: "Unrecognized key(s) in object"

## Breaking Changes Impact

### API Surface Change

**Before**:
```typescript
// Client code using old structure
workbench.use_tool({
  tool: {
    toolbox: "dev",
    server: "filesystem",
    tool: "read_file"  // Old property name
  },
  arguments: { path: "/etc/hosts" }
})
```

**After**:
```typescript
// Client code must update to new structure
workbench.use_tool({
  tool: {
    toolbox: "dev",
    server: "filesystem",
    name: "read_file"  // New property name
  },
  arguments: { path: "/etc/hosts" }
})
```

**Migration Required**: All clients using `use_tool` must update their tool identifier objects to use `name` instead of `tool`.

## Implementation Notes

### Type Safety

TypeScript will catch most migration issues at compile time if clients are also using TypeScript:

```typescript
// This will fail TypeScript compilation after update
const identifier = {
  toolbox: "dev",
  server: "filesystem",
  tool: "read_file"  // ERROR: Object literal may only specify known properties
};
```

### Runtime Validation

Zod schema will catch runtime issues for dynamically constructed identifiers:

```javascript
// This will fail at runtime with clear error
{
  tool: {
    toolbox: "dev",
    server: "filesystem",
    tool: "read_file"  // Zod error: "Unrecognized key(s) in object: 'tool'"
  }
}
```

## References

- MCP SDK Tool interface: Uses `name` property
- Feature specification: [spec.md](./spec.md)
- Research decisions: [research.md](./research.md)
- Type definitions: src/types.ts
- Schema definitions: src/index.ts
