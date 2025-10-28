# Data Model: Structured Tool Names

**Feature**: 007-structured-tool-names
**Date**: 2025-10-28
**Status**: Complete

## Overview

This document defines the TypeScript type system for structured tool naming in MCP Workbench. All types are defined in `src/types.ts` following strict TypeScript type safety principles.

## Core Types

### ToolIdentifier

**Purpose**: Immutable structured representation of a tool's unique identity across toolbox, server, and tool dimensions.

**Definition**:
```typescript
export interface ToolIdentifier {
  /** Toolbox name containing the tool */
  readonly toolbox: string;

  /** MCP server name providing the tool */
  readonly server: string;

  /** Original tool name from the downstream MCP server */
  readonly tool: string;
}
```

**Invariants**:
- All fields MUST be non-empty strings
- All fields are readonly (immutable after creation)
- Uniqueness is guaranteed by the combination of all three fields

**Usage**:
- API parameters (use_tool input)
- Internal routing and lookup
- Error message construction

**Validation**: Enforced at API boundary via Zod schema (see Validation Schemas section)

### ToolInfo

**Purpose**: Extended tool metadata combining MCP SDK Tool type with structured provenance information.

**Definition**:
```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolInfo extends Tool {
  /** Name of the toolbox this tool belongs to */
  toolbox_name: string;

  /** Name of the MCP server that provides this tool */
  source_server: string;

  // Inherited from Tool:
  // - name: string (original tool name from downstream server)
  // - description?: string
  // - inputSchema: object (JSON Schema)
}
```

**Field Semantics**:
- `name`: Original tool name from downstream MCP server (e.g., "read_file")
- `toolbox_name`: Toolbox containing this tool (e.g., "dev")
- `source_server`: MCP server providing this tool (e.g., "filesystem")

**Breaking Change from Previous Version**:
- **Old**: `name` contained concatenated string ("dev__filesystem__read_file")
- **New**: `name` contains original tool name ("read_file"), with separate `toolbox_name` and `source_server` fields

**Usage**:
- Response from open_toolbox meta-tool
- Tool discovery and documentation
- Client-side tool list rendering

### OpenedToolbox

**Purpose**: Runtime state tracking for an opened toolbox with its server connections and tools.

**Updated Definition**:
```typescript
export interface OpenedToolbox {
  /** Configuration for this toolbox */
  config: ToolboxConfig;

  /** Active server connections, keyed by server name */
  connections: Map<string, ServerConnection>;

  /** Cached tools from all servers in this toolbox */
  tools: ToolInfo[];

  // Note: registeredTools map removed - no longer needed without dynamic registration
}
```

**Changes from Previous Version**:
- Removed `registeredTools: Map<string, ToolInfo>` (was keyed by concatenated name)
- `tools` array now uses updated ToolInfo with separate fields
- Lookup by ToolIdentifier uses connections map + tool name matching

### ServerConnection

**Purpose**: Tracks MCP client connection to a downstream server.

**Definition** (no changes):
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ServerConnection {
  /** MCP client instance for this server */
  client: Client;

  /** Transport layer (currently only stdio) */
  transport: StdioClientTransport;

  /** Cached tools from this server's tools/list response */
  tools: Tool[];

  /** Server configuration */
  config: WorkbenchServerConfig;
}
```

**Usage**: Internal connection management in ClientManager

## Validation Schemas

### ToolIdentifierSchema

**Purpose**: Zod schema for validating tool identifiers at API boundaries.

**Definition**:
```typescript
import { z } from 'zod';

export const ToolIdentifierSchema = z.object({
  toolbox: z.string().min(1, "Toolbox name cannot be empty"),
  server: z.string().min(1, "Server name cannot be empty"),
  tool: z.string().min(1, "Tool name cannot be empty")
}).strict();
```

**Validation Rules**:
- All three fields are required
- Each field must be a non-empty string
- No extra fields allowed (strict mode)

**Error Examples**:
```typescript
// Missing field
{ toolbox: "dev", server: "filesystem" }
// => Error: Required at "tool"

// Empty string
{ toolbox: "dev", server: "", tool: "read_file" }
// => Error: Server name cannot be empty

// Extra field
{ toolbox: "dev", server: "fs", tool: "read", extra: "field" }
// => Error: Unrecognized key: "extra"
```

### UseToolInputSchema

**Purpose**: Zod schema for use_tool meta-tool parameters.

**Definition**:
```typescript
export const UseToolInputSchema = z.object({
  tool: ToolIdentifierSchema,
  arguments: z.record(z.unknown()).optional().default({})
});

export type UseToolInput = z.infer<typeof UseToolInputSchema>;
```

**Type Inference**:
```typescript
// Inferred type:
type UseToolInput = {
  tool: {
    toolbox: string;
    server: string;
    tool: string;
  };
  arguments?: Record<string, unknown>;
}
```

**Breaking Change from Previous Version**:
- **Old**: `{ toolbox_name: string, tool_name: string, arguments?: object }`
- **New**: `{ tool: ToolIdentifier, arguments?: object }`

### OpenToolboxInputSchema

**Purpose**: Zod schema for open_toolbox meta-tool parameters.

**Definition** (no changes):
```typescript
export const OpenToolboxInputSchema = z.object({
  toolbox_name: z.string().min(1, "Toolbox name cannot be empty")
});

export type OpenToolboxInput = z.infer<typeof OpenToolboxInputSchema>;
```

## Response Types

### OpenToolboxResult

**Purpose**: Response structure for open_toolbox meta-tool.

**Updated Definition**:
```typescript
export interface OpenToolboxResult {
  /** Name of the opened toolbox */
  toolbox: string;

  /** Description from toolbox configuration */
  description: string;

  /** Number of MCP servers connected in this toolbox */
  servers_connected: number;

  /** Array of available tools with structured metadata */
  tools: ToolInfo[];
}
```

**Breaking Change from Previous Version**:
- `tools` array now contains ToolInfo with separate `toolbox_name`, `source_server`, `name` fields
- Previous version had concatenated tool names in `name` field

**Example Response**:
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
      "description": "Read a file from the filesystem",
      "inputSchema": { "type": "object", "properties": { ... } }
    },
    {
      "name": "get",
      "toolbox_name": "dev",
      "source_server": "memory",
      "description": "Get a value from memory",
      "inputSchema": { ... }
    }
  ]
}
```

## Internal State Management

### ClientManager State

**Purpose**: Track opened toolboxes and their connections.

**State Structure**:
```typescript
class ClientManager {
  // Map of opened toolboxes, keyed by toolbox name
  private openedToolboxes: Map<string, OpenedToolbox>;

  // Configuration loaded from workbench-config.json
  private config: WorkbenchConfig;
}
```

### Tool Lookup Strategy

**Previous Approach** (string-based):
```typescript
// Parse concatenated name
const parsed = this.parseToolName(toolName); // "dev__filesystem__read_file"
if (!parsed) return error;

// Lookup toolbox
const toolbox = this.openedToolboxes.get(parsed.toolbox);
if (!toolbox) return error;

// Lookup tool from registeredTools map
const tool = toolbox.registeredTools.get(toolName);
```

**New Approach** (structured):
```typescript
// Direct access to ToolIdentifier fields
const { toolbox, server, tool } = toolIdentifier;

// Lookup toolbox
const openedToolbox = this.openedToolboxes.get(toolbox);
if (!openedToolbox) return error;

// Lookup server connection
const connection = openedToolbox.connections.get(server);
if (!connection) return error;

// Find tool in connection's tools array
const toolInfo = connection.tools.find(t => t.name === tool);
if (!toolInfo) return error;

// Invoke tool on downstream client
return await connection.client.callTool({ name: tool, arguments });
```

**Benefits**:
- No string parsing required
- Clearer error handling at each level (toolbox → server → tool)
- Direct map lookups (O(1) for toolbox and server)
- Array find for tool name (small arrays, negligible performance impact)

## Migration Impact

### Type System Changes

1. **New Types**:
   - `ToolIdentifier` interface
   - `ToolIdentifierSchema` validation schema

2. **Updated Types**:
   - `ToolInfo` (separate fields instead of concatenated name)
   - `UseToolInput` (structured tool parameter)
   - `OpenToolboxResult` (updated tools array)
   - `OpenedToolbox` (removed registeredTools map)

3. **Removed Methods**:
   - `ClientManager.parseToolName()` (no longer needed)
   - `ClientManager.generateToolName()` (no longer needed)

### Code Locations Requiring Updates

**src/types.ts**:
- Add ToolIdentifier interface
- Update ToolInfo interface
- Add ToolIdentifierSchema
- Update UseToolInputSchema
- Update OpenedToolbox interface

**src/index.ts**:
- Update UseToolInputSchema
- Update use_tool handler to accept ToolIdentifier
- Update error message templates

**src/client-manager.ts**:
- Remove parseToolName and generateToolName methods
- Update getToolsFromConnections to return separate fields
- Update tool lookup logic in delegateToolCall (or equivalent)
- Update error handling to use ToolIdentifier fields

## Validation and Error Handling

### Field Validation

All validation happens at the API boundary via Zod schemas:

```typescript
// In use_tool handler
const result = UseToolInputSchema.safeParse(args);
if (!result.success) {
  // Format Zod errors into user-friendly messages
  const errors = result.error.errors.map(e =>
    `${e.path.join('.')}: ${e.message}`
  ).join('; ');

  return {
    content: [{ type: "text", text: `Invalid parameters: ${errors}` }],
    isError: true
  };
}

// Proceed with validated data
const { tool, arguments: toolArgs } = result.data;
```

### Error Message Templates

```typescript
const ErrorMessages = {
  toolboxNotFound: (toolbox: string) =>
    `Toolbox '${toolbox}' not found`,

  serverNotFound: (server: string, toolbox: string) =>
    `Server '${server}' not found in toolbox '${toolbox}'`,

  toolNotFound: (tool: ToolIdentifier) =>
    `Tool '${tool.tool}' not found in server '${tool.server}' (toolbox '${tool.toolbox}')`,

  invalidToolIdentifier: (field: keyof ToolIdentifier) =>
    `Invalid tool identifier: ${field} cannot be empty`,

  connectionFailed: (server: string, toolbox: string, reason: string) =>
    `Failed to connect to server '${server}' in toolbox '${toolbox}': ${reason}`
};
```

## Type Safety Guarantees

### Readonly Properties

ToolIdentifier uses readonly properties to prevent mutation:

```typescript
const id: ToolIdentifier = { toolbox: "dev", server: "fs", tool: "read" };
id.toolbox = "prod"; // TypeScript error: Cannot assign to 'toolbox' because it is a read-only property
```

### Strict Validation

Zod strict mode prevents unknown properties:

```typescript
const input = {
  tool: { toolbox: "dev", server: "fs", tool: "read" },
  arguments: {},
  extraField: "not allowed" // Will be rejected
};

UseToolInputSchema.parse(input); // Throws ZodError
```

### Type Inference

TypeScript infers types from Zod schemas:

```typescript
const validatedInput = UseToolInputSchema.parse(input);
// Type: { tool: { toolbox: string; server: string; tool: string }; arguments: Record<string, unknown> }

// No casting needed, full type safety
const toolId: ToolIdentifier = validatedInput.tool;
```

## Conclusion

The structured tool naming data model provides:
- ✅ Clear type definitions with readonly enforcement
- ✅ Comprehensive validation via Zod schemas
- ✅ Simplified lookup logic without string parsing
- ✅ Better error messages with component-level context
- ✅ Full TypeScript type safety with strict mode

**Ready to proceed to contracts definition (Phase 1)**.
