# Data Model: Standardize Parameter and Field Naming

**Feature**: 008-naming-consistency
**Date**: 2025-10-28

## Overview

This document defines the data structures affected by the naming standardization. Since this is a refactoring feature, we're not creating new entities but rather updating existing type definitions to use consistent field names.

## Type Definitions

### ToolIdentifier (No Changes Required)

**Purpose**: Structured object for identifying tools across toolboxes and servers.

**Current Definition** (Already Correct):
```typescript
interface ToolIdentifier {
  readonly toolbox: string;  // ✓ Already standardized
  readonly server: string;   // ✓ Already standardized
  readonly tool: string;     // ✓ Already standardized
}
```

**Status**: ✅ This type already uses the standardized names and requires no changes.

---

### ToolInfo (CHANGES REQUIRED)

**Purpose**: Metadata structure describing a tool, extends the MCP SDK's Tool type with workbench-specific context.

**Current Definition** (Inconsistent):
```typescript
interface ToolInfo extends Tool {
  source_server: string;   // ❌ Should be `server`
  toolbox_name: string;    // ❌ Should be `toolbox`
  // Note: Tool.name exists (from SDK), context is the actual tool name
}
```

**New Definition** (Standardized):
```typescript
interface ToolInfo extends Tool {
  server: string;    // ✓ Standardized
  toolbox: string;   // ✓ Standardized
  // Note: Tool.name from SDK provides the `tool` name
}
```

**Field Mapping**:
| Old Name | New Name | Purpose |
|----------|----------|---------|
| `source_server` | `server` | MCP server name that provides this tool |
| `toolbox_name` | `toolbox` | Toolbox name containing this tool |
| `name` (from Tool SDK type) | `tool` (conceptually) | Original tool name from downstream server |

**Validation Rules**:
- All fields MUST be non-empty strings
- `server` must match a server name configured in the toolbox's `mcpServers` object
- `toolbox` must match a configured toolbox name from workbench configuration
- Field values are immutable after creation

**State Transitions**: N/A (these are read-only metadata structures, no state changes)

---

### OpenToolboxResult (CHANGES REQUIRED)

**Purpose**: Return type for the `open_toolbox` meta-tool operation.

**Current Definition** (Inconsistent):
```typescript
interface OpenToolboxResult {
  toolbox: string;              // ✓ Already correct
  description: string;          // ✓ No change needed
  servers_connected: number;    // ✓ No change needed
  tools: ToolInfo[];            // ❌ Contains ToolInfo with old field names
}
```

**New Definition** (Standardized):
```typescript
interface OpenToolboxResult {
  toolbox: string;              // ✓ Standardized
  description: string;          // ✓ No change
  servers_connected: number;    // ✓ No change
  tools: ToolInfo[];            // ✓ Now contains ToolInfo with standardized fields
}
```

**Impact**: The structure itself doesn't change, but the `tools` array elements now use the updated ToolInfo type with standardized field names.

---

### Meta-Tool Parameters (CHANGES REQUIRED)

**`open_toolbox` Parameter Schema**:

**Current** (Inconsistent):
```typescript
{
  toolbox_name: z.string()  // ❌ Should be `toolbox`
}
```

**New** (Standardized):
```typescript
{
  toolbox: z.string()  // ✓ Standardized
}
```

**`use_tool` Parameter Schema**:

**Current** (Uses ToolIdentifier, already correct):
```typescript
{
  tool: ToolIdentifierSchema,  // ✓ Already uses standardized structure
  arguments: z.record(z.any()).optional()
}
```

**Status**: ✅ No changes required - already uses ToolIdentifier with standardized field names.

---

## Data Flow

### Tool Discovery Flow (Updated)

1. **User calls `open_toolbox`**
   - **Input**: `{ toolbox: "dev" }`  (was: `toolbox_name`)
   - Validation: Zod schema validates `toolbox` field

2. **Workbench connects to downstream servers**
   - Internal: Uses `toolbox` string to look up configuration
   - Connects to all servers in `config.toolboxes[toolbox].mcpServers`

3. **Workbench queries tools from each server**
   - Calls `client.listTools()` for each connected server
   - Builds ToolInfo objects with standardized fields:
     ```typescript
     {
       ...sdkTool,
       server: serverName,     // (was: source_server)
       toolbox: toolboxName    // (was: toolbox_name)
     }
     ```

4. **Returns OpenToolboxResult**
   - **Output**: `{ toolbox: "dev", ..., tools: [ToolInfo, ...] }`
   - All ToolInfo objects use `server` and `toolbox` fields

### Tool Invocation Flow (No Changes)

1. **User calls `use_tool`**
   - **Input**: `{ tool: { toolbox: "dev", server: "filesystem", tool: "read_file" }, arguments: {...} }`
   - Already uses standardized ToolIdentifier structure

2. **Workbench delegates to downstream server**
   - Extracts `tool.tool` (the original tool name) from identifier
   - Calls `client.callTool({ name: tool.tool, arguments })`
   - Returns result directly

**No changes required** - this flow already uses standardized naming.

---

## Validation and Constraints

### Type-Level Validation

- TypeScript strict mode ensures all fields are properly typed
- Zod schemas validate runtime inputs to meta-tools
- `readonly` modifiers on ToolIdentifier prevent mutation

### Runtime Validation

**`open_toolbox` validation**:
```typescript
const OpenToolboxSchema = z.object({
  toolbox: z.string().min(1)  // Updated field name
});
```

**Error Cases**:
- `toolbox` is empty string → Zod validation error
- `toolbox` not found in config → Custom error with available toolboxes list
- Server connection fails → Error includes `toolbox` and `server` names for context

---

## Migration from Old Schema

**For Reference Only** (Not required during incubation):

If this were post-1.0.0, clients would need to update:

```typescript
// OLD (v0.11.1 and earlier)
await client.callTool("open_toolbox", { toolbox_name: "dev" });

// NEW (v0.12.0+)
await client.callTool("open_toolbox", { toolbox: "dev" });
```

```typescript
// OLD - Parsing tool metadata
const serverName = toolInfo.source_server;
const toolboxName = toolInfo.toolbox_name;

// NEW - Parsing tool metadata
const serverName = toolInfo.server;
const toolboxName = toolInfo.toolbox;
```

**Incubation Note**: During incubation, no migration guide is required. Users are expected to adapt to breaking changes without explicit support.

---

## Summary

**Types Requiring Changes**: 2
- ✅ ToolInfo - Update field names (`source_server` → `server`, `toolbox_name` → `toolbox`)
- ✅ Meta-tool parameter schema - Update parameter name (`toolbox_name` → `toolbox`)

**Types Already Compliant**: 2
- ✅ ToolIdentifier - Already uses standardized names
- ✅ `use_tool` parameters - Already uses ToolIdentifier

**Total Impact**: Minimal - 2 type definitions, ~10-15 lines of type code, plus usage sites in implementation and documentation.
