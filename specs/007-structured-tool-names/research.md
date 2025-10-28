# Research: Structured Tool Names

**Feature**: 007-structured-tool-names
**Date**: 2025-10-28
**Status**: Complete

## Overview

This document consolidates research findings for transitioning from string-based tool naming (`{toolbox}__{server}__{tool}`) to structured objects (`{ toolbox, server, tool }`).

## Research Task 1: TypeScript Interface Patterns for Tool Identification

### Decision

Use a simple, readonly interface for ToolIdentifier:

```typescript
export interface ToolIdentifier {
  readonly toolbox: string;
  readonly server: string;
  readonly tool: string;
}
```

### Rationale

1. **Readonly Properties**: Prevents accidental mutation of tool identifiers, which should be immutable once created
2. **Simple Structure**: Three required string fields align directly with functional requirements (FR-001)
3. **No Optional Fields**: All three components are always required for unique tool identification
4. **Type Safety**: Explicit interface prevents structural typing mismatches
5. **No Validation Helpers Needed**: Zod schema at API boundary handles validation, internal code can assume valid identifiers

### Alternatives Considered

**Alternative 1: Class with Validation**
```typescript
class ToolIdentifier {
  constructor(
    public readonly toolbox: string,
    public readonly server: string,
    public readonly tool: string
  ) {
    if (!toolbox || !server || !tool) {
      throw new Error("All fields required");
    }
  }
}
```
- **Rejected**: Validation belongs at API boundary (Zod schema), internal code shouldn't throw
- **Rejected**: Class syntax adds complexity without benefits (no methods needed)

**Alternative 2: Type Alias**
```typescript
type ToolIdentifier = {
  toolbox: string;
  server: string;
  tool: string;
};
```
- **Rejected**: Interfaces provide better error messages and can be extended if needed
- **Rejected**: Missing readonly enforcement

**Alternative 3: Branded Type**
```typescript
type ToolIdentifier = { toolbox: string; server: string; tool: string } & { __brand: "ToolIdentifier" };
```
- **Rejected**: Over-engineering for this use case, no need for nominal typing

### MCP SDK Compatibility

The ToolIdentifier interface is independent of MCP SDK types and can coexist with the Tool type from `@modelcontextprotocol/sdk`. The Tool type is used for tool schemas, while ToolIdentifier is used for routing and identification.

## Research Task 2: Zod Schema Composition for Nested Objects

### Decision

Define a composable Zod schema for tool identifiers:

```typescript
import { z } from 'zod';

// Reusable schema for tool identifier
const ToolIdentifierSchema = z.object({
  toolbox: z.string().min(1, "Toolbox name cannot be empty"),
  server: z.string().min(1, "Server name cannot be empty"),
  tool: z.string().min(1, "Tool name cannot be empty")
}).strict(); // Reject extra fields

// use_tool input schema
const UseToolInputSchema = z.object({
  tool: ToolIdentifierSchema,
  arguments: z.record(z.unknown()).optional().default({})
});

type UseToolInput = z.infer<typeof UseToolInputSchema>;
```

### Rationale

1. **Composable Schema**: ToolIdentifierSchema can be reused in multiple contexts
2. **Explicit Validation**: `.min(1)` ensures non-empty strings (FR-004)
3. **Strict Mode**: `.strict()` rejects extra fields, preventing API misuse
4. **Clear Error Messages**: Custom messages for each field provide debugging context
5. **Optional Arguments**: Maintains backward compatibility for tools with no parameters

### Zod Error Handling

Zod validation errors provide structured information:

```typescript
try {
  UseToolInputSchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    // error.errors contains array of validation issues
    // Example: [{ path: ['tool', 'toolbox'], message: 'Toolbox name cannot be empty' }]
  }
}
```

This enables clear error messages like: "Invalid tool identifier: toolbox name cannot be empty"

### Alternatives Considered

**Alternative 1: Inline Schema**
```typescript
const UseToolInputSchema = z.object({
  tool: z.object({
    toolbox: z.string().min(1),
    server: z.string().min(1),
    tool: z.string().min(1)
  }),
  arguments: z.record(z.unknown()).optional()
});
```
- **Rejected**: Not reusable if other meta-tools need tool identifiers
- **Rejected**: Missing `.strict()` on nested object

**Alternative 2: String Validation with Pattern**
```typescript
const ToolNameSchema = z.string().regex(/^[^_]+__[^_]+__[^_]+$/);
```
- **Rejected**: Defeats the purpose of structured format
- **Rejected**: Would require parsing after validation

## Research Task 3: MCP SDK Tool Type Extensions

### Decision

Extend MCP SDK Tool type with separate metadata fields, avoid concatenated names:

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolInfo extends Tool {
  /** Name of the toolbox this tool belongs to */
  toolbox_name: string;
  /** Name of the MCP server that provides this tool */
  source_server: string;
  // Note: Tool.name contains the original tool name (not concatenated)
}
```

### Rationale

1. **Extends SDK Type**: Maintains compatibility with MCP SDK utilities and type guards
2. **Separate Metadata**: `toolbox_name` and `source_server` are distinct from `Tool.name`
3. **Original Tool Name**: `Tool.name` field contains the original downstream tool name (e.g., "read_file")
4. **No Concatenation**: Eliminates string-based tool identification in responses
5. **Backward Compatible Extension**: Only adds fields, doesn't modify SDK-defined properties

### Tool.name Semantics Change

**Current behavior**: `Tool.name` contains concatenated string (`dev__filesystem__read_file`)
**New behavior**: `Tool.name` contains original tool name (`read_file`)

This is a breaking change but aligns with the feature goals - callers construct ToolIdentifier from separate fields rather than parsing concatenated strings.

### Alternatives Considered

**Alternative 1: Replace Tool.name with ToolIdentifier**
```typescript
export interface ToolInfo extends Omit<Tool, 'name'> {
  identifier: ToolIdentifier;
}
```
- **Rejected**: Breaks MCP SDK type compatibility
- **Rejected**: Tool.name is useful for displaying original tool name

**Alternative 2: Keep Concatenated Name, Add Separate Fields**
```typescript
export interface ToolInfo extends Tool {
  toolbox_name: string;
  source_server: string;
  original_name: string;
  // Tool.name = "dev__filesystem__read_file"
}
```
- **Rejected**: Redundant data, violates SC-005 (eliminate string-based parsing)
- **Rejected**: Confusing - which name to use?

## Research Task 4: Error Handling Patterns for Structured Data

### Decision

Use template-based error messages with structured field references:

```typescript
// Error message templates
const ErrorTemplates = {
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

### Rationale

1. **Consistent Format**: All errors follow `Component 'name' context` pattern
2. **Hierarchical Context**: Errors include toolbox → server → tool hierarchy as appropriate
3. **Type-Safe**: TypeScript ensures template functions receive correct parameters
4. **Debuggable**: Clear identification of which component failed
5. **User-Friendly**: Natural language with clear component boundaries

### Example Error Messages

```text
Toolbox 'production' not found
Server 'database' not found in toolbox 'dev'
Tool 'delete_all' not found in server 'filesystem' (toolbox 'dev')
Invalid tool identifier: toolbox cannot be empty
Failed to connect to server 'api' in toolbox 'staging': connection timeout
```

### Integration with MCP Error Response

MCP SDK errors use `isError: true` flag with content array:

```typescript
return {
  content: [{
    type: "text" as const,
    text: ErrorTemplates.toolNotFound(toolIdentifier)
  }],
  isError: true
};
```

### Alternatives Considered

**Alternative 1: JSON Error Objects**
```typescript
{
  error: {
    type: "TOOL_NOT_FOUND",
    toolbox: "dev",
    server: "filesystem",
    tool: "delete_all"
  }
}
```
- **Rejected**: MCP SDK expects text content in error responses
- **Rejected**: Less human-readable, requires additional parsing

**Alternative 2: Error Codes**
```typescript
"[ERR_TOOLBOX_NOT_FOUND] Toolbox 'dev' not found"
```
- **Rejected**: Error codes add complexity without clear benefit
- **Rejected**: Component references are already machine-parsable

## Implementation Recommendations

### Phase 1 Priority Order

1. **Update src/types.ts**
   - Define ToolIdentifier interface
   - Update ToolInfo to use separate fields
   - Keep existing types for comparison during refactor

2. **Update src/index.ts schemas**
   - Replace UseToolInputSchema with structured version
   - Update OpenToolboxResult type expectations
   - Add error message templates

3. **Refactor src/client-manager.ts**
   - Remove parseToolName and generateToolName methods
   - Update internal state to use ToolIdentifier
   - Modify getToolsFromConnections to return separate fields

4. **Update initialization instructions**
   - Show example with structured format
   - Document breaking change

### Migration Notes

**Breaking Changes Summary**:
1. `use_tool` parameter: `tool_name: string` → `tool: { toolbox, server, tool }`
2. `open_toolbox` response: concatenated names → separate `toolbox_name`, `source_server`, `name` fields
3. Internal APIs: all tool references use ToolIdentifier instead of strings

**Version Bump**: 0.10.0 → 0.11.0

**Documentation Updates Required**:
- README.md: Update all usage examples
- CLAUDE.md: Update architecture section on tool naming
- Constitution.md: Update Principle II (v1.7.0)

## Performance Considerations

### String Parsing Elimination

**Current approach**:
```typescript
const parts = registeredName.split('__', 3); // O(n) string operation
if (parts.length !== 3) return null;
const [toolbox, server, originalTool] = parts;
```

**New approach**:
```typescript
const { toolbox, server, tool } = toolIdentifier; // O(1) property access
```

**Performance impact**: Negligible - tool routing is not a hot path, but structured approach is inherently faster

### Memory Overhead

**Current**: Single string per tool ("dev__filesystem__read_file")
**New**: Three string fields + object overhead

**Impact**: Minimal - typical toolbox has <100 tools, memory difference is <10KB

### Validation Performance

**Current**: Regex pattern matching or manual split validation
**New**: Zod schema with three string length checks

**Impact**: Zod validation is well-optimized, no measurable performance difference

## Open Questions Resolution

### Q1: Should initialization instructions include a structured format example?

**Answer**: Yes, include example in instructions field:

```text
Use `open_toolbox` to connect to a toolbox, then `use_tool` to invoke tools.

Example tool invocation:
{
  "tool": {
    "toolbox": "dev",
    "server": "filesystem",
    "tool": "read_file"
  },
  "arguments": { "path": "/path/to/file" }
}
```

**Rationale**: Examples in initialization provide immediate guidance, reduce friction for new users

### Q2: Should ToolIdentifier interface be exported for MCP client library use?

**Answer**: Yes, export from src/types.ts

**Rationale**: MCP clients may want to construct tool identifiers programmatically, type definitions improve DX

### Q3: Any performance implications of nested object validation vs. string parsing?

**Answer**: Negligible - see Performance Considerations section above

**Rationale**: Validation and routing are not hot paths, structured approach is actually faster

## Conclusion

All research questions have been resolved with clear decisions and rationale. The structured tool naming approach is technically sound, aligns with project principles, and provides measurable benefits over string-based naming.

**Ready to proceed to Phase 1 (Design)**.
